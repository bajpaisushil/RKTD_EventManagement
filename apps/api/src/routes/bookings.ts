import { BookingRequestSchema } from "@rktd/domain";
import { Router, type Request } from "express";
import { ApiError, parseBody } from "../http/errors.js";
import { rateLimit } from "../http/rate-limit.js";
import { reserveBooking, startPayment } from "../services/create-booking.js";
import { cancelBooking, getBookingView } from "../services/payment-status.js";

export const bookingRoutes = Router();

function bearerToken(req: Request): string {
  const header = req.get("Authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
}

bookingRoutes.post("/", rateLimit("bookings", 10, "1 m"), async (req, res) => {
  const idempotencyKey = req.get("Idempotency-Key") ?? "";
  if (!/^[A-Za-z0-9_-]{8,100}$/.test(idempotencyKey)) {
    throw new ApiError(400, "IDEMPOTENCY_KEY_MISSING", "Send an Idempotency-Key header (8 to 100 letters, numbers, - or _) so a double click can't book twice.");
  }
  const request = parseBody(BookingRequestSchema, req.body);
  const booking = await reserveBooking(request, idempotencyKey);
  res.status(201).json(await startPayment(booking));
});

bookingRoutes.get("/:reference", rateLimit("booking-views", 60, "1 m"), async (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json(await getBookingView(String(req.params.reference), bearerToken(req)));
});

bookingRoutes.post("/:reference/cancel", rateLimit("booking-cancels", 20, "1 m"), async (req, res) => {
  res.json(await cancelBooking(String(req.params.reference), bearerToken(req)));
});
