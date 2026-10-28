"use client";

import { formatCents, formatDay, type BookingView } from "@rktd/domain";
import Link from "next/link";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { clearSavedDraft } from "@/booking/saved-draft";
import { Button, Notice } from "@/components/ui";
import { api } from "@/lib/api";
import { firstTimeConfirmed, throwConfetti } from "./celebrate";

const MAX_POLLS = 30;

function DoorQrCode({ url }: { url: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    QRCode.toString(url, { type: "svg", margin: 1, color: { dark: "#291900", light: "#FDF3E4" } }).then(setSvg, () => setSvg(null));
  }, [url]);
  if (!svg) return <div className="size-44 animate-pulse rounded-lg bg-body/10" />;
  return <div role="img" aria-label="QR code to show at the door" className="size-44" dangerouslySetInnerHTML={{ __html: svg }} />;
}

function People({ booking }: { booking: BookingView }) {
  return (
    <ul className="divide-y divide-body/15 rounded-xl border border-body/20 bg-white">
      {booking.people.map((person) => (
        <li key={person.id} className="space-y-1 p-4 text-sm">
          <p className="font-semibold text-heading">
            {person.firstName} {person.lastName} <span className="font-normal text-body">· {person.ticket}</span>
          </p>
          <p className="text-body">{person.days.map(formatDay).join(", ")}</p>
          {person.dinnerDays.length > 0 && <p className="text-body">Dinner: {person.dinnerDays.map(formatDay).join(", ")}</p>}
          {person.workshopDays.length > 0 && <p className="text-body">Garba Workshop: {person.workshopDays.map(formatDay).join(", ")}</p>}
        </li>
      ))}
      {booking.dandiyaPairs > 0 && <li className="p-4 text-sm text-heading">Dandiya sticks: {booking.dandiyaPairs} pair(s) to collect</li>}
    </ul>
  );
}

function Totals({ booking }: { booking: BookingView }) {
  const { quote } = booking;
  return (
    <dl className="space-y-1 text-sm">
      {quote.lines.map((line) => (
        <div key={line.productCode} className="flex justify-between gap-4">
          <dt>
            {line.quantity} × {line.label}
          </dt>
          <dd>{formatCents(line.amountCents)}</dd>
        </div>
      ))}
      {quote.discountCents > 0 && (
        <div className="flex justify-between gap-4 text-success-on-cream">
          <dt>Code {quote.promo?.code}</dt>
          <dd>−{formatCents(quote.discountCents)}</dd>
        </div>
      )}
      <div className="flex justify-between gap-4 border-t border-body/20 pt-2 text-base font-semibold text-heading">
        <dt>{booking.status === "CONFIRMED" ? "Paid" : "Total"}</dt>
        <dd>{formatCents(quote.totalCents)}</dd>
      </div>
    </dl>
  );
}

function Confirmed({ booking, pageUrl }: { booking: BookingView; pageUrl: string }) {
  const emailNote = {
    SENT: `We've emailed a copy to ${booking.booker.email}.`,
    FAILED: "We couldn't email your confirmation, so please save or print this page.",
    NOT_SENT: `A copy is on its way to ${booking.booker.email}.`,
  }[booking.emailStatus];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <p className="font-semibold text-success-on-cream">✓ Payment received. You're booked.</p>
          <h1 className="font-serif text-4xl font-semibold text-heading">See you at Sharad Utsav</h1>
          <p className="text-sm">Booking reference</p>
          <p className="text-3xl font-bold tracking-wider text-heading">{booking.reference}</p>
          <p className="text-sm">{emailNote}</p>
        </div>
        <div className="flex flex-col items-center gap-2">
          <DoorQrCode url={pageUrl} />
          <p className="text-xs">Show this, or your reference, at the door</p>
        </div>
      </div>
      <People booking={booking} />
      <Totals booking={booking} />
      <div className="no-print flex flex-wrap gap-3">
        <Button onClick={() => window.print()}>Print or save as PDF</Button>
        <Link href="/" className="inline-flex min-h-11 items-center px-2 text-heading underline underline-offset-4">
          Back to the festival page
        </Link>
      </div>
    </div>
  );
}

function holdTime(iso: string | null): string {
  return iso ? new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "soon";
}

export function Confirmation({ reference, token, justPaid }: { reference: string; token: string; justPaid: boolean }) {
  const [booking, setBooking] = useState<BookingView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [polls, setPolls] = useState(0);
  const [pageUrl, setPageUrl] = useState("");

  useEffect(() => {
    setPageUrl(`${window.location.origin}/booking/${reference}?token=${token}`);
  }, [reference, token]);

  useEffect(() => {
    let stale = false;
    api.booking(reference, token).then(
      (result) => !stale && setBooking(result),
      (e: unknown) => {
        if (stale) return;
        const message = e instanceof Error ? e.message : "We couldn't load this booking.";
        setError(message);
        toast.error(message, { id: "booking" });
      },
    );
    return () => {
      stale = true;
    };
  }, [reference, token, polls]);

  // Stripe's confirmation can take a few seconds to reach us after the redirect.
  useEffect(() => {
    if (!justPaid || booking?.status !== "PENDING_PAYMENT" || polls >= MAX_POLLS) return;
    const timer = setTimeout(() => setPolls((n) => n + 1), 2000);
    return () => clearTimeout(timer);
  }, [booking, justPaid, polls]);

  useEffect(() => {
    if (booking?.status !== "CONFIRMED") return;
    clearSavedDraft();
    if (!firstTimeConfirmed(booking.reference)) return;
    void throwConfetti();
    toast.success("You're booked!", { id: "booking", description: `Booking ${booking.reference}. See you at Sharad Utsav.` });
  }, [booking?.status, booking?.reference]);

  useEffect(() => {
    if (booking?.status === "EXPIRED") toast.error("Your hold ran out before payment, so nothing was charged.", { id: "booking" });
    if (booking?.status === "REFUNDED") toast.error("Your payment came after the places had sold out, so it has been refunded.", { id: "booking" });
  }, [booking?.status]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="rounded-2xl bg-cream p-6 text-body sm:p-10">
        {error && (
          <div className="space-y-4">
            <Notice tone="error">{error}</Notice>
            <Link href="/" className="text-heading underline underline-offset-4">
              Go to the festival page
            </Link>
          </div>
        )}

        {!booking && !error && <p aria-busy="true">Loading your booking…</p>}

        {booking?.status === "CONFIRMED" && <Confirmed booking={booking} pageUrl={pageUrl} />}

        {booking?.status === "PENDING_PAYMENT" && justPaid && (
          <div className="space-y-3" aria-live="polite">
            <h1 className="font-serif text-3xl font-semibold text-heading">Confirming your payment…</h1>
            <p>
              {polls < MAX_POLLS
                ? "This usually takes a few seconds. Please keep this page open."
                : "This is taking longer than usual. We'll email you as soon as the payment is confirmed, or you can refresh this page."}
            </p>
          </div>
        )}

        {booking?.status === "PENDING_PAYMENT" && !justPaid && (
          <div className="space-y-4">
            <h1 className="font-serif text-3xl font-semibold text-heading">Waiting for payment</h1>
            <p>We're holding your places until {holdTime(booking.holdExpiresAt)}.</p>
            {booking.checkoutUrl && (
              <a href={booking.checkoutUrl} className="inline-flex min-h-11 items-center rounded-lg bg-primary px-5 font-semibold text-heading">
                Continue to payment
              </a>
            )}
            <Totals booking={booking} />
          </div>
        )}

        {booking && ["EXPIRED", "CANCELLED", "REFUNDED"].includes(booking.status) && (
          <div className="space-y-4">
            <h1 className="font-serif text-3xl font-semibold text-heading">
              {booking.status === "REFUNDED" ? "Payment refunded" : "This booking wasn't completed"}
            </h1>
            <p>
              {booking.status === "EXPIRED" && "The hold on your places ran out before payment, so nothing was charged and the places were released."}
              {booking.status === "CANCELLED" && "Payment was cancelled, so nothing was charged."}
              {booking.status === "REFUNDED" &&
                "Your payment arrived after your hold had ended and those places had sold out, so we've refunded you in full. Sorry about that."}
            </p>
            <Link href="/#book" className="inline-flex min-h-11 items-center rounded-lg bg-primary px-5 font-semibold text-heading">
              Start a new booking
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
