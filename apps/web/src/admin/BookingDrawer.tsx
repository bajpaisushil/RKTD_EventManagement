"use client";

import { formatCents, type AdminBooking, type AdminPerson, type FestivalView, type IsoDate } from "@rktd/domain";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Notice } from "@/components/ui";
import { ApiRequestError, api } from "@/lib/api";
import { bandLabel, birthDate, clockTime, dateTime, initials, shortDay, titleCase } from "./format";
import { CopyButton, Icon, Panel, Skeleton, StatusBadge, type IconName } from "./parts";

type CheckInChange = (person: AdminPerson, day: IsoDate, checkedIn: boolean) => void;

function Avatar({ firstName, lastName }: { firstName: string; lastName: string }) {
  return (
    <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-cream text-sm font-semibold text-gold-deep ring-1 ring-inset ring-primary/30">
      {initials(firstName, lastName)}
    </span>
  );
}

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-gold-deep transition hover:bg-primary/10">
      {children}
      <Icon name="external" className="size-3.5" />
    </a>
  );
}

function ContactRow({ icon, href, value }: { icon: IconName; href: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-paper px-3 py-2">
      <a href={href} className="flex min-w-0 items-center gap-2.5 text-heading hover:text-gold-deep">
        <Icon name={icon} className="size-4 shrink-0 text-body" />
        <span className="truncate">{value}</span>
      </a>
      <CopyButton value={value} label="Copy" />
    </div>
  );
}

function KeyFacts({ booking }: { booking: AdminBooking }) {
  const days = new Set(booking.people.flatMap((person) => person.days));
  const facts = [
    { label: booking.status === "CONFIRMED" ? "Paid" : "Total", value: formatCents(booking.quote.totalCents) },
    { label: "People", value: booking.people.length },
    { label: days.size === 1 ? "Day" : "Days", value: days.size },
  ];
  return (
    <dl className="grid grid-cols-3 gap-3">
      {facts.map((fact) => (
        <div key={fact.label} className="rounded-2xl border border-line bg-white px-4 py-3">
          <dt className="text-xs font-semibold uppercase tracking-wider">{fact.label}</dt>
          <dd className="mt-1 font-serif text-2xl font-semibold lining-nums tabular-nums text-heading sm:text-3xl">{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function BookedBy({ booking }: { booking: AdminBooking }) {
  const { booker } = booking;
  return (
    <Panel title="Booked by" aside={<span className="text-xs">{booker.attending ? "Coming to the festival" : "Not coming themselves"}</span>}>
      <div className="flex items-center gap-3">
        <Avatar firstName={booker.firstName} lastName={booker.lastName} />
        <div>
          <p className="font-semibold text-heading">
            {booker.firstName} {booker.lastName}
          </p>
          {booking.bookerDateOfBirth && <p className="text-sm">Born {birthDate(booking.bookerDateOfBirth)}</p>}
        </div>
      </div>
      <div className="mt-4 grid gap-2 text-sm">
        <ContactRow icon="mail" href={`mailto:${booker.email}`} value={booker.email} />
        <ContactRow icon="phone" href={`tel:${booker.phone}`} value={booker.phone} />
      </div>
    </Panel>
  );
}

function DayPills({ person, festival, canCheckIn, onCheckIn }: { person: AdminPerson; festival: FestivalView; canCheckIn: boolean; onCheckIn: CheckInChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {festival.days.map(({ date }) => {
        const label = shortDay(date);
        const checkIn = person.checkIns.find((entry) => entry.day === date);
        if (!person.days.includes(date)) {
          return (
            <span key={date} className="rounded-lg border border-dashed border-line px-2.5 py-1.5 text-xs text-body">
              <span className="sr-only">Not coming </span>
              {label}
            </span>
          );
        }
        if (!canCheckIn) {
          return (
            <span key={date} className="rounded-lg bg-paper px-2.5 py-1.5 text-xs font-semibold text-heading ring-1 ring-inset ring-line">
              {label}
            </span>
          );
        }
        return (
          <button
            key={date}
            type="button"
            aria-pressed={Boolean(checkIn)}
            aria-label={`${checkIn ? "Checked in" : "Check in"} ${person.firstName} for ${label}`}
            onClick={() => onCheckIn(person, date, !checkIn)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
              checkIn ? "bg-success-on-cream text-white shadow-sm hover:bg-success-on-cream/90" : "bg-white text-heading ring-1 ring-inset ring-gold/50 hover:bg-primary/10"
            }`}
          >
            {checkIn ? <Icon name="check" className="size-3.5" /> : <span className="size-3 rounded-full ring-[1.5px] ring-inset ring-gold" />}
            {label}
            {checkIn && <span className="font-normal opacity-90">{clockTime(checkIn.at, festival.timeZone)}</span>}
          </button>
        );
      })}
    </div>
  );
}

function PersonRow({ person, booking, festival, canCheckIn, onCheckIn }: { person: AdminPerson; booking: AdminBooking; festival: FestivalView; canCheckIn: boolean; onCheckIn: CheckInChange }) {
  const groupIndex = booking.familyGroups.findIndex((group) => group.id === person.familyGroupId);
  const ticket = groupIndex >= 0 && booking.familyGroups.length > 1 ? `${person.ticket} ${groupIndex + 1}` : person.ticket;
  return (
    <li className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
      <Avatar firstName={person.firstName} lastName={person.lastName} />
      <div className="min-w-0 flex-1 space-y-3">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <p className="flex items-center gap-2 font-semibold text-heading">
              {person.firstName} {person.lastName}
              {person.isBooker && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-heading">Booker</span>}
            </p>
            <p className="text-sm">
              {bandLabel(person.band, festival.agePolicy.childFromAge)} · age {person.age}
            </p>
          </div>
          <p className="text-sm">
            {ticket} · born {birthDate(person.dateOfBirth)}
          </p>
        </div>
        <DayPills person={person} festival={festival} canCheckIn={canCheckIn} onCheckIn={onCheckIn} />
        {(person.dinnerDays.length > 0 || person.workshopDays.length > 0) && (
          <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {person.dinnerDays.length > 0 && (
              <div className="flex gap-1.5">
                <dt className="font-medium text-heading">Dinner</dt>
                <dd>{person.dinnerDays.map(shortDay).join(", ")}</dd>
              </div>
            )}
            {person.workshopDays.length > 0 && (
              <div className="flex gap-1.5">
                <dt className="font-medium text-heading">Garba workshop</dt>
                <dd>{person.workshopDays.map(shortDay).join(", ")}</dd>
              </div>
            )}
          </dl>
        )}
      </div>
    </li>
  );
}

function perDay(people: AdminPerson[], daysOf: (person: AdminPerson) => IsoDate[]): string {
  const counts = new Map<IsoDate, number>();
  for (const day of people.flatMap(daysOf)) counts.set(day, (counts.get(day) ?? 0) + 1);
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, count]) => `${shortDay(day)} × ${count}`)
    .join(", ");
}

function PackagesAndExtras({ booking }: { booking: AdminBooking }) {
  const rows: { label: string; detail: string }[] = booking.familyGroups.map((group, index) => ({
    label: booking.familyGroups.length > 1 ? `Family Pass ${index + 1}` : "Family Pass",
    detail: `${booking.people
      .filter((person) => person.familyGroupId === group.id)
      .map((person) => person.firstName)
      .join(", ")} · ${group.days.map(shortDay).join(", ")}`,
  }));
  const dinners = perDay(booking.people, (person) => person.dinnerDays);
  const workshops = perDay(booking.people, (person) => person.workshopDays);
  if (dinners) rows.push({ label: "Dinner plates", detail: dinners });
  if (workshops) rows.push({ label: "Garba workshop places", detail: workshops });
  if (booking.dandiyaPairs > 0) {
    rows.push({ label: "Dandiya sticks", detail: `${booking.dandiyaPairs} ${booking.dandiyaPairs === 1 ? "pair" : "pairs"} to hand over at the door` });
  }

  return (
    <Panel title="Packages & extras">
      {rows.length === 0 ? (
        <p className="text-sm">Entry tickets only, no passes or extras.</p>
      ) : (
        <dl className="divide-y divide-line text-sm">
          {rows.map((row) => (
            <div key={row.label} className="flex flex-col gap-0.5 py-2.5 first:pt-0 last:pb-0 sm:flex-row sm:justify-between sm:gap-4">
              <dt className="font-medium text-heading">{row.label}</dt>
              <dd className="sm:text-right">{row.detail}</dd>
            </div>
          ))}
        </dl>
      )}
    </Panel>
  );
}

function PaymentMethod({ booking, timeZone }: { booking: AdminBooking; timeZone: string }) {
  const { payment, quote } = booking;
  const promoCode = quote.promo?.status === "APPLIED" ? quote.promo.code : null;

  let title: string;
  let detail: string | null = null;
  if (payment.method === "NOT_NEEDED") {
    title = "Nothing to pay";
    detail = promoCode ? `Covered in full by code ${promoCode}, so it was confirmed straight away.` : "Free booking, confirmed straight away.";
  } else if (payment.card) {
    const { card } = payment;
    title = `${titleCase(card.brand)} •••• ${card.last4}`;
    detail = [card.funding && titleCase(card.funding), `exp ${card.expiry}`, card.country, card.wallet && `via ${titleCase(card.wallet)}`].filter(Boolean).join(" · ");
  } else if (booking.status === "PENDING_PAYMENT") {
    title = "Waiting for payment";
    detail = booking.holdExpiresAt ? `On Stripe Checkout. Places are held until ${clockTime(booking.holdExpiresAt, timeZone)}.` : "On Stripe Checkout.";
  } else if (payment.lookupFailed) {
    title = "Card payment through Stripe";
    detail = "Card details couldn't be loaded from Stripe just now.";
  } else {
    title = "Not paid";
    detail = booking.status === "CANCELLED" ? "The customer left Stripe Checkout without paying." : "The hold ran out before the customer paid.";
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 rounded-xl bg-paper px-4 py-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-gold-deep ring-1 ring-inset ring-line">
          <Icon name="card" className="size-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-heading">{title}</p>
          {detail && <p className="text-sm">{detail}</p>}
          {payment.billingName && <p className="text-sm">Card holder: {payment.billingName}</p>}
        </div>
      </div>
      {payment.refundedCents > 0 && <Notice tone="warning">{formatCents(payment.refundedCents)} was refunded to the customer.</Notice>}
      {(payment.paymentIntentId || payment.checkoutSessionId || booking.checkoutUrl) && (
        <dl className="space-y-1.5 text-xs">
          {payment.paymentIntentId && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <dt>Stripe payment</dt>
              <dd className="flex flex-wrap items-center gap-1">
                <code className="rounded bg-paper px-1.5 py-0.5 text-heading">{payment.paymentIntentId}</code>
                {payment.dashboardUrl && <ExternalLink href={payment.dashboardUrl}>Stripe</ExternalLink>}
                {payment.receiptUrl && <ExternalLink href={payment.receiptUrl}>Receipt</ExternalLink>}
              </dd>
            </div>
          )}
          {payment.checkoutSessionId && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <dt>Checkout session</dt>
              <dd className="flex min-w-0 items-center gap-1">
                <code className="truncate rounded bg-paper px-1.5 py-0.5 text-heading">{payment.checkoutSessionId.slice(0, 24)}…</code>
                <CopyButton value={payment.checkoutSessionId} label="Copy" />
              </dd>
            </div>
          )}
          {booking.checkoutUrl && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <dt>Payment link for the customer</dt>
              <dd>
                <CopyButton value={booking.checkoutUrl} label="Copy link" />
              </dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
}

function PaymentPanel({ booking, timeZone }: { booking: AdminBooking; timeZone: string }) {
  const { quote, payment } = booking;
  const promo = quote.promo;
  return (
    <Panel
      title="Payment"
      aside={
        payment.method === "STRIPE_CHECKOUT" && payment.testMode ? (
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-heading">Stripe test mode</span>
        ) : null
      }
    >
      <PaymentMethod booking={booking} timeZone={timeZone} />
      <dl className="mt-4 divide-y divide-line text-sm">
        {quote.lines.map((line) => (
          <div key={line.productCode} className="flex justify-between gap-4 py-2.5">
            <dt>
              <span className="font-medium text-heading">{line.label}</span>
              <span className="block text-xs">
                {line.quantity} × {formatCents(line.unitPriceCents)} · {line.priceUnit}
              </span>
            </dt>
            <dd className="tabular-nums text-heading">{formatCents(line.amountCents)}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-4 py-2.5">
          <dt>Subtotal</dt>
          <dd className="tabular-nums text-heading">{formatCents(quote.subtotalCents)}</dd>
        </div>
        {promo && (
          <div className="flex justify-between gap-4 py-2.5">
            <dt className="min-w-0">
              <span className="flex flex-wrap items-center gap-2">
                <span className={`rounded-md px-1.5 py-0.5 text-xs font-bold tracking-wider ${promo.status === "APPLIED" ? "bg-success/10 text-success-on-cream" : "bg-body/10 text-body"}`}>
                  {promo.code}
                </span>
                <span className="font-medium text-heading">{promo.status === "APPLIED" ? "Code applied" : "Code entered, not applied"}</span>
              </span>
              <span className="mt-0.5 block text-xs">{promo.message}</span>
            </dt>
            <dd className={`tabular-nums ${promo.status === "APPLIED" ? "text-success-on-cream" : ""}`}>
              {promo.status === "APPLIED" ? `−${formatCents(quote.discountCents)}` : "–"}
            </dd>
          </div>
        )}
        <div className="flex justify-between gap-4 pt-3 text-base font-semibold text-heading">
          <dt>{booking.status === "CONFIRMED" ? "Total paid" : "Total"}</dt>
          <dd className="tabular-nums">{formatCents(quote.totalCents)}</dd>
        </div>
      </dl>
    </Panel>
  );
}

type Activity = { at: string | null; title: string; detail?: string; tone: "done" | "waiting" | "muted" };

function activityOf(booking: AdminBooking): Activity[] {
  const free = booking.payment.method === "NOT_NEEDED";
  const events: Activity[] = [{ at: booking.createdAt, title: "Booking started", detail: free ? undefined : "Places held while the customer pays", tone: "done" }];
  if (booking.confirmedAt) {
    events.push({ at: booking.confirmedAt, title: free ? "Confirmed, nothing to pay" : "Payment received", tone: "done" });
  }
  for (const person of booking.people) {
    for (const checkIn of person.checkIns) {
      events.push({ at: checkIn.at, title: `${person.firstName} checked in`, detail: `For ${shortDay(checkIn.day)}`, tone: "done" });
    }
  }
  events.sort((a, b) => (a.at ?? "").localeCompare(b.at ?? ""));

  if (booking.status === "PENDING_PAYMENT" && booking.holdExpiresAt) events.push({ at: booking.holdExpiresAt, title: "Hold ends if unpaid", tone: "waiting" });
  if (booking.status === "EXPIRED") events.push({ at: null, title: "Hold ran out before payment", detail: "Places went back on sale", tone: "muted" });
  if (booking.status === "CANCELLED") events.push({ at: null, title: "Cancelled before payment", detail: "Places went back on sale", tone: "muted" });
  if (booking.status === "REFUNDED") events.push({ at: null, title: "Refunded", detail: "Paid after the hold ended and the places had sold out", tone: "muted" });
  if (booking.status === "CONFIRMED") {
    const email = { SENT: "Confirmation email sent", FAILED: "Confirmation email failed", NOT_SENT: "Confirmation email not sent yet" }[booking.emailStatus];
    events.push({ at: null, title: email, detail: booking.booker.email, tone: booking.emailStatus === "SENT" ? "done" : "waiting" });
  }
  return events;
}

const DOT_STYLES: Record<Activity["tone"], string> = {
  done: "bg-success-on-cream ring-success/20",
  waiting: "bg-primary ring-primary/25",
  muted: "bg-body/50 ring-body/15",
};

function ActivityPanel({ booking, timeZone }: { booking: AdminBooking; timeZone: string }) {
  return (
    <Panel title="Activity">
      <ol className="relative space-y-4 before:absolute before:inset-y-1 before:left-[5px] before:w-px before:bg-line">
        {activityOf(booking).map((event, index) => (
          <li key={index} className="relative flex gap-3 pl-6">
            <span className={`absolute left-0 top-1.5 size-[11px] rounded-full ring-4 ${DOT_STYLES[event.tone]}`} />
            <div className="min-w-0 flex-1 text-sm">
              <div className="flex flex-wrap justify-between gap-x-3">
                <p className="font-medium text-heading">{event.title}</p>
                {event.at && <p className="text-xs">{dateTime(event.at, timeZone)}</p>}
              </div>
              {event.detail && <p className="truncate">{event.detail}</p>}
            </div>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

const CUSTOMER_PAGE_NOTES: Record<AdminBooking["status"], string> = {
  CONFIRMED: "The page the customer sees, with their QR code for the door. Share it if they've lost their confirmation email.",
  PENDING_PAYMENT: "The page the customer sees, with a button to finish paying.",
  EXPIRED: "The customer sees that this booking wasn't completed and can start a new one.",
  CANCELLED: "The customer sees that this booking wasn't completed and can start a new one.",
  REFUNDED: "The customer sees that their payment was refunded in full.",
};

function CustomerLink({ booking }: { booking: AdminBooking }) {
  return (
    <Panel title="Customer's booking page">
      <p className="text-sm">{CUSTOMER_PAGE_NOTES[booking.status]}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={booking.bookingPageUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-heading transition hover:bg-gold-bright"
        >
          Open their page
          <Icon name="external" className="size-3.5" />
        </a>
        <span className="inline-flex items-center rounded-lg border border-line px-1">
          <CopyButton value={booking.bookingPageUrl} label="Copy link" />
        </span>
      </div>
    </Panel>
  );
}

function DrawerSkeleton() {
  return (
    <div aria-busy="true" className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-20 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-36 rounded-2xl" />
      <Skeleton className="h-56 rounded-2xl" />
      <Skeleton className="h-44 rounded-2xl" />
    </div>
  );
}

type Props = { reference: string | null; passcode: string; festival: FestivalView; onClose: () => void; onUnauthorized: () => void };

export function BookingDrawer({ reference, passcode, festival, onClose, onUnauthorized }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [booking, setBooking] = useState<AdminBooking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkInError, setCheckInError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (reference && !element.open) element.showModal();
    if (!reference && element.open) element.close();
  }, [reference]);

  useEffect(() => {
    if (!reference) return;
    const controller = new AbortController();
    setBooking(null);
    setError(null);
    setCheckInError(null);
    api.adminBooking(reference, passcode, controller.signal).then(setBooking, (e: unknown) => {
      if (controller.signal.aborted) return;
      if (e instanceof ApiRequestError && e.status === 401) onUnauthorized();
      else setError(e instanceof Error ? e.message : "Couldn't load this booking");
    });
    return () => controller.abort();
  }, [reference, passcode, attempt]);

  function replaceCheckIns(personId: string, checkIns: AdminPerson["checkIns"]) {
    setBooking((current) => current && { ...current, people: current.people.map((p) => (p.id === personId ? { ...p, checkIns } : p)) });
  }

  async function changeCheckIn(person: AdminPerson, day: IsoDate, checkedIn: boolean) {
    if (!booking) return;
    const previous = person.checkIns;
    const others = previous.filter((entry) => entry.day !== day);
    replaceCheckIns(person.id, checkedIn ? [...others, { day, at: new Date().toISOString() }] : others);
    setCheckInError(null);
    try {
      await api.adminCheckIn({ reference: booking.reference, attendeeId: person.id, day, checkedIn }, passcode);
    } catch (e) {
      replaceCheckIns(person.id, previous);
      if (e instanceof ApiRequestError && e.status === 401) onUnauthorized();
      else setCheckInError(e instanceof Error ? e.message : "Couldn't save that check-in");
    }
  }

  const canCheckIn = booking?.status === "CONFIRMED";

  return (
    <dialog
      ref={dialog}
      aria-label={reference ? `Booking ${reference}` : "Booking"}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
      className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-dvh w-full max-w-2xl border-l border-line bg-paper p-0 text-body shadow-2xl backdrop:bg-heading/40 backdrop:backdrop-blur-[2px] open:animate-sheet-in"
    >
      {reference && (
        <div className="flex h-full flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-line bg-white px-4 py-4 sm:px-7 sm:py-5">
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider">Booking</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h2 className="text-2xl font-bold tracking-wide text-heading">{reference}</h2>
                {booking && <StatusBadge status={booking.status} />}
              </div>
              {booking && <p className="text-sm">Started {dateTime(booking.createdAt, festival.timeZone)}</p>}
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={() => dialog.current?.close()}
              className="grid size-10 shrink-0 place-items-center rounded-full text-heading transition hover:bg-paper"
            >
              <Icon name="close" className="size-5" />
            </button>
          </header>

          <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-7 sm:py-6">
            {error && (
              <Notice tone="error">
                {error}{" "}
                <button type="button" className="font-semibold underline" onClick={() => setAttempt((n) => n + 1)}>
                  Try again
                </button>
              </Notice>
            )}
            {!booking && !error && <DrawerSkeleton />}
            {booking && (
              <>
                <KeyFacts booking={booking} />
                <BookedBy booking={booking} />
                <Panel
                  title={`People · ${booking.people.length}`}
                  aside={<span className="text-xs">{canCheckIn ? "Select a day to check someone in" : "Check-in opens once paid"}</span>}
                >
                  {checkInError && (
                    <div className="mb-4">
                      <Notice tone="error">{checkInError}</Notice>
                    </div>
                  )}
                  <ul className="divide-y divide-line">
                    {booking.people.map((person) => (
                      <PersonRow key={person.id} person={person} booking={booking} festival={festival} canCheckIn={canCheckIn} onCheckIn={changeCheckIn} />
                    ))}
                  </ul>
                </Panel>
                <PackagesAndExtras booking={booking} />
                <PaymentPanel booking={booking} timeZone={festival.timeZone} />
                <ActivityPanel booking={booking} timeZone={festival.timeZone} />
                <CustomerLink booking={booking} />
              </>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}
