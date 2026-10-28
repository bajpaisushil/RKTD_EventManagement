import { ageOn } from "./age.js";
import type { FestivalConfig } from "./catalog.js";
import { formatDay, formatDayList, timeZoneName, type IsoDate } from "./dates.js";
import type { BookingRequest, QuoteRequest } from "./input.js";
import { attendee, error, familyPass, warning, type Issue } from "./issues.js";
import type { PartyMember } from "./party.js";

export type RuleFacts = {
  request: QuoteRequest;
  party: PartyMember[];
  festival: FestivalConfig;
  today: IsoDate;
};

export type BookingRuleFacts = RuleFacts & { request: BookingRequest };

function plural(count: number, word: string, pluralWord = `${word}s`): string {
  return `${count} ${count === 1 ? word : pluralWord}`;
}

function partySize({ party, festival }: RuleFacts): Issue[] {
  if (party.length === 0) {
    return [error("PARTY_EMPTY", "Add the people who are coming to the festival.")];
  }
  const issues: Issue[] = [];
  if (party.length > festival.maxAttendees) {
    issues.push(error("PARTY_TOO_LARGE", `One booking can include up to ${festival.maxAttendees} people, under-5s included. Please split a bigger group into more than one booking.`));
  }
  if (party.every((member) => member.band === "INFANT")) {
    const age = festival.agePolicy.childFromAge;
    issues.push(error("NOTHING_TO_BOOK", `Children under ${age} come in free without a ticket, so there's nothing to book yet. Add at least one person aged ${age} or over.`));
  }
  return issues;
}

function datesOfBirth({ party, festival, today }: RuleFacts): Issue[] {
  const issues: Issue[] = [];
  for (const member of party) {
    if (member.attendee.dateOfBirth > today) {
      issues.push(error("DATE_OF_BIRTH_IN_FUTURE", `${member.name}'s date of birth is in the future.`, attendee(member.attendee.id)));
    } else if (member.age > festival.agePolicy.maxAge) {
      issues.push(error("DATE_OF_BIRTH_UNLIKELY", `Please check ${member.name}'s date of birth. It would make them ${member.age}.`, attendee(member.attendee.id)));
    }
  }
  return issues;
}

function ticketMatchesAge({ party, festival }: RuleFacts): Issue[] {
  const firstDay = formatDay(festival.agePolicy.referenceDate);
  const issues: Issue[] = [];
  for (const member of party) {
    const hasTicket = member.attendee.entry.type !== "NO_TICKET";
    if (member.band === "INFANT" && hasTicket) {
      issues.push(error("TICKET_NOT_NEEDED", `${member.name} will be ${member.age} on ${firstDay}. Children under ${festival.agePolicy.childFromAge} come in free, so no ticket is needed.`, attendee(member.attendee.id)));
    }
    if (member.band !== "INFANT" && !hasTicket) {
      const kind = member.band === "CHILD" ? "a child" : "an adult";
      issues.push(error("TICKET_REQUIRED", `${member.name} will be ${member.age} on ${firstDay}, so needs ${kind} ticket.`, attendee(member.attendee.id)));
    }
  }
  return issues;
}

function daysPicked({ request, party }: RuleFacts): Issue[] {
  const issues: Issue[] = [];
  for (const member of party) {
    const entry = member.attendee.entry;
    if (entry.type === "DAY_PASS" && entry.days.length === 0) {
      issues.push(error("DAYS_REQUIRED", `Pick at least one day for ${member.name}'s Day Pass.`, attendee(member.attendee.id)));
    }
    if (entry.type === "NO_TICKET" && entry.days.length === 0) {
      issues.push(error("DAYS_REQUIRED", `Pick the days ${member.name} is coming.`, attendee(member.attendee.id)));
    }
  }
  for (const group of request.familyGroups) {
    if (group.days.length === 0) {
      issues.push(error("DAYS_REQUIRED", "Pick the day for this Family Pass.", familyPass(group.id)));
    }
  }
  return issues;
}

function dayProblem(day: IsoDate, festival: FestivalConfig, today: IsoDate): Issue | null {
  if (!festival.days.includes(day)) {
    const first = formatDay(festival.days[0]);
    const last = formatDay(festival.days[festival.days.length - 1]);
    return error("NOT_A_FESTIVAL_DAY", `${formatDay(day)} isn't a festival day. The festival runs from ${first} to ${last}.`);
  }
  if (day < today) {
    return error(
      "DAY_ALREADY_PASSED",
      `Online booking for ${formatDay(day)} closed at midnight ${timeZoneName(festival.timeZone)}. To request a place, email ${festival.contactEmail}.`,
    );
  }
  return null;
}

function daysAreBookable({ request, party, festival, today }: RuleFacts): Issue[] {
  const issues: Issue[] = [];
  for (const member of party) {
    const entry = member.attendee.entry;
    const entryDays = entry.type === "DAY_PASS" || entry.type === "NO_TICKET" ? entry.days : [];
    const allDays = new Set([...entryDays, ...member.attendee.dinnerDays, ...member.attendee.workshopDays]);
    for (const day of [...allDays].sort()) {
      const problem = dayProblem(day, festival, today);
      if (problem) issues.push({ ...problem, target: attendee(member.attendee.id) });
    }
  }
  for (const group of request.familyGroups) {
    for (const day of [...group.days].sort()) {
      const problem = dayProblem(day, festival, today);
      if (problem) issues.push({ ...problem, target: familyPass(group.id) });
    }
  }
  return issues;
}

// An All-Day Pass bought mid-festival would cost the full price for fewer days.
function allDayPassOnSale({ party, festival, today }: RuleFacts): Issue[] {
  if (today < festival.days[0]) return [];
  return party
    .filter((member) => member.attendee.entry.type === "ALL_DAY_PASS")
    .map((member) =>
      error("ALL_DAY_PASS_OFF_SALE", `All-Day Passes stop selling once the festival starts, as they'd only cover the days that are left. Please pick Day Passes for ${member.name} instead.`, attendee(member.attendee.id)),
    );
}

function familyPasses({ request, party, festival }: RuleFacts): Issue[] {
  const { adults, children } = festival.catalog.familyPass;
  const { childFromAge, adultFromAge } = festival.agePolicy;
  const issues: Issue[] = [];

  for (const member of party) {
    const entry = member.attendee.entry;
    if (entry.type === "FAMILY_PASS" && !request.familyGroups.some((group) => group.id === entry.familyGroupId)) {
      issues.push(error("FAMILY_PASS_NOT_FOUND", `${member.name} is on a Family Pass that isn't in this booking.`, attendee(member.attendee.id)));
    }
  }

  for (const group of request.familyGroups) {
    const members = party.filter((member) => member.attendee.entry.type === "FAMILY_PASS" && member.attendee.entry.familyGroupId === group.id);
    if (members.length === 0) {
      issues.push(error("FAMILY_PASS_EMPTY", "This Family Pass has nobody on it.", familyPass(group.id)));
      continue;
    }
    const adultCount = members.filter((member) => member.band === "ADULT").length;
    const childCount = members.filter((member) => member.band === "CHILD").length;
    if (adultCount !== adults || childCount !== children || members.length !== adults + children) {
      issues.push(
        error(
          "FAMILY_PASS_COMPOSITION",
          `A Family Pass covers exactly ${plural(adults, "adult")} (${adultFromAge}+) and ${plural(children, "child", "children")} (${childFromAge}–${adultFromAge - 1}). This one has ${plural(adultCount, "adult")} and ${plural(childCount, "child", "children")}.`,
          familyPass(group.id),
        ),
      );
    }
  }
  return issues;
}

function workshopRunsThatDay({ party, festival }: RuleFacts): Issue[] {
  const workshop = festival.catalog.garbaWorkshop;
  const issues: Issue[] = [];
  for (const member of party) {
    for (const day of member.attendee.workshopDays) {
      if (festival.days.includes(day) && !workshop.sessionDays.includes(day)) {
        issues.push(error("WORKSHOP_NOT_RUNNING", `The ${workshop.label} only runs on ${formatDayList(workshop.sessionDays)}.`, attendee(member.attendee.id)));
      }
    }
  }
  return issues;
}

function extrasOnlyOnDaysAttending({ party, festival }: RuleFacts): Issue[] {
  const { dinnerPlate, garbaWorkshop } = festival.catalog;
  const issues: Issue[] = [];
  for (const member of party) {
    const notComing = (day: IsoDate) => festival.days.includes(day) && !member.days.includes(day);
    for (const day of member.attendee.dinnerDays.filter(notComing)) {
      issues.push(error("EXTRA_ON_DAY_NOT_ATTENDING", `${member.name} isn't booked to come on ${formatDay(day)}, so can't have a ${dinnerPlate.label} that day.`, attendee(member.attendee.id)));
    }
    for (const day of member.attendee.workshopDays.filter((day) => garbaWorkshop.sessionDays.includes(day) && notComing(day))) {
      issues.push(error("EXTRA_ON_DAY_NOT_ATTENDING", `${member.name} isn't booked to come on ${formatDay(day)}, so can't join the ${garbaWorkshop.label} that day.`, attendee(member.attendee.id)));
    }
  }
  return issues;
}

function dandiyaLimit({ request, festival }: RuleFacts): Issue[] {
  const { maxPerBooking, label } = festival.catalog.dandiyaSticks;
  if (request.dandiyaPairs <= maxPerBooking) return [];
  return [error("DANDIYA_LIMIT", `You can buy up to ${maxPerBooking} ${label} per booking.`, { kind: "PRODUCT", productCode: "DANDIYA_STICKS" })];
}

function childrenHaveAnAdult({ party, festival }: RuleFacts): Issue[] {
  const { guardianMinAge } = festival.agePolicy;
  const childDays = new Set(party.filter((member) => member.band !== "ADULT").flatMap((member) => member.days));
  const daysWithoutAdult = [...childDays].filter(
    (day) => !party.some((member) => member.age >= guardianMinAge && member.days.includes(day)),
  );
  if (daysWithoutAdult.length === 0) return [];
  return [
    warning("CHILDREN_WITHOUT_ADULT", `Nobody aged ${guardianMinAge} or over is booked for ${formatDayList(daysWithoutAdult)}. Children need to be with an adult at the festival. That's fine if their adult has a separate booking.`),
  ];
}

function bookerIsOldEnough({ request, party, festival, today }: BookingRuleFacts): Issue[] {
  const booker = request.booker;
  const { bookerMinAge, maxAge } = festival.agePolicy;
  let dateOfBirth: IsoDate;

  if (booker.attending) {
    const member = party.find((m) => m.attendee.id === booker.attendeeId);
    if (!member) {
      return [error("BOOKER_NOT_IN_PARTY", "You've said you're coming, but you're not in the list of people.", { kind: "BOOKER" })];
    }
    dateOfBirth = member.attendee.dateOfBirth;
  } else {
    dateOfBirth = booker.dateOfBirth;
    if (dateOfBirth > today) {
      return [error("DATE_OF_BIRTH_IN_FUTURE", "Your date of birth is in the future.", { kind: "BOOKER" })];
    }
    if (ageOn(dateOfBirth, today) > maxAge) {
      return [error("DATE_OF_BIRTH_UNLIKELY", "Please check your date of birth.", { kind: "BOOKER" })];
    }
  }

  // The booker pays today, so their age is checked today, not on the festival's first day.
  if (ageOn(dateOfBirth, today) < bookerMinAge) {
    return [error("BOOKER_TOO_YOUNG", `The person booking needs to be ${bookerMinAge} or over, as they're the one paying. Please ask a parent or another adult to make the booking.`, { kind: "BOOKER" })];
  }
  return [];
}

function noDuplicatePeople({ request }: BookingRuleFacts): Issue[] {
  const clean = (name: string) => name.trim().replace(/\s+/g, " ").toLowerCase();
  const seen = new Set<string>();
  const issues: Issue[] = [];
  for (const person of request.attendees) {
    const key = `${clean(person.firstName)}|${clean(person.lastName)}|${person.dateOfBirth}`;
    if (seen.has(key)) {
      issues.push(error("DUPLICATE_PERSON", `${person.firstName} ${person.lastName} is listed twice with the same date of birth.`, attendee(person.id)));
    }
    seen.add(key);
  }
  return issues;
}

const QUOTE_RULES = [
  partySize,
  datesOfBirth,
  ticketMatchesAge,
  daysPicked,
  daysAreBookable,
  allDayPassOnSale,
  familyPasses,
  workshopRunsThatDay,
  extrasOnlyOnDaysAttending,
  dandiyaLimit,
  childrenHaveAnAdult,
];

const BOOKING_RULES = [bookerIsOldEnough, noDuplicatePeople];

export function checkQuoteRules(facts: RuleFacts): Issue[] {
  return QUOTE_RULES.flatMap((rule) => rule(facts));
}

export function checkBookingRules(facts: BookingRuleFacts): Issue[] {
  return [...checkQuoteRules(facts), ...BOOKING_RULES.flatMap((rule) => rule(facts))];
}
