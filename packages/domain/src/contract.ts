import type { AgeBand } from "./age.js";
import type { IsoDate } from "./dates.js";
import type { Issue } from "./issues.js";
import type { Cents } from "./money.js";
import type { Quote } from "./pricing.js";
import type { Suggestion } from "./suggestions.js";

export type QuoteResponse = {
  quote: Quote;
  issues: Issue[];
  suggestions: Suggestion[];
  canBook: boolean;
};

export const BOOKING_STATUSES = ["CONFIRMED", "PENDING_PAYMENT", "EXPIRED", "CANCELLED", "REFUNDED"] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export type CreateBookingResponse = {
  reference: string;
  accessToken: string;
  status: BookingStatus;
  totalCents: Cents;
  holdExpiresAt: string | null;
  checkoutUrl: string | null;
};

export type BookingPerson = {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  band: AgeBand;
  ticket: string;
  days: IsoDate[];
  dinnerDays: IsoDate[];
  workshopDays: IsoDate[];
  isBooker: boolean;
};

export type BookingView = {
  reference: string;
  status: BookingStatus;
  createdAt: string;
  confirmedAt: string | null;
  holdExpiresAt: string | null;
  booker: { firstName: string; lastName: string; email: string; phone: string; attending: boolean };
  people: BookingPerson[];
  dandiyaPairs: number;
  quote: Quote;
  checkoutUrl: string | null;
  emailStatus: "SENT" | "NOT_SENT" | "FAILED";
};

export type AdminBookingSummary = {
  reference: string;
  status: BookingStatus;
  createdAt: string;
  bookerName: string;
  bookerEmail: string;
  bookerPhone: string;
  peopleCount: number;
  days: IsoDate[];
  totalCents: Cents;
  promoCode: string | null;
};

export type AdminBookingList = {
  bookings: AdminBookingSummary[];
  total: number;
  statusCounts: Record<BookingStatus, number>;
  stats: { confirmedBookings: number; peopleBooked: number; revenueCents: Cents; awaitingPayment: number };
};

export type AdminPerson = BookingPerson & {
  dateOfBirth: IsoDate;
  familyGroupId: string | null;
  checkIns: { day: IsoDate; at: string }[];
};

export type AdminPayment = {
  method: "STRIPE_CHECKOUT" | "NOT_NEEDED";
  testMode: boolean;
  checkoutSessionId: string | null;
  paymentIntentId: string | null;
  dashboardUrl: string | null;
  card: { brand: string; last4: string; expiry: string; funding: string | null; country: string | null; wallet: string | null } | null;
  billingName: string | null;
  receiptUrl: string | null;
  refundedCents: Cents;
  lookupFailed: boolean;
};

export type AdminBooking = Omit<BookingView, "people"> & {
  people: AdminPerson[];
  bookerDateOfBirth: IsoDate | null;
  familyGroups: { id: string; days: IsoDate[] }[];
  bookingPageUrl: string;
  payment: AdminPayment;
};

export type ApiErrorCode =
  | "INVALID_REQUEST"
  | "BOOKING_NOT_ALLOWED"
  | "PRICE_CHANGED"
  | "OUT_OF_STOCK"
  | "IDEMPOTENCY_KEY_MISSING"
  | "IDEMPOTENCY_KEY_REUSED"
  | "NOT_FOUND"
  | "NOT_BOOKED_THAT_DAY"
  | "UNAUTHORIZED"
  | "RATE_LIMITED"
  | "PAYMENT_PROVIDER_ERROR"
  | "BUSY"
  | "SERVER_ERROR";

export type ApiErrorBody = {
  error: {
    code: ApiErrorCode;
    message: string;
    issues?: Issue[];
    fieldErrors?: { path: string; message: string }[];
    quote?: QuoteResponse;
  };
};
