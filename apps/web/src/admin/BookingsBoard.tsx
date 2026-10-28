"use client";

import { BOOKING_STATUSES, formatCents, type AdminBookingList, type AdminBookingSummary, type BookingStatus, type FestivalView } from "@rktd/domain";
import { useEffect, useMemo, useRef, useState } from "react";
import { Notice } from "@/components/ui";
import { ApiRequestError, api, type AdminFilters } from "@/lib/api";
import { BookingDrawer } from "./BookingDrawer";
import { STATUS_LABELS, calendarDate, clockTime } from "./format";
import { DayChips, Icon, Skeleton, StatusBadge } from "./parts";

const NO_FILTERS: AdminFilters = { q: "", status: null, day: null };

const COLUMNS = "lg:grid-cols-[9.5rem_minmax(0,1.7fr)_4.5rem_minmax(0,1.4fr)_7rem_9rem_6.5rem]";

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

function bookingInUrl(): string | null {
  return new URLSearchParams(window.location.search).get("booking");
}

function showBookingInUrl(reference: string | null): void {
  const url = new URL(window.location.href);
  if (reference) url.searchParams.set("booking", reference);
  else url.searchParams.delete("booking");
  window.history.replaceState(null, "", url);
}

function Stats({ stats }: { stats: AdminBookingList["stats"] | null }) {
  const cards = [
    { label: "Confirmed bookings", value: stats?.confirmedBookings, hint: "Paid, or free with a code" },
    { label: "People booked", value: stats?.peopleBooked, hint: "Across confirmed bookings" },
    { label: "Revenue", value: stats && formatCents(stats.revenueCents), hint: "After discounts" },
    { label: "Awaiting payment", value: stats?.awaitingPayment, hint: "Places held right now" },
  ];
  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="relative overflow-hidden rounded-2xl border border-line bg-white p-4 before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-linear-to-r before:from-gold-bright/80 before:to-primary/30 sm:p-5"
        >
          <dt className="text-xs font-semibold uppercase tracking-wider">{card.label}</dt>
          <dd className="mt-2 font-serif text-3xl font-semibold lining-nums tabular-nums text-heading sm:text-4xl">
            {card.value === undefined || card.value === null ? <Skeleton className="h-9 w-20" /> : card.value}
          </dd>
          <dd className="mt-1 text-xs">{card.hint}</dd>
        </div>
      ))}
    </dl>
  );
}

function StatusTabs({ counts, selected, onSelect }: { counts: Record<BookingStatus, number> | null; selected: BookingStatus | null; onSelect: (status: BookingStatus | null) => void }) {
  const all = counts ? Object.values(counts).reduce((sum, count) => sum + count, 0) : null;
  const tabs: { status: BookingStatus | null; label: string; count: number | null }[] = [
    { status: null, label: "All", count: all },
    ...BOOKING_STATUSES.map((status) => ({ status, label: STATUS_LABELS[status], count: counts?.[status] ?? null })),
  ];
  return (
    <div role="group" aria-label="Filter by status" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-5 sm:px-5">
      {tabs.map((tab) => {
        const on = tab.status === selected;
        return (
          <button
            key={tab.label}
            type="button"
            aria-pressed={on}
            onClick={() => onSelect(tab.status)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              on ? "bg-heading text-white shadow-sm" : "bg-paper text-heading ring-1 ring-inset ring-line hover:bg-cream"
            }`}
          >
            {tab.label}
            {tab.count !== null && (
              <span className={`rounded-full px-1.5 text-xs tabular-nums ${on ? "bg-white/20" : "bg-white text-body ring-1 ring-inset ring-line"}`}>{tab.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function BookingRow({ booking, festival, onOpen }: { booking: AdminBookingSummary; festival: FestivalView; onOpen: () => void }) {
  const festivalDays = festival.days.map((day) => day.date);
  const people = `${booking.peopleCount} ${booking.peopleCount === 1 ? "person" : "people"}`;
  return (
    <li>
      <button type="button" onClick={onOpen} className="group w-full px-4 py-4 text-left transition hover:bg-paper focus-visible:bg-paper sm:px-5">
        <div className="space-y-2 lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold tracking-wide text-heading">{booking.reference}</span>
            <StatusBadge status={booking.status} />
          </div>
          <div>
            <p className="font-medium text-heading">{booking.bookerName}</p>
            <p className="truncate text-sm">{booking.bookerEmail}</p>
          </div>
          <div className="flex items-end justify-between gap-3">
            <div className="space-y-1.5 text-sm">
              <p>
                {people} · {calendarDate(booking.createdAt, festival.timeZone)}
              </p>
              <DayChips days={booking.days} festivalDays={festivalDays} />
            </div>
            <p className="text-right font-semibold tabular-nums text-heading">
              {formatCents(booking.totalCents)}
              {booking.promoCode && <span className="block text-xs font-medium text-gold-deep">{booking.promoCode}</span>}
            </p>
          </div>
        </div>

        <div className={`hidden lg:grid lg:items-center lg:gap-4 ${COLUMNS}`}>
          <span className="font-semibold tracking-wide text-heading group-hover:text-gold-deep">{booking.reference}</span>
          <span className="min-w-0">
            <span className="block truncate font-medium text-heading">{booking.bookerName}</span>
            <span className="block truncate text-sm">{booking.bookerEmail}</span>
          </span>
          <span className="tabular-nums text-heading">{booking.peopleCount}</span>
          <DayChips days={booking.days} festivalDays={festivalDays} />
          <span className="text-right">
            <span className="block font-semibold tabular-nums text-heading">{formatCents(booking.totalCents)}</span>
            {booking.promoCode && <span className="block text-xs font-medium text-gold-deep">{booking.promoCode}</span>}
          </span>
          <span>
            <StatusBadge status={booking.status} />
          </span>
          <span className="text-sm">
            <span className="block text-heading">{calendarDate(booking.createdAt, festival.timeZone)}</span>
            <span className="block text-xs">{clockTime(booking.createdAt, festival.timeZone)}</span>
          </span>
        </div>
      </button>
    </li>
  );
}

function LoadingRows() {
  return (
    <ul aria-hidden="true" className="divide-y divide-line">
      {Array.from({ length: 6 }, (_, index) => (
        <li key={index} className={`grid gap-3 px-4 py-5 sm:px-5 lg:items-center lg:gap-4 ${COLUMNS}`}>
          <Skeleton className="h-4 w-28" />
          <span className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-52" />
          </span>
          <Skeleton className="hidden h-4 w-6 lg:block" />
          <Skeleton className="hidden h-5 w-32 lg:block" />
          <Skeleton className="hidden h-4 w-16 justify-self-end lg:block" />
          <Skeleton className="hidden h-5 w-24 lg:block" />
          <Skeleton className="hidden h-4 w-14 lg:block" />
        </li>
      ))}
    </ul>
  );
}

function EmptyState({ filtered, onClear }: { filtered: boolean; onClear: () => void }) {
  return (
    <div className="px-6 py-16 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-paper text-gold-deep ring-1 ring-inset ring-line">
        <Icon name="search" className="size-5" />
      </span>
      <p className="mt-4 font-semibold text-heading">{filtered ? "No bookings match" : "No bookings yet"}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm">
        {filtered ? "Try a booking reference, a name, an email address, a phone number or a promo code." : "Bookings appear here as soon as someone starts paying."}
      </p>
      {filtered && (
        <button type="button" onClick={onClear} className="mt-4 rounded-lg px-3 py-2 text-sm font-semibold text-gold-deep underline underline-offset-4 hover:bg-primary/10">
          Clear search and filters
        </button>
      )}
    </div>
  );
}

export function BookingsBoard({ passcode, festival, onUnauthorized }: { passcode: string; festival: FestivalView; onUnauthorized: () => void }) {
  const [filters, setFilters] = useState<AdminFilters>(NO_FILTERS);
  const search = useDebounced(filters.q.trim(), 250);
  const active = useMemo<AdminFilters>(() => ({ q: search, status: filters.status, day: filters.day }), [search, filters.status, filters.day]);
  const [refreshes, setRefreshes] = useState(0);
  const [list, setList] = useState<AdminBookingList | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const listVersion = useRef(0);
  const searchInput = useRef<HTMLInputElement>(null);

  function handleError(e: unknown) {
    if (e instanceof ApiRequestError && e.status === 401) onUnauthorized();
    else setError(e instanceof Error ? e.message : "Couldn't load bookings");
  }

  useEffect(() => {
    const version = ++listVersion.current;
    const controller = new AbortController();
    setLoading(true);
    api.adminBookings(active, 0, passcode, controller.signal).then(
      (result) => {
        setList(result);
        setError(null);
        setLoading(false);
      },
      (e: unknown) => {
        if (controller.signal.aborted || version !== listVersion.current) return;
        handleError(e);
        setLoading(false);
      },
    );
    return () => controller.abort();
  }, [active, passcode, refreshes]);

  useEffect(() => {
    setSelected(bookingInUrl());
    function focusSearch(event: KeyboardEvent) {
      const typing = event.target instanceof HTMLElement && event.target.closest("input, textarea, select, [contenteditable]");
      if (event.key === "/" && !typing && !document.querySelector("dialog[open]")) {
        event.preventDefault();
        searchInput.current?.focus();
      }
    }
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  function open(reference: string | null) {
    setSelected(reference);
    showBookingInUrl(reference);
  }

  async function loadMore() {
    if (!list) return;
    const version = listVersion.current;
    setLoadingMore(true);
    try {
      const next = await api.adminBookings(active, list.bookings.length, passcode);
      if (version === listVersion.current) setList((current) => current && { ...next, bookings: [...current.bookings, ...next.bookings] });
    } catch (e) {
      handleError(e);
    } finally {
      setLoadingMore(false);
    }
  }

  const filtered = Boolean(filters.q.trim() || filters.status || filters.day);
  const bookings = list?.bookings ?? [];

  return (
    <>
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-4xl font-semibold text-heading sm:text-5xl">Bookings</h1>
            <p className="mt-1 text-sm">Every booking, paid or not. Select one to see its people, extras, payment and check-ins.</p>
          </div>
          <button
            type="button"
            onClick={() => setRefreshes((n) => n + 1)}
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium text-heading shadow-sm transition hover:bg-cream"
          >
            <Icon name="refresh" className={`size-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <Stats stats={list?.stats ?? null} />

        <section aria-label="Bookings" className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgb(41_25_0/0.04)]">
          <div className="space-y-4 border-b border-line p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="relative flex-1">
                <span className="sr-only">Search bookings</span>
                <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-body/70" />
                <input
                  ref={searchInput}
                  type="search"
                  autoComplete="off"
                  placeholder="Name, email, phone, reference, code"
                  value={filters.q}
                  onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
                  className="h-11 w-full rounded-xl border border-line bg-paper/60 pl-10 pr-3 text-heading sm:pr-10 placeholder:text-body focus:border-gold focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/20"
                />
                <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-line bg-white px-1.5 font-sans text-xs text-body sm:block">/</kbd>
              </label>
              <label className="relative sm:w-48">
                <span className="sr-only">Festival day</span>
                <select
                  value={filters.day ?? ""}
                  onChange={(event) => setFilters((current) => ({ ...current, day: event.target.value || null }))}
                  className="h-11 w-full appearance-none rounded-xl border border-line bg-paper/60 pl-3.5 pr-10 text-heading focus:border-gold focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/20"
                >
                  <option value="">All festival days</option>
                  {festival.days.map((day) => (
                    <option key={day.date} value={day.date}>
                      Coming {day.label}
                    </option>
                  ))}
                </select>
                <Icon name="chevron" className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-body" />
              </label>
            </div>
            <StatusTabs counts={list?.statusCounts ?? null} selected={filters.status} onSelect={(status) => setFilters((current) => ({ ...current, status }))} />
          </div>

          {error && (
            <div className="border-b border-line p-4 sm:px-5">
              <Notice tone="error">{error}</Notice>
            </div>
          )}

          <div className={`hidden border-b border-line bg-paper/70 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider lg:grid lg:gap-4 ${COLUMNS}`}>
            <span>Reference</span>
            <span>Booked by</span>
            <span>People</span>
            <span>Days</span>
            <span className="text-right">Total</span>
            <span>Status</span>
            <span>Booked (CT)</span>
          </div>

          {!list && loading && <LoadingRows />}
          {list && bookings.length === 0 && <EmptyState filtered={filtered} onClear={() => setFilters(NO_FILTERS)} />}
          {bookings.length > 0 && (
            <ul aria-busy={loading} className={`divide-y divide-line transition-opacity ${loading ? "opacity-60" : ""}`}>
              {bookings.map((booking) => (
                <BookingRow key={booking.reference} booking={booking} festival={festival} onOpen={() => open(booking.reference)} />
              ))}
            </ul>
          )}

          {list && bookings.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-paper/50 px-4 py-3 text-sm sm:px-5">
              <p aria-live="polite">
                Showing <span className="font-semibold text-heading">{bookings.length}</span> of <span className="font-semibold text-heading">{list.total}</span>{" "}
                {list.total === 1 ? "booking" : "bookings"}
              </p>
              {bookings.length < list.total && (
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="rounded-lg border border-line bg-white px-4 py-2 font-medium text-heading transition hover:bg-cream disabled:opacity-60"
                >
                  {loadingMore ? "Loading…" : "Load more"}
                </button>
              )}
            </div>
          )}
        </section>
      </main>

      <BookingDrawer reference={selected} passcode={passcode} festival={festival} onClose={() => open(null)} onUnauthorized={onUnauthorized} />
    </>
  );
}
