"use client";

import type { BookingStatus, IsoDate } from "@rktd/domain";
import { useState, type ReactNode } from "react";
import { STATUS_LABELS, shortDay } from "./format";

const ICONS = {
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  close: <path d="M18 6 6 18M6 6l12 12" />,
  check: <path d="M20 6 9 17l-5-5" />,
  external: <path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />,
  copy: (
    <>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </>
  ),
  mail: (
    <>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 6L2 7" />
    </>
  ),
  phone: (
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" />
  ),
  refresh: (
    <>
      <path d="M21 12a9 9 0 1 1-2.6-6.4L21 8" />
      <path d="M21 3v5h-5" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  chevron: <path d="m6 9 6 6 6-6" />,
  card: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </>
  ),
};

export type IconName = keyof typeof ICONS;

export function Icon({ name, className = "size-4" }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      {ICONS[name]}
    </svg>
  );
}

const STATUS_STYLES: Record<BookingStatus, string> = {
  CONFIRMED: "bg-success/10 text-success-on-cream ring-success/25",
  PENDING_PAYMENT: "bg-primary/15 text-heading ring-primary/35",
  EXPIRED: "bg-body/8 text-body ring-body/20",
  CANCELLED: "bg-body/8 text-body ring-body/20",
  REFUNDED: "bg-error/8 text-error-on-cream ring-error/25",
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${STATUS_STYLES[status]}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {STATUS_LABELS[status]}
    </span>
  );
}

export function DayChips({ days, festivalDays }: { days: IsoDate[]; festivalDays: IsoDate[] }) {
  if (days.length === 0) return <span className="text-sm text-body">–</span>;
  if (days.length === festivalDays.length) {
    return <span className="rounded-md bg-primary/15 px-2 py-0.5 text-xs font-semibold text-heading">All {days.length} days</span>;
  }
  return (
    <span className="flex flex-wrap gap-1">
      {days.map((day) => (
        <span key={day} className="rounded-md bg-paper px-1.5 py-0.5 text-xs font-medium text-heading ring-1 ring-inset ring-line">
          {shortDay(day)}
        </span>
      ))}
    </span>
  );
}

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-gold-deep transition hover:bg-primary/10"
    >
      <Icon name={copied ? "check" : "copy"} className="size-3.5" />
      <span aria-live="polite">{copied ? "Copied" : label}</span>
    </button>
  );
}

export function Panel({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
        <h3 className="text-sm font-semibold text-heading">{title}</h3>
        {aside}
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

export function Skeleton({ className }: { className: string }) {
  return <span className={`block animate-pulse rounded-md bg-body/10 ${className}`} />;
}
