import {
  EmailSchema,
  NameSchema,
  PhoneSchema,
  ageOn,
  isValidDate,
  todayIn,
  type BookingRequestBody,
  type Entry,
  type FestivalView,
  type QuoteRequestBody,
} from "@rktd/domain";
import { BOOKER_ID, bandOf, type Draft, type DraftPerson } from "./draft";

const FAMILY_GROUP_ID = "family";

function entryFor(person: DraftPerson, festival: FestivalView): Entry {
  if (bandOf(person, festival) === "INFANT") return { type: "NO_TICKET", days: person.days };
  if (person.pass === "ALL_DAY_PASS") return { type: "ALL_DAY_PASS" };
  if (person.pass === "FAMILY_PASS") return { type: "FAMILY_PASS", familyGroupId: FAMILY_GROUP_ID };
  return { type: "DAY_PASS", days: person.days };
}

function familyGroups(people: DraftPerson[], draft: Draft, festival: FestivalView) {
  const usesFamilyPass = people.some((p) => entryFor(p, festival).type === "FAMILY_PASS");
  return usesFamilyPass ? [{ id: FAMILY_GROUP_ID, days: draft.familyDays }] : [];
}

// Only people with a real date of birth can be priced, so the rest wait until it's typed.
export function toQuoteRequest(draft: Draft, festival: FestivalView): QuoteRequestBody {
  const people = draft.people.filter((p) => bandOf(p, festival) !== null);
  return {
    attendees: people.map((person) => ({
      id: person.id,
      firstName: NameSchema.safeParse(person.firstName).success ? person.firstName.trim() : undefined,
      dateOfBirth: person.dateOfBirth,
      entry: entryFor(person, festival),
      dinnerDays: person.dinnerDays,
      workshopDays: person.workshopDays,
    })),
    familyGroups: familyGroups(people, draft, festival),
    dandiyaPairs: draft.dandiyaPairs,
    promoCode: draft.promoCode,
  };
}

export function toBookingRequest(draft: Draft, festival: FestivalView, expectedTotalCents: number): BookingRequestBody {
  const { booker } = draft;
  return {
    attendees: draft.people.map((person) => ({
      id: person.id,
      firstName: person.firstName.trim(),
      lastName: person.lastName.trim(),
      dateOfBirth: person.dateOfBirth,
      entry: entryFor(person, festival),
      dinnerDays: person.dinnerDays,
      workshopDays: person.workshopDays,
    })),
    familyGroups: familyGroups(draft.people, draft, festival),
    dandiyaPairs: draft.dandiyaPairs,
    promoCode: draft.promoCode,
    booker: booker.attending
      ? { attending: true, attendeeId: BOOKER_ID, email: booker.email, phone: booker.phone }
      : {
          attending: false,
          firstName: booker.firstName.trim(),
          lastName: booker.lastName.trim(),
          dateOfBirth: booker.dateOfBirth,
          email: booker.email,
          phone: booker.phone,
        },
    expectedTotalCents,
  };
}

export type FieldErrors = Record<string, string>;

function dateOfBirthError(value: string, today: string): string | null {
  if (!value) return "Required";
  if (!isValidDate(value)) return "Enter a real date";
  if (value > today) return "That date is in the future";
  return null;
}

function firstError(result: { success: boolean; error?: { issues: { message: string }[] } }): string | null {
  return result.success ? null : (result.error?.issues[0]?.message ?? "Check this");
}

// Instant feedback for the "Who's coming" step. The server checks all of it again.
export function checkPeopleStep(draft: Draft, festival: FestivalView, now = new Date()): FieldErrors {
  const today = todayIn(festival.timeZone, now);
  const errors: FieldErrors = {};
  const add = (key: string, message: string | null) => {
    if (message) errors[key] = message;
  };

  const { booker } = draft;
  add("booker.firstName", firstError(NameSchema.safeParse(booker.firstName)));
  add("booker.lastName", firstError(NameSchema.safeParse(booker.lastName)));
  add("booker.email", firstError(EmailSchema.safeParse(booker.email)));
  add("booker.phone", firstError(PhoneSchema.safeParse(booker.phone)));
  const bookerDob = dateOfBirthError(booker.dateOfBirth, today);
  add("booker.dateOfBirth", bookerDob);
  if (!bookerDob && ageOn(booker.dateOfBirth, today) < festival.agePolicy.bookerMinAge) {
    add("booker.dateOfBirth", `The person paying needs to be ${festival.agePolicy.bookerMinAge} or over`);
  }

  for (const person of draft.people) {
    if (person.id === BOOKER_ID) continue;
    add(`${person.id}.firstName`, firstError(NameSchema.safeParse(person.firstName)));
    add(`${person.id}.lastName`, firstError(NameSchema.safeParse(person.lastName)));
    add(`${person.id}.dateOfBirth`, dateOfBirthError(person.dateOfBirth, today));
  }
  if (draft.people.length === 0) add("people", "Add at least one person who's coming");
  return errors;
}
