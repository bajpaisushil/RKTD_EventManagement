import { ageBand, ageOn, isValidDate, type AgeBand, type FestivalView, type IsoDate, type SuggestedChange } from "@rktd/domain";

export type PassChoice = "DAY_PASS" | "ALL_DAY_PASS" | "FAMILY_PASS";

export type Step = "people" | "tickets" | "extras" | "review";
export const STEPS: Step[] = ["people", "tickets", "extras", "review"];

export type DraftPerson = {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  pass: PassChoice;
  days: IsoDate[];
  dinnerDays: IsoDate[];
  workshopDays: IsoDate[];
};

export type DraftBooker = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  attending: boolean;
};

export type Draft = {
  step: Step;
  booker: DraftBooker;
  people: DraftPerson[];
  sameDays: boolean;
  familyDays: IsoDate[];
  dandiyaPairs: number;
  promoCode: string | null;
};

// When the booker is coming, they're also the first person in `people`, under this id.
export const BOOKER_ID = "booker";

export type DraftAction =
  | { type: "SET_BOOKER"; field: "firstName" | "lastName" | "email" | "phone" | "dateOfBirth"; value: string }
  | { type: "SET_ATTENDING"; attending: boolean }
  | { type: "ADD_PERSON"; id: string }
  | { type: "REMOVE_PERSON"; id: string }
  | { type: "SET_PERSON"; id: string; field: "firstName" | "lastName" | "dateOfBirth"; value: string }
  | { type: "SET_PASS"; id: string; pass: PassChoice }
  | { type: "TOGGLE_DAY"; id: string; day: IsoDate }
  | { type: "SET_SAME_DAYS"; on: boolean }
  | { type: "TOGGLE_FAMILY_DAY"; day: IsoDate }
  | { type: "TOGGLE_DINNER"; id: string; day: IsoDate }
  | { type: "TOGGLE_WORKSHOP"; id: string; day: IsoDate }
  | { type: "SET_DANDIYA"; pairs: number }
  | { type: "SET_PROMO"; code: string | null }
  | { type: "APPLY_SUGGESTION"; change: SuggestedChange }
  | { type: "GO_TO"; step: Step }
  | { type: "RESTORE"; draft: Draft };

function newPerson(id: string): DraftPerson {
  return { id, firstName: "", lastName: "", dateOfBirth: "", pass: "DAY_PASS", days: [], dinnerDays: [], workshopDays: [] };
}

export function emptyDraft(): Draft {
  return {
    step: "people",
    booker: { firstName: "", lastName: "", email: "", phone: "", dateOfBirth: "", attending: true },
    people: [newPerson(BOOKER_ID)],
    sameDays: false,
    familyDays: [],
    dandiyaPairs: 0,
    promoCode: null,
  };
}

export function bandOf(person: DraftPerson, festival: FestivalView): AgeBand | null {
  if (!isValidDate(person.dateOfBirth)) return null;
  return ageBand(ageOn(person.dateOfBirth, festival.agePolicy.referenceDate), festival.agePolicy);
}

export function daysComing(person: DraftPerson, draft: Draft, festival: FestivalView): IsoDate[] {
  if (bandOf(person, festival) === "INFANT" || person.pass === "DAY_PASS") return person.days;
  if (person.pass === "ALL_DAY_PASS") return festival.days.map((day) => day.date);
  return draft.familyDays;
}

function toggle(days: IsoDate[], day: IsoDate): IsoDate[] {
  return days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort();
}

function updatePerson(draft: Draft, id: string, change: (person: DraftPerson) => DraftPerson): Draft {
  return { ...draft, people: draft.people.map((person) => (person.id === id ? change(person) : person)) };
}

function applySuggestion(draft: Draft, change: SuggestedChange): Draft {
  switch (change.type) {
    case "SWITCH_TO_ALL_DAY_PASS":
      return updatePerson(draft, change.attendeeId, (p) => ({ ...p, pass: "ALL_DAY_PASS" }));
    case "USE_FAMILY_PASS":
      return {
        ...draft,
        familyDays: change.days,
        people: draft.people.map((p) => (change.attendeeIds.includes(p.id) ? { ...p, pass: "FAMILY_PASS" } : p)),
      };
    case "SPLIT_FAMILY_PASS":
      return {
        ...draft,
        familyDays: [],
        people: draft.people.map((p) => (p.pass === "FAMILY_PASS" ? { ...p, pass: "DAY_PASS", days: draft.familyDays } : p)),
      };
  }
}

function apply(draft: Draft, action: DraftAction): Draft {
  switch (action.type) {
    case "SET_BOOKER":
      return { ...draft, booker: { ...draft.booker, [action.field]: action.value } };
    case "SET_ATTENDING": {
      const others = draft.people.filter((p) => p.id !== BOOKER_ID);
      return {
        ...draft,
        booker: { ...draft.booker, attending: action.attending },
        people: action.attending ? [newPerson(BOOKER_ID), ...others] : others,
      };
    }
    case "ADD_PERSON":
      return { ...draft, people: [...draft.people, newPerson(action.id)] };
    case "REMOVE_PERSON":
      if (action.id === BOOKER_ID) return apply(draft, { type: "SET_ATTENDING", attending: false });
      return { ...draft, people: draft.people.filter((p) => p.id !== action.id) };
    case "SET_PERSON":
      return updatePerson(draft, action.id, (p) => ({ ...p, [action.field]: action.value }));
    case "SET_PASS":
      return updatePerson(draft, action.id, (p) => ({ ...p, pass: action.pass }));
    case "TOGGLE_DAY":
      return updatePerson(draft, action.id, (p) => ({ ...p, days: toggle(p.days, action.day) }));
    case "SET_SAME_DAYS":
      return { ...draft, sameDays: action.on };
    case "TOGGLE_FAMILY_DAY":
      return { ...draft, familyDays: toggle(draft.familyDays, action.day) };
    case "TOGGLE_DINNER":
      return updatePerson(draft, action.id, (p) => ({ ...p, dinnerDays: toggle(p.dinnerDays, action.day) }));
    case "TOGGLE_WORKSHOP":
      return updatePerson(draft, action.id, (p) => ({ ...p, workshopDays: toggle(p.workshopDays, action.day) }));
    case "SET_DANDIYA":
      return { ...draft, dandiyaPairs: Math.max(0, Math.floor(action.pairs)) };
    case "SET_PROMO":
      return { ...draft, promoCode: action.code };
    case "APPLY_SUGGESTION":
      return applySuggestion(draft, action.change);
    case "GO_TO":
      return { ...draft, step: action.step };
    case "RESTORE":
      return action.draft;
  }
}

// Runs after every change, so the draft can't drift into an impossible state:
// the booker's own card mirrors their details, with "same days" ticked everyone
// on a Day Pass follows the first person's days, and nobody keeps a dinner or
// workshop on a day they're no longer coming.
function tidy(draft: Draft, festival: FestivalView): Draft {
  const synced = draft.people.map((person) =>
    person.id === BOOKER_ID
      ? { ...person, firstName: draft.booker.firstName, lastName: draft.booker.lastName, dateOfBirth: draft.booker.dateOfBirth }
      : person,
  );
  const lead = synced[0];
  const leadDays = draft.sameDays && lead ? daysComing(lead, draft, festival) : null;
  const people = synced.map((person) => {
    const withDays =
      leadDays && person !== lead && (bandOf(person, festival) === "INFANT" || person.pass === "DAY_PASS") ? { ...person, days: leadDays } : person;
    const coming = daysComing(withDays, draft, festival);
    return {
      ...withDays,
      dinnerDays: withDays.dinnerDays.filter((day) => coming.includes(day)),
      workshopDays: withDays.workshopDays.filter((day) => coming.includes(day) && festival.workshopDays.includes(day)),
    };
  });
  const anyoneOnFamilyPass = people.some((p) => p.pass === "FAMILY_PASS" && bandOf(p, festival) !== "INFANT");
  return { ...draft, people, familyDays: anyoneOnFamilyPass ? draft.familyDays : [] };
}

export function createDraftReducer(festival: FestivalView) {
  return (draft: Draft, action: DraftAction): Draft => tidy(apply(draft, action), festival);
}
