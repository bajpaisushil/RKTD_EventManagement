import { timingSafeEqual } from "node:crypto";
import { BOOKING_STATUSES } from "@rktd/domain";
import { Router, type RequestHandler } from "express";
import { z } from "zod";
import { env } from "../env.js";
import { festival } from "../festival.js";
import { ApiError, parseBody } from "../http/errors.js";
import { rateLimit } from "../http/rate-limit.js";
import { getAdminBooking, listAdminBookings, setCheckedIn } from "../services/admin.js";

export const adminRoutes = Router();

const requirePasscode: RequestHandler = (req, _res, next) => {
  if (!env.ADMIN_PASSCODE) {
    throw new ApiError(503, "SERVER_ERROR", "The admin page hasn't been set up yet.");
  }
  const given = Buffer.from(req.get("X-Admin-Passcode") ?? "");
  const expected = Buffer.from(env.ADMIN_PASSCODE);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    throw new ApiError(401, "UNAUTHORIZED", "That passcode isn't right.");
  }
  next();
};

const FestivalDaySchema = z.string().refine((day) => festival.days.includes(day), "Pick one of the festival days");

const ListQuerySchema = z.object({
  q: z.string().max(100).default(""),
  status: z.enum(BOOKING_STATUSES).optional(),
  day: FestivalDaySchema.optional(),
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
});

const CheckInSchema = z.object({
  reference: z.string().min(1).max(20),
  attendeeId: z.string().min(1).max(64),
  day: FestivalDaySchema,
  checkedIn: z.boolean(),
});

adminRoutes.use(rateLimit("admin", 120, "1 m"), requirePasscode, (_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

adminRoutes.get("/bookings", async (req, res) => {
  res.json(await listAdminBookings(parseBody(ListQuerySchema, req.query)));
});

adminRoutes.get("/bookings/:reference", async (req, res) => {
  res.json(await getAdminBooking(String(req.params.reference)));
});

adminRoutes.put("/check-ins", async (req, res) => {
  const { reference, attendeeId, day, checkedIn } = parseBody(CheckInSchema, req.body);
  await setCheckedIn(reference, attendeeId, day, checkedIn);
  res.json({ ok: true });
});
