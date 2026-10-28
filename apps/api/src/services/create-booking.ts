import { createHash, randomInt } from "node:crypto";
import {
  formatCents,
  quoteFinalBooking,
  stockKeyFor,
  type BookingRequest,
  type CreateBookingResponse,
  type QuoteResult,
} from "@rktd/domain";
import type pg from "pg";
import { isUniqueViolation, pool, withTransaction } from "../db.js";
import { festival } from "../festival.js";
import { ApiError } from "../http/errors.js";
import { findByIdempotencyKey, statusOf, type BookingRow } from "./booking-records.js";
import { createCheckoutSession } from "./payments.js";
import { sendConfirmationOnce } from "./payment-status.js";
import { loadPromoCheck, lockPromo } from "./promos.js";
import { toQuoteResponse } from "./quotes.js";
import { loadStockLeft, lockStock } from "./stock.js";
import { accessTokenFor } from "./tokens.js";

const REFERENCE_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function newReference(): string {
  const block = () => Array.from({ length: 4 }, () => REFERENCE_LETTERS[randomInt(REFERENCE_LETTERS.length)]).join("");
  return `SU-${block()}-${block()}`;
}

function hashOf(request: BookingRequest): string {
  return createHash("sha256").update(JSON.stringify(request)).digest("hex");
}

// A few minutes past the Stripe session, so a payment made in its last second
// still finds its stock held when the webhook arrives.
function holdExpiry(now: Date): Date {
  return new Date(now.getTime() + (festival.holdMinutes + 5) * 60_000);
}

function rejectIfNotBookable(request: BookingRequest, result: QuoteResult): void {
  const errors = result.issues.filter((issue) => issue.severity === "error");
  const stockErrors = errors.filter((issue) => issue.code === "SOLD_OUT" || issue.code === "NOT_ENOUGH_STOCK");
  if (stockErrors.length > 0) {
    throw new ApiError(409, "OUT_OF_STOCK", stockErrors.map((issue) => issue.message).join(" "), { issues: stockErrors });
  }
  if (errors.length > 0) {
    throw new ApiError(422, "BOOKING_NOT_ALLOWED", "Some details need fixing before you can pay.", { issues: errors });
  }
  if (result.quote.totalCents !== request.expectedTotalCents) {
    throw new ApiError(
      409,
      "PRICE_CHANGED",
      `Your total is now ${formatCents(result.quote.totalCents)}. Please check it before paying.`,
      { quote: toQuoteResponse(result) },
    );
  }
}

async function holdStockAndInsert(
  db: pg.PoolClient,
  request: BookingRequest,
  idempotencyKey: string,
  requestHash: string,
): Promise<BookingRow> {
  const now = new Date();
  const neededKeys = quoteFinalBooking(request, { festival, now, promo: null, stockLeft: {} }).items.map(stockKeyFor);
  await lockStock(db, [...new Set(neededKeys)]);
  await lockPromo(db, request.promoCode);

  // Re-read stock and promo usage now that nobody else can change them.
  const stockLeft = await loadStockLeft(db);
  const promo = await loadPromoCheck(request.promoCode, now, db);
  const result = quoteFinalBooking(request, { festival, now, promo, stockLeft });
  rejectIfNotBookable(request, result);

  const isFree = result.quote.totalCents === 0;
  const appliedPromo = result.quote.promo?.status === "APPLIED" ? result.quote.promo.code : null;
  const { rows } = await db.query<BookingRow>(
    `insert into bookings (reference, idempotency_key, request_hash, status, request, quote, total_cents,
                           promo_code, booker_email, hold_expires_at, confirmed_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     returning *`,
    [
      newReference(),
      idempotencyKey,
      requestHash,
      isFree ? "CONFIRMED" : "PENDING_PAYMENT",
      request,
      result.quote,
      result.quote.totalCents,
      appliedPromo,
      request.booker.email,
      isFree ? null : holdExpiry(now),
      isFree ? now : null,
    ],
  );
  const booking = rows[0];

  const items = result.items.map((item) => ({
    product_code: item.product.code,
    stock_key: stockKeyFor(item),
    quantity: item.quantity,
    day: item.day,
    attendee_id: item.attendeeId,
    family_group_id: item.familyGroupId,
    unit_price_cents: item.product.priceCents,
  }));
  await db.query(
    `insert into booking_items (booking_id, product_code, stock_key, quantity, day, attendee_id, family_group_id, unit_price_cents)
     select $1, product_code, stock_key, quantity, day, attendee_id, family_group_id, unit_price_cents
     from json_to_recordset($2::json)
       as item(product_code text, stock_key text, quantity int, day date, attendee_id text, family_group_id text, unit_price_cents int)`,
    [booking.id, JSON.stringify(items)],
  );

  return booking;
}

function sameRequestOrThrow(existing: BookingRow, requestHash: string): BookingRow {
  if (existing.request_hash !== requestHash) {
    throw new ApiError(422, "IDEMPOTENCY_KEY_REUSED", "This payment attempt was already used for a different booking. Please refresh the page and try again.");
  }
  return existing;
}

export async function reserveBooking(request: BookingRequest, idempotencyKey: string): Promise<BookingRow> {
  const requestHash = hashOf(request);
  const existing = await findByIdempotencyKey(idempotencyKey);
  if (existing) return sameRequestOrThrow(existing, requestHash);

  try {
    return await withTransaction((db) => holdStockAndInsert(db, request, idempotencyKey, requestHash));
  } catch (error) {
    // Two identical clicks raced each other: return the one that got in first.
    if (!isUniqueViolation(error, "bookings_idempotency_key_key")) throw error;
    const winner = await findByIdempotencyKey(idempotencyKey);
    if (!winner) throw error;
    return sameRequestOrThrow(winner, requestHash);
  }
}

async function openCheckout(booking: BookingRow): Promise<string> {
  const summary = booking.quote.lines.map((line) => `${line.quantity} × ${line.label}`).join(", ");
  try {
    const session = await createCheckoutSession(booking, accessTokenFor(booking.reference), summary);
    if (!session.url) throw new Error("Stripe returned a session without a URL");
    await pool.query(
      "update bookings set stripe_session_id = $2, stripe_checkout_url = $3, updated_at = now() where id = $1",
      [booking.id, session.id, session.url],
    );
    return session.url;
  } catch (error) {
    console.error(`Couldn't open Stripe checkout for ${booking.reference}`, error);
    throw new ApiError(502, "PAYMENT_PROVIDER_ERROR", "We couldn't start the payment just now. Your places are still held, so please try again in a moment.");
  }
}

export async function startPayment(booking: BookingRow): Promise<CreateBookingResponse> {
  const status = statusOf(booking);
  let checkoutUrl: string | null = null;
  if (status === "CONFIRMED") await sendConfirmationOnce(booking);
  if (status === "PENDING_PAYMENT") checkoutUrl = booking.stripe_checkout_url ?? (await openCheckout(booking));

  return {
    reference: booking.reference,
    accessToken: accessTokenFor(booking.reference),
    status,
    totalCents: booking.total_cents,
    holdExpiresAt: status === "PENDING_PAYMENT" ? (booking.hold_expires_at?.toISOString() ?? null) : null,
    checkoutUrl,
  };
}
