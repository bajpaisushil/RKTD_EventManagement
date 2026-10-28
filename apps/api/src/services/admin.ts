import {
  formatDay,
  type AdminBooking,
  type AdminBookingList,
  type AdminBookingSummary,
  type AdminPayment,
  type BookingStatus,
  type IsoDate,
} from "@rktd/domain";
import { pool } from "../db.js";
import { env } from "../env.js";
import { festival } from "../festival.js";
import { ApiError } from "../http/errors.js";
import { findByReference, toView, type BookingRow } from "./booking-records.js";
import { syncWithStripe } from "./payment-status.js";
import { bookingPageUrl, stripe } from "./payments.js";
import { accessTokenFor } from "./tokens.js";

const PAGE_SIZE = 50;

// Matches statusOf(): an unpaid booking past its hold counts as expired.
const CURRENT_STATUS = `case when b.status = 'PENDING_PAYMENT' and b.hold_expires_at <= now() then 'EXPIRED' else b.status end`;

const ALL_DAY_PASS_CODES = [festival.catalog.allDayPass.ADULT.code, festival.catalog.allDayPass.CHILD.code];

const stripeTestMode = env.STRIPE_SECRET_KEY.startsWith("sk_test_");

export type AdminListQuery = { q: string; status?: BookingStatus; day?: IsoDate; offset: number };

class SqlFilters {
  readonly conditions: string[] = [];
  readonly params: unknown[] = [];

  param(value: unknown): string {
    this.params.push(value);
    return `$${this.params.length}`;
  }

  where(): string {
    return this.conditions.length > 0 ? `where ${this.conditions.join(" and ")}` : "";
  }
}

// Reference (with or without dashes), booker email or phone, promo code, or anyone's name.
function filtersFor(query: AdminListQuery): SqlFilters {
  const filters = new SqlFilters();
  const search = query.q.trim();
  if (search) {
    const text = filters.param(search.replace(/[\\%_]/g, "\\$&"));
    const matches = [
      `replace(b.reference, '-', '') ilike '%' || replace(${text}, '-', '') || '%'`,
      `b.booker_email ilike '%' || ${text} || '%'`,
      `b.promo_code ilike '%' || ${text} || '%'`,
      `concat_ws(' ', b.request -> 'booker' ->> 'firstName', b.request -> 'booker' ->> 'lastName') ilike '%' || ${text} || '%'`,
      `exists (select 1 from jsonb_array_elements(b.request -> 'attendees') a
               where concat_ws(' ', a ->> 'firstName', a ->> 'lastName') ilike '%' || ${text} || '%')`,
    ];
    const digits = search.replace(/\D/g, "");
    if (/^[\d\s()+.-]+$/.test(search) && digits.length >= 3) {
      matches.push(`regexp_replace(b.request -> 'booker' ->> 'phone', '\\D', '', 'g') like '%' || ${filters.param(digits)} || '%'`);
    }
    filters.conditions.push(`(${matches.join(" or ")})`);
  }
  if (query.day) {
    filters.conditions.push(
      `exists (select 1 from booking_items i where i.booking_id = b.id
               and (i.day = ${filters.param(query.day)} or i.product_code = any(${filters.param(ALL_DAY_PASS_CODES)})))`,
    );
  }
  return filters;
}

function toSummary(row: BookingRow): AdminBookingSummary {
  const view = toView(row);
  return {
    reference: view.reference,
    status: view.status,
    createdAt: view.createdAt,
    bookerName: `${view.booker.firstName} ${view.booker.lastName}`,
    bookerEmail: view.booker.email,
    bookerPhone: view.booker.phone,
    peopleCount: view.people.length,
    days: [...new Set(view.people.flatMap((person) => person.days))].sort(),
    totalCents: row.total_cents,
    promoCode: row.promo_code,
  };
}

async function countByStatus(query: AdminListQuery): Promise<Record<BookingStatus, number>> {
  const filters = filtersFor(query);
  const { rows } = await pool.query<{ status: BookingStatus; count: number }>(
    `select ${CURRENT_STATUS} as status, count(*)::int as count from bookings b ${filters.where()} group by 1`,
    filters.params,
  );
  const counts: Record<BookingStatus, number> = { CONFIRMED: 0, PENDING_PAYMENT: 0, EXPIRED: 0, CANCELLED: 0, REFUNDED: 0 };
  for (const row of rows) counts[row.status] = row.count;
  return counts;
}

async function loadPage(query: AdminListQuery): Promise<BookingRow[]> {
  const filters = filtersFor(query);
  if (query.status) filters.conditions.push(`${CURRENT_STATUS} = ${filters.param(query.status)}`);
  const { rows } = await pool.query<BookingRow>(
    `select b.* from bookings b ${filters.where()}
     order by b.created_at desc
     limit ${PAGE_SIZE} offset ${filters.param(query.offset)}`,
    filters.params,
  );
  return rows;
}

async function loadStats(): Promise<AdminBookingList["stats"]> {
  const { rows } = await pool.query<AdminBookingList["stats"]>(
    `select count(*) filter (where status = 'CONFIRMED')::int as "confirmedBookings",
            coalesce(sum(jsonb_array_length(request -> 'attendees')) filter (where status = 'CONFIRMED'), 0)::int as "peopleBooked",
            coalesce(sum(total_cents) filter (where status = 'CONFIRMED'), 0)::int as "revenueCents",
            count(*) filter (where status = 'PENDING_PAYMENT' and hold_expires_at > now())::int as "awaitingPayment"
     from bookings`,
  );
  return rows[0];
}

export async function listAdminBookings(query: AdminListQuery): Promise<AdminBookingList> {
  const [statusCounts, rows, stats] = await Promise.all([countByStatus(query), loadPage(query), loadStats()]);
  const total = query.status ? statusCounts[query.status] : Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
  return { bookings: rows.map(toSummary), total, statusCounts, stats };
}

async function loadPayment(booking: BookingRow): Promise<AdminPayment> {
  const intentId = booking.stripe_payment_intent_id;
  const payment: AdminPayment = {
    method: booking.total_cents === 0 ? "NOT_NEEDED" : "STRIPE_CHECKOUT",
    testMode: stripeTestMode,
    checkoutSessionId: booking.stripe_session_id,
    paymentIntentId: intentId,
    dashboardUrl: intentId ? `https://dashboard.stripe.com/${stripeTestMode ? "test/" : ""}payments/${intentId}` : null,
    card: null,
    billingName: null,
    receiptUrl: null,
    refundedCents: 0,
    lookupFailed: false,
  };
  if (!intentId) return payment;

  try {
    const intent = await stripe.paymentIntents.retrieve(intentId, { expand: ["latest_charge"] });
    const charge = typeof intent.latest_charge === "object" ? intent.latest_charge : null;
    const card = charge?.payment_method_details?.card;
    return {
      ...payment,
      card: card
        ? {
            brand: card.brand ?? "card",
            last4: card.last4 ?? "",
            expiry: `${String(card.exp_month).padStart(2, "0")}/${String(card.exp_year).slice(-2)}`,
            funding: card.funding,
            country: card.country,
            wallet: card.wallet?.type ?? null,
          }
        : null,
      billingName: charge?.billing_details.name ?? null,
      receiptUrl: charge?.receipt_url ?? null,
      refundedCents: charge?.amount_refunded ?? 0,
    };
  } catch (error) {
    console.error(`Couldn't load the Stripe payment for ${booking.reference}`, error);
    return { ...payment, lookupFailed: true };
  }
}

async function loadCheckIns(bookingId: string): Promise<{ attendee_id: string; day: IsoDate; checked_in_at: Date }[]> {
  const { rows } = await pool.query<{ attendee_id: string; day: IsoDate; checked_in_at: Date }>(
    "select attendee_id, day::text as day, checked_in_at from check_ins where booking_id = $1 order by day",
    [bookingId],
  );
  return rows;
}

export async function getAdminBooking(reference: string): Promise<AdminBooking> {
  const found = await findByReference(reference);
  if (!found) {
    throw new ApiError(404, "NOT_FOUND", "There's no booking with that reference.");
  }
  const booking = await syncWithStripe(found);
  const [checkIns, payment] = await Promise.all([loadCheckIns(booking.id), loadPayment(booking)]);
  const { request } = booking;
  const view = toView(booking);

  return {
    ...view,
    people: view.people.map((person, index) => {
      const attendee = request.attendees[index];
      return {
        ...person,
        dateOfBirth: attendee.dateOfBirth,
        familyGroupId: attendee.entry.type === "FAMILY_PASS" ? attendee.entry.familyGroupId : null,
        checkIns: checkIns
          .filter((checkIn) => checkIn.attendee_id === person.id)
          .map((checkIn) => ({ day: checkIn.day, at: checkIn.checked_in_at.toISOString() })),
      };
    }),
    bookerDateOfBirth: request.booker.attending ? null : request.booker.dateOfBirth,
    familyGroups: request.familyGroups,
    bookingPageUrl: bookingPageUrl(booking.reference, accessTokenFor(booking.reference)),
    payment,
  };
}

export async function setCheckedIn(reference: string, attendeeId: string, day: IsoDate, checkedIn: boolean): Promise<void> {
  const booking = await findByReference(reference);
  if (!booking || booking.status !== "CONFIRMED") {
    throw new ApiError(404, "NOT_FOUND", "There's no confirmed booking with that reference.");
  }
  const person = toView(booking).people.find((p) => p.id === attendeeId);
  if (!person) {
    throw new ApiError(404, "NOT_FOUND", "That person isn't on this booking.");
  }

  if (!checkedIn) {
    await pool.query("delete from check_ins where booking_id = $1 and attendee_id = $2 and day = $3", [booking.id, attendeeId, day]);
    return;
  }
  if (!person.days.includes(day)) {
    throw new ApiError(409, "NOT_BOOKED_THAT_DAY", `${person.firstName} isn't booked for ${formatDay(day)}.`);
  }
  await pool.query("insert into check_ins (booking_id, attendee_id, day) values ($1, $2, $3) on conflict do nothing", [
    booking.id,
    attendeeId,
    day,
  ]);
}
