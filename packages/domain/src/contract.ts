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

export type BookingStatus = "PENDING_PAYMENT" | "CONFIRMED" | "EXPIRED" | "CANCELLED" | "REFUNDED";

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

export type ApiErrorCode =
  | "INVALID_REQUEST"
  | "BOOKING_NOT_ALLOWED"
  | "PRICE_CHANGED"
  | "OUT_OF_STOCK"
  | "IDEMPOTENCY_KEY_MISSING"
  | "IDEMPOTENCY_KEY_REUSED"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "RATE_LIMITED"
  | "PAYMENT_PROVIDER_ERROR"
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
