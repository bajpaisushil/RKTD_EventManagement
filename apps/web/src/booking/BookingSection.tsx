"use client";

import type { FestivalView } from "@rktd/domain";
import { useEffect, useState } from "react";
import { Button, Notice } from "@/components/ui";
import { api } from "@/lib/api";
import { BookingFlow } from "./BookingFlow";

// Stripe sends people back here with ?cancelled=REF&token=... if they leave
// the payment page. We release their held places straight away.
function useCancelledReturn() {
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("cancelled");
    const token = params.get("token");
    if (!reference || !token) return;
    window.history.replaceState(null, "", `${window.location.pathname}#book`);
    api
      .cancelBooking(reference, token)
      .then((booking) =>
        setMessage(
          booking.status === "CONFIRMED"
            ? `Good news: booking ${reference} was paid after all. Check your email for the confirmation.`
            : "Payment cancelled, so nothing was charged and your places have been released. Your details are still here if you'd like to try again.",
        ),
      )
      .catch(() => setMessage("Payment cancelled, so nothing was charged. Your details are still here if you'd like to try again."));
  }, []);
  return message;
}

type Props = { festival: FestivalView | null; error: string | null; reload: () => void };

export function BookingSection({ festival, error, reload }: Props) {
  const cancelledMessage = useCancelledReturn();

  return (
    <section id="book" aria-labelledby="book-heading" className="mx-auto max-w-6xl scroll-mt-4 px-4 py-14 sm:px-6">
      <h2 id="book-heading" className="mb-6 font-serif text-4xl font-semibold text-primary sm:text-5xl">
        Book your tickets
      </h2>

      {error && (
        <div className="space-y-3 rounded-2xl bg-cream p-6">
          <Notice tone="error">{error}</Notice>
          <Button onClick={reload}>Try again</Button>
        </div>
      )}

      {!festival && !error && (
        <div aria-busy="true" className="glass animate-pulse rounded-2xl p-10 text-white/70">
          Loading tickets and availability…
        </div>
      )}

      {festival && !festival.salesOpen && (
        <Notice tone="info">Sharad Utsav 2026 has finished, so bookings are closed. Thank you to everyone who came.</Notice>
      )}

      {festival?.salesOpen && (
        <BookingFlow festival={festival} notice={cancelledMessage ? <Notice tone="info">{cancelledMessage}</Notice> : undefined} />
      )}
    </section>
  );
}
