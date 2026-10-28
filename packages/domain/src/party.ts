import { ageBand, ageOn, type AgeBand } from "./age.js";
import type { FestivalConfig } from "./catalog.js";
import type { IsoDate } from "./dates.js";
import type { QuoteAttendee, QuoteRequest } from "./input.js";

export type PartyMember = {
  attendee: QuoteAttendee;
  name: string;
  age: number;
  band: AgeBand;
  days: IsoDate[];
};

export function daysAttending(attendee: QuoteAttendee, request: QuoteRequest, festival: FestivalConfig): IsoDate[] {
  const entry = attendee.entry;
  if (entry.type === "ALL_DAY_PASS") return [...festival.days];
  if (entry.type === "FAMILY_PASS") {
    const group = request.familyGroups.find((g) => g.id === entry.familyGroupId);
    return group ? [...group.days].sort() : [];
  }
  return [...entry.days].sort();
}

// Ages for tickets are taken on the festival's reference date (its first day).
export function resolveParty(request: QuoteRequest, festival: FestivalConfig): PartyMember[] {
  return request.attendees.map((attendee, index) => {
    const age = ageOn(attendee.dateOfBirth, festival.agePolicy.referenceDate);
    return {
      attendee,
      name: attendee.firstName ?? `Person ${index + 1}`,
      age,
      band: ageBand(age, festival.agePolicy),
      days: daysAttending(attendee, request, festival),
    };
  });
}
