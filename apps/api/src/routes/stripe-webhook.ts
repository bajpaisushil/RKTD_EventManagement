import type { Request, Response } from "express";
import type Stripe from "stripe";
import { env } from "../env.js";
import { ApiError } from "../http/errors.js";
import { applyCheckoutSession } from "../services/payment-status.js";
import { stripe } from "../services/payments.js";

export async function stripeWebhook(req: Request, res: Response): Promise<void> {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    throw new ApiError(503, "SERVER_ERROR", "The Stripe webhook secret isn't configured.");
  }
  if (!Buffer.isBuffer(req.body)) {
    throw new ApiError(400, "INVALID_REQUEST", "Expected the raw webhook body.");
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.get("stripe-signature") ?? "", env.STRIPE_WEBHOOK_SECRET);
  } catch {
    throw new ApiError(400, "INVALID_REQUEST", "The webhook signature didn't match.");
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
    case "checkout.session.expired":
      await applyCheckoutSession(event.data.object);
  }
  res.json({ received: true });
}
