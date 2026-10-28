import type {
  AdminBooking,
  AdminBookingList,
  ApiErrorBody,
  BookingRequestBody,
  BookingStatus,
  BookingView,
  CreateBookingResponse,
  FestivalView,
  QuoteRequestBody,
  QuoteResponse,
} from "@rktd/domain";

export type AdminFilters = { q: string; status: BookingStatus | null; day: string | null };

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiRequestError extends Error {
  readonly status: number;
  readonly body: ApiErrorBody | null;

  constructor(status: number, body: ApiErrorBody | null, message: string) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return typeof value === "object" && value !== null && "error" in value;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init.headers },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiRequestError(0, null, "We couldn't reach the booking service. Please check your connection and try again.");
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const apiError = isApiErrorBody(body) ? body : null;
    throw new ApiRequestError(response.status, apiError, apiError?.error.message ?? "Something went wrong. Please try again.");
  }
  return body as T;
}

export const api = {
  festival: () => request<FestivalView>("/api/festival"),

  quote: (body: QuoteRequestBody, signal?: AbortSignal) =>
    request<QuoteResponse>("/api/quotes", { method: "POST", body: JSON.stringify(body), signal }),

  createBooking: (body: BookingRequestBody, idempotencyKey: string) =>
    request<CreateBookingResponse>("/api/bookings", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Idempotency-Key": idempotencyKey },
    }),

  booking: (reference: string, token: string) =>
    request<BookingView>(`/api/bookings/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),

  cancelBooking: (reference: string, token: string) =>
    request<BookingView>(`/api/bookings/${encodeURIComponent(reference)}/cancel`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }),

  adminBookings: (filters: AdminFilters, offset: number, passcode: string, signal?: AbortSignal) => {
    const params = new URLSearchParams({ q: filters.q, offset: String(offset) });
    if (filters.status) params.set("status", filters.status);
    if (filters.day) params.set("day", filters.day);
    return request<AdminBookingList>(`/api/admin/bookings?${params}`, { headers: { "X-Admin-Passcode": passcode }, signal });
  },

  adminBooking: (reference: string, passcode: string, signal?: AbortSignal) =>
    request<AdminBooking>(`/api/admin/bookings/${encodeURIComponent(reference)}`, { headers: { "X-Admin-Passcode": passcode }, signal }),

  adminCheckIn: (body: { reference: string; attendeeId: string; day: string; checkedIn: boolean }, passcode: string) =>
    request<{ ok: true }>("/api/admin/check-ins", {
      method: "PUT",
      body: JSON.stringify(body),
      headers: { "X-Admin-Passcode": passcode },
    }),
};
