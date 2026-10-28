import type { IsoDate } from "./dates.js";

export type AgeBand = "INFANT" | "CHILD" | "ADULT";
export type TicketBand = "CHILD" | "ADULT";

export type AgePolicy = {
  referenceDate: IsoDate;
  childFromAge: number;
  adultFromAge: number;
  bookerMinAge: number;
  guardianMinAge: number;
  maxAge: number;
};

export function ageOn(dateOfBirth: IsoDate, date: IsoDate): number {
  if (dateOfBirth > date) return 0;
  const years = Number(date.slice(0, 4)) - Number(dateOfBirth.slice(0, 4));
  const hadBirthday = date.slice(5) >= dateOfBirth.slice(5);
  return hadBirthday ? years : years - 1;
}

export function ageBand(age: number, policy: AgePolicy): AgeBand {
  if (age < policy.childFromAge) return "INFANT";
  if (age < policy.adultFromAge) return "CHILD";
  return "ADULT";
}

export function describeAgeBand(band: AgeBand, policy: AgePolicy): string {
  if (band === "INFANT") return `Under ${policy.childFromAge} · free`;
  if (band === "CHILD") return `Child · ${policy.childFromAge}–${policy.adultFromAge - 1}`;
  return `Adult · ${policy.adultFromAge}+`;
}
