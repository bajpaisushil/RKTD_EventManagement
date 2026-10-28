import {
  resolveParty,
  type BookingRequest,
  type BookingStatus,
  type BookingView,
  type PartyMember,
  type Quote,
} from "@rktd/domain";
import { pool, type Db } from "../db.js";
import { festival } from "../festival.js";
import { ApiError } from "../http/errors.js";
import { isValidAccessToken } from "./tokens.js";

export type BookingRow = {
  id: string;
  reference: string;
  idempotency_key: string;
  request_hash: string;
  status: BookingStatus;
  request: BookingRequest;
  quote: Quote;
  total_cents: number;
  promo_code: string | null;
  booker_email: string;
  hold_expires_at: Date | null;
  stripe_session_id: string | null;
  stripe_checkout_url: string | null;
  stripe_payment_intent_id: string | null;
  email_status: "NOT_SENT" | "SENDING" | "SENT" | "FAILED";
  created_at: Date;
  confirmed_at: Date | null;
};

async function findOne(where: string, value: string, db: Db = pool): Promise<BookingRow | null> {
  const { rows } = await db.query<BookingRow>(`select * from bookings where ${where} = $1`, [value]);
  return rows[0] ?? null;
}

export const findById = (id: string) => findOne("id", id);
export const findByIdempotencyKey = (key: string) => findOne("idempotency_key", key);
export const findByReference = (reference: string) => findOne("reference", reference.trim().toUpperCase());

export async function findForViewer(reference: string, token: string): Promise<BookingRow> {
  const normalized = reference.trim().toUpperCase();
  const booking = isValidAccessToken(normalized, token) ? await findOne("reference", normalized) : null;
  if (!booking) {
    throw new ApiError(404, "NOT_FOUND", "We couldn't find that booking. Please use the link from your confirmation.");
  }
  return booking;
}

// An unpaid booking whose hold has run out no longer holds anything, whatever the row says.
export function statusOf(booking: BookingRow): BookingStatus {
  if (booking.status === "PENDING_PAYMENT" && booking.hold_expires_at && booking.hold_expires_at <= new Date()) {
    return "EXPIRED";
  }
  return booking.status;
}

function ticketLabel(member: PartyMember): string {
  const { catalog } = festival;
  if (member.band === "INFANT") return `Under ${festival.agePolicy.childFromAge} · no ticket needed`;
  switch (member.attendee.entry.type) {
    case "DAY_PASS":
      return catalog.dayPass[member.band].label;
    case "ALL_DAY_PASS":
      return catalog.allDayPass[member.band].label;
    case "FAMILY_PASS":
      return catalog.familyPass.label;
    case "NO_TICKET":
      return "No ticket";
  }
}

function bookerName(request: BookingRequest): { firstName: string; lastName: string } {
  const { booker } = request;
  if (!booker.attending) {
    return { firstName: booker.firstName, lastName: booker.lastName };
  }
  const attendee = request.attendees.find((a) => a.id === booker.attendeeId);
  return { firstName: attendee?.firstName ?? "", lastName: attendee?.lastName ?? "" };
}

export function toView(booking: BookingRow): BookingView {
  const { request } = booking;
  const { booker } = request;
  const party = resolveParty(request, festival);
  const status = statusOf(booking);

  return {
    reference: booking.reference,
    status,
    createdAt: booking.created_at.toISOString(),
    confirmedAt: booking.confirmed_at?.toISOString() ?? null,
    holdExpiresAt: status === "PENDING_PAYMENT" ? (booking.hold_expires_at?.toISOString() ?? null) : null,
    booker: {
      ...bookerName(request),
      email: booker.email,
      phone: booker.phone,
      attending: booker.attending,
    },
    people: party.map((member, index) => {
      const attendee = request.attendees[index];
      return {
        id: attendee.id,
        firstName: attendee.firstName,
        lastName: attendee.lastName,
        age: member.age,
        band: member.band,
        ticket: ticketLabel(member),
        days: member.days,
        dinnerDays: attendee.dinnerDays,
        workshopDays: attendee.workshopDays,
        isBooker: booker.attending && booker.attendeeId === attendee.id,
      };
    }),
    dandiyaPairs: request.dandiyaPairs,
    quote: booking.quote,
    checkoutUrl: status === "PENDING_PAYMENT" ? booking.stripe_checkout_url : null,
    emailStatus: booking.email_status === "SENT" || booking.email_status === "FAILED" ? booking.email_status : "NOT_SENT",
  };
}
