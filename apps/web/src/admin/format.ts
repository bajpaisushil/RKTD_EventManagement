import type { AgeBand, BookingStatus, IsoDate } from "@rktd/domain";

export const STATUS_LABELS: Record<BookingStatus, string> = {
  CONFIRMED: "Confirmed",
  PENDING_PAYMENT: "Awaiting payment",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

export function bandLabel(band: AgeBand, childFromAge: number): string {
  return { ADULT: "Adult", CHILD: "Child", INFANT: `Under ${childFromAge}` }[band];
}

function atNoonUtc(date: IsoDate): Date {
  return new Date(`${date}T12:00:00Z`);
}

export function shortDay(date: IsoDate): string {
  const day = atNoonUtc(date);
  return `${day.toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short" })} ${day.getUTCDate()}`;
}

export function birthDate(date: IsoDate): string {
  return atNoonUtc(date).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" });
}

export function calendarDate(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleDateString("en-US", { timeZone, month: "short", day: "numeric" });
}

export function clockTime(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { timeZone, hour: "numeric", minute: "2-digit" });
}

export function dateTime(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export function titleCase(value: string): string {
  return value
    .split(/[_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}
