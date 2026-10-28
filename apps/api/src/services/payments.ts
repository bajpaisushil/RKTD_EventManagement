import Stripe from "stripe";
import { env, webOrigin } from "../env.js";
import { festival } from "../festival.js";

export const stripe = new Stripe(env.STRIPE_SECRET_KEY);

type CheckoutBooking = { id: string; reference: string; total_cents: number; booker_email: string };

export function bookingPageUrl(reference: string, accessToken: string): string {
  return `${webOrigin}/booking/${reference}?token=${accessToken}`;
}

export async function createCheckoutSession(
  booking: CheckoutBooking,
  accessToken: string,
  summary: string,
): Promise<Stripe.Checkout.Session> {
  const metadata = { bookingId: booking.id, reference: booking.reference };
  return stripe.checkout.sessions.create(
    {
      mode: "payment",
      client_reference_id: booking.id,
      customer_email: booking.booker_email,
      allowed_payment_method_types: ["card"],
      billing_address_collection: "required",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: booking.total_cents,
            product_data: { name: `${festival.name} · booking ${booking.reference}`, description: summary },
          },
        },
      ],
      payment_intent_data: { description: `${festival.name} booking ${booking.reference}`, metadata },
      metadata,
      // Stripe's minimum session life is 30 minutes; our stock hold outlasts it.
      expires_at: Math.floor(Date.now() / 1000) + (festival.holdMinutes + 1) * 60,
      success_url: `${bookingPageUrl(booking.reference, accessToken)}&paid=1`,
      cancel_url: `${webOrigin}/?cancelled=${booking.reference}&token=${accessToken}#book`,
    },
    { idempotencyKey: `checkout-${booking.id}` },
  );
}
