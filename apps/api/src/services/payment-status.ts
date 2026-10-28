import type { BookingView } from "@rktd/domain";
import type Stripe from "stripe";
import { pool, withTransaction } from "../db.js";
import { findById, findForViewer, toView, type BookingRow } from "./booking-records.js";
import { sendConfirmationEmail } from "./email.js";
import { bookingPageUrl, stripe } from "./payments.js";
import { loadStockLeft, lockStock } from "./stock.js";
import { accessTokenFor } from "./tokens.js";

export async function sendConfirmationOnce(booking: BookingRow): Promise<void> {
  const { rowCount } = await pool.query(
    "update bookings set email_status = 'SENDING' where id = $1 and email_status = 'NOT_SENT'",
    [booking.id],
  );
  if (rowCount === 0) return;
  const sent = await sendConfirmationEmail(toView(booking), bookingPageUrl(booking.reference, accessTokenFor(booking.reference)));
  await pool.query("update bookings set email_status = $2 where id = $1", [booking.id, sent ? "SENT" : "FAILED"]);
}

function paymentIntentIdOf(session: Stripe.Checkout.Session): string | null {
  if (!session.payment_intent) return null;
  return typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent.id;
}

// Paid after its hold ran out: keep it if the stock is still free, otherwise refund it.
async function confirmLatePayment(booking: BookingRow, paymentIntentId: string | null): Promise<BookingRow | null> {
  const confirmed = await withTransaction(async (db) => {
    const { rows: needs } = await db.query<{ stock_key: string; units: number }>(
      "select stock_key, sum(quantity)::int as units from booking_items where booking_id = $1 group by stock_key",
      [booking.id],
    );
    await lockStock(db, needs.map((need) => need.stock_key));
    const stockLeft = await loadStockLeft(db);
    if (needs.some((need) => (stockLeft[need.stock_key] ?? 0) < need.units)) return null;

    const { rows } = await db.query<BookingRow>(
      `update bookings set status = 'CONFIRMED', confirmed_at = now(), stripe_payment_intent_id = $2, updated_at = now()
       where id = $1 and status <> 'CONFIRMED' returning *`,
      [booking.id, paymentIntentId],
    );
    return rows[0] ?? null;
  });
  if (confirmed) return confirmed;

  console.warn(`Refunding ${booking.reference}: paid after its hold ended and the stock has gone`);
  if (paymentIntentId) {
    await stripe.refunds.create({ payment_intent: paymentIntentId }, { idempotencyKey: `refund-${booking.id}` });
  }
  await pool.query("update bookings set status = 'REFUNDED', stripe_payment_intent_id = $2, updated_at = now() where id = $1", [
    booking.id,
    paymentIntentId,
  ]);
  return null;
}

async function confirmPayment(bookingId: string, session: Stripe.Checkout.Session): Promise<void> {
  const booking = await findById(bookingId);
  if (!booking || booking.status === "CONFIRMED" || booking.status === "REFUNDED") return;

  if (session.amount_total !== booking.total_cents || session.currency !== "usd") {
    console.error(`Stripe charged ${session.amount_total} ${session.currency} for ${booking.reference}, expected ${booking.total_cents} usd`);
    return;
  }

  const paymentIntentId = paymentIntentIdOf(session);
  const { rows } = await pool.query<BookingRow>(
    `update bookings set status = 'CONFIRMED', confirmed_at = now(), stripe_payment_intent_id = $2, updated_at = now()
     where id = $1 and status = 'PENDING_PAYMENT' and hold_expires_at > now() returning *`,
    [booking.id, paymentIntentId],
  );
  const confirmed = rows[0] ?? (await confirmLatePayment(booking, paymentIntentId));
  if (confirmed) await sendConfirmationOnce(confirmed);
}

async function markExpired(bookingId: string): Promise<void> {
  await pool.query("update bookings set status = 'EXPIRED', updated_at = now() where id = $1 and status = 'PENDING_PAYMENT'", [
    bookingId,
  ]);
}

export async function applyCheckoutSession(session: Stripe.Checkout.Session): Promise<void> {
  const bookingId = session.client_reference_id;
  if (!bookingId) return;
  if (session.payment_status === "paid") await confirmPayment(bookingId, session);
  else if (session.status === "expired") await markExpired(bookingId);
}

// Checks Stripe directly, so the booking page is right even if a webhook is late or missing.
export async function syncWithStripe(booking: BookingRow): Promise<BookingRow> {
  if (booking.status !== "PENDING_PAYMENT" || !booking.stripe_session_id) return booking;
  await applyCheckoutSession(await stripe.checkout.sessions.retrieve(booking.stripe_session_id));
  return (await findById(booking.id)) ?? booking;
}

export async function getBookingView(reference: string, token: string): Promise<BookingView> {
  const booking = await findForViewer(reference, token);
  return toView(await syncWithStripe(booking));
}

export async function cancelBooking(reference: string, token: string): Promise<BookingView> {
  const booking = await findForViewer(reference, token);
  if (booking.status !== "PENDING_PAYMENT") return toView(booking);

  if (booking.stripe_session_id) {
    try {
      await stripe.checkout.sessions.expire(booking.stripe_session_id);
    } catch {
      // Already paid or already expired: the sync below finds out which.
    }
    const synced = await syncWithStripe(booking);
    if (synced.status === "CONFIRMED") return toView(synced);
  }

  await pool.query("update bookings set status = 'CANCELLED', updated_at = now() where id = $1 and status in ('PENDING_PAYMENT', 'EXPIRED')", [
    booking.id,
  ]);
  return toView((await findById(booking.id)) ?? booking);
}
