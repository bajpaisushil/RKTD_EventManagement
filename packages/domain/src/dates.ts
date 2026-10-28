// Calendar dates are plain "YYYY-MM-DD" strings. They sort correctly as strings
// and never shift timezone.
export type IsoDate = string;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidDate(value: string): boolean {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function todayIn(timeZone: string, now: Date): IsoDate {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function toUtcNoon(date: IsoDate): Date {
  return new Date(`${date}T12:00:00Z`);
}

export function formatDay(date: IsoDate): string {
  return toUtcNoon(date).toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatLongDay(date: IsoDate): string {
  return toUtcNoon(date).toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const listFormat = new Intl.ListFormat("en", { style: "long", type: "conjunction" });

export function formatList(items: string[]): string {
  return listFormat.format(items);
}

export function formatDayList(days: IsoDate[]): string {
  return formatList([...days].sort().map(formatDay));
}
