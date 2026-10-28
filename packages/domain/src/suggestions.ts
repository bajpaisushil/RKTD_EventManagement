import type { FestivalConfig } from "./catalog.js";
import { formatDayList, formatList, type IsoDate } from "./dates.js";
import type { QuoteAttendee, QuoteRequest } from "./input.js";
import { formatCents, type Cents } from "./money.js";
import type { PartyMember } from "./party.js";

export type SuggestedChange =
  | { type: "SWITCH_TO_ALL_DAY_PASS"; attendeeId: string }
  | { type: "USE_FAMILY_PASS"; attendeeIds: string[]; days: IsoDate[] }
  | { type: "SPLIT_FAMILY_PASS"; familyGroupId: string };

export type Suggestion = {
  change: SuggestedChange;
  savingsCents: Cents;
  message: string;
};

type Candidate = {
  change: SuggestedChange;
  message: (savings: string) => string;
};

export function applyChange(request: QuoteRequest, change: SuggestedChange): QuoteRequest {
  if (change.type === "SWITCH_TO_ALL_DAY_PASS") {
    return {
      ...request,
      attendees: request.attendees.map((a): QuoteAttendee =>
        a.id === change.attendeeId ? { ...a, entry: { type: "ALL_DAY_PASS" } } : a,
      ),
    };
  }

  if (change.type === "USE_FAMILY_PASS") {
    let n = request.familyGroups.length + 1;
    while (request.familyGroups.some((group) => group.id === `family-${n}`)) n++;
    const familyGroupId = `family-${n}`;
    return {
      ...request,
      familyGroups: [...request.familyGroups, { id: familyGroupId, days: change.days }],
      attendees: request.attendees.map((a): QuoteAttendee =>
        change.attendeeIds.includes(a.id) ? { ...a, entry: { type: "FAMILY_PASS", familyGroupId } } : a,
      ),
    };
  }

  const group = request.familyGroups.find((g) => g.id === change.familyGroupId);
  if (!group) return request;
  return {
    ...request,
    familyGroups: request.familyGroups.filter((g) => g.id !== group.id),
    attendees: request.attendees.map((a): QuoteAttendee =>
      a.entry.type === "FAMILY_PASS" && a.entry.familyGroupId === group.id
        ? { ...a, entry: { type: "DAY_PASS", days: group.days } }
        : a,
    ),
  };
}

function candidateChanges(request: QuoteRequest, party: PartyMember[], festival: FestivalConfig): Candidate[] {
  const { allDayPass, familyPass } = festival.catalog;
  const candidates: Candidate[] = [];
  const onDayPasses = party.filter((m) => m.band !== "INFANT" && m.attendee.entry.type === "DAY_PASS");

  for (const member of onDayPasses) {
    if (member.band === "INFANT") continue;
    const pass = allDayPass[member.band];
    candidates.push({
      change: { type: "SWITCH_TO_ALL_DAY_PASS", attendeeId: member.attendee.id },
      message: (savings) =>
        `${member.name} is coming on ${member.days.length} days. An ${pass.label} covers all five days for ${formatCents(pass.priceCents)}, saving ${savings}.`,
    });
  }

  const byDays = new Map<string, PartyMember[]>();
  for (const member of onDayPasses) {
    const key = member.days.join(",");
    byDays.set(key, [...(byDays.get(key) ?? []), member]);
  }
  for (const members of byDays.values()) {
    const adults = members.filter((m) => m.band === "ADULT").slice(0, familyPass.adults);
    const children = members.filter((m) => m.band === "CHILD").slice(0, familyPass.children);
    if (adults.length < familyPass.adults || children.length < familyPass.children) continue;
    const chosen = [...adults, ...children];
    const days = chosen[0].days;
    candidates.push({
      change: { type: "USE_FAMILY_PASS", attendeeIds: chosen.map((m) => m.attendee.id), days },
      message: (savings) =>
        `${formatList(chosen.map((m) => m.name))} are all coming on ${formatDayList(days)}. Sharing a ${familyPass.label} would save ${savings}.`,
    });
  }

  for (const group of request.familyGroups) {
    const members = party.filter((m) => m.attendee.entry.type === "FAMILY_PASS" && m.attendee.entry.familyGroupId === group.id);
    if (members.length === 0) continue;
    candidates.push({
      change: { type: "SPLIT_FAMILY_PASS", familyGroupId: group.id },
      message: (savings) =>
        `Separate passes for ${formatList(members.map((m) => m.name))} cost less than the ${familyPass.label} here, saving ${savings}.`,
    });
  }

  return candidates;
}

// Each candidate is re-priced with the real pricing code, so a suggestion can
// never promise a saving the checkout wouldn't give.
export function findCheaperOptions(
  request: QuoteRequest,
  party: PartyMember[],
  festival: FestivalConfig,
  currentTotal: Cents,
  priceOf: (request: QuoteRequest) => { totalCents: Cents; canBook: boolean },
): Suggestion[] {
  const suggestions: Suggestion[] = [];
  for (const candidate of candidateChanges(request, party, festival)) {
    const result = priceOf(applyChange(request, candidate.change));
    const savingsCents = currentTotal - result.totalCents;
    if (result.canBook && savingsCents > 0) {
      suggestions.push({ change: candidate.change, savingsCents, message: candidate.message(formatCents(savingsCents)) });
    }
  }
  return suggestions.sort((a, b) => b.savingsCents - a.savingsCents);
}
