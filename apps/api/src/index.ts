import cors from "cors";
import express from "express";
import { webOrigins } from "./env.js";
import { errorHandler } from "./http/errors.js";
import { adminRoutes } from "./routes/admin.js";
import { bookingRoutes } from "./routes/bookings.js";
import { festivalRoutes } from "./routes/festival.js";
import { quoteRoutes } from "./routes/quotes.js";
import { stripeWebhook } from "./routes/stripe-webhook.js";

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", true);
app.use(
  cors({
    origin: webOrigins,
    allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key", "X-Admin-Passcode"],
    maxAge: 600,
  }),
);

// Stripe signs the exact bytes it sends, so this route must see the raw body.
app.post("/api/webhooks/stripe", express.raw({ type: "application/json" }), stripeWebhook);
app.use(express.json({ limit: "100kb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});
app.use("/api/festival", festivalRoutes);
app.use("/api/quotes", quoteRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/admin", adminRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "There's no endpoint here." } });
});
app.use(errorHandler);

export default app;
