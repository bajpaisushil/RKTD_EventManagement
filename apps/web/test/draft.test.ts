import { SHARAD_UTSAV_2026, festivalView } from "@rktd/domain";
import { describe, expect, it } from "vitest";
import { BOOKER_ID, createDraftReducer, emptyDraft, type Draft, type DraftAction } from "../src/booking/draft";
import { toQuoteRequest } from "../src/booking/requests";

const festival = festivalView(SHARAD_UTSAV_2026, { ALL_DAY_PASS_CHILD: 140, DAY_PASS_ADULT: 380, DAY_PASS_CHILD: 260 }, new Date("2026-10-28T15:00:00Z"));
const reduce = createDraftReducer(festival);
const run = (actions: DraftAction[], start: Draft = emptyDraft()) => actions.reduce(reduce, start);

const withFamily: DraftAction[] = [
  { type: "SET_BOOKER", field: "dateOfBirth", value: "1985-01-01" },
  { type: "ADD_PERSON", id: "kid" },
  { type: "SET_PERSON", id: "kid", field: "dateOfBirth", value: "2018-06-01" },
  { type: "ADD_PERSON", id: "baby" },
  { type: "SET_PERSON", id: "baby", field: "dateOfBirth", value: "2024-02-02" },
];

const sameDaysAsBooker = (...days: string[]): DraftAction[] => [
  { type: "SET_SAME_DAYS", on: true },
  ...days.map((day): DraftAction => ({ type: "TOGGLE_DAY", id: BOOKER_ID, day })),
];

describe("people and tickets stay matched", () => {
  it("prices one entry per person, and none for an under-5", () => {
    const draft = run([...withFamily, ...sameDaysAsBooker("2026-11-11")]);
    const request = toQuoteRequest(draft, festival);
    expect(request.attendees.map((a) => [a.id, a.entry.type])).toEqual([
      [BOOKER_ID, "DAY_PASS"],
      ["kid", "DAY_PASS"],
      ["baby", "NO_TICKET"],
    ]);
  });

  it("drops a removed person's ticket and extras with them", () => {
    const draft = run([
      ...withFamily,
      ...sameDaysAsBooker("2026-11-11"),
      { type: "TOGGLE_DINNER", id: "kid", day: "2026-11-11" },
      { type: "REMOVE_PERSON", id: "kid" },
    ]);
    expect(toQuoteRequest(draft, festival).attendees.map((a) => a.id)).toEqual([BOOKER_ID, "baby"]);
  });

  it("removes the booker's own ticket when they say they aren't coming", () => {
    const draft = run([...withFamily, { type: "SET_ATTENDING", attending: false }]);
    expect(draft.people.some((p) => p.id === BOOKER_ID)).toBe(false);
  });

  it("keeps the booker's card in step with their details", () => {
    const draft = run([{ type: "SET_BOOKER", field: "firstName", value: "Asha" }]);
    expect(draft.people.find((p) => p.id === BOOKER_ID)?.firstName).toBe("Asha");
  });

  it("drops dinner on a day that's no longer booked", () => {
    const draft = run([
      ...withFamily,
      { type: "TOGGLE_DAY", id: "kid", day: "2026-11-11" },
      { type: "TOGGLE_DAY", id: "kid", day: "2026-11-12" },
      { type: "TOGGLE_DINNER", id: "kid", day: "2026-11-12" },
      { type: "TOGGLE_DAY", id: "kid", day: "2026-11-12" },
    ]);
    expect(draft.people.find((p) => p.id === "kid")?.dinnerDays).toEqual([]);
  });

  it("drops a workshop place when the person switches to a day it doesn't run", () => {
    const draft = run([
      ...withFamily,
      { type: "TOGGLE_DAY", id: "kid", day: "2026-11-11" },
      { type: "TOGGLE_WORKSHOP", id: "kid", day: "2026-11-11" },
      { type: "TOGGLE_DAY", id: "kid", day: "2026-11-11" },
      { type: "TOGGLE_DAY", id: "kid", day: "2026-11-12" },
    ]);
    expect(draft.people.find((p) => p.id === "kid")?.workshopDays).toEqual([]);
  });

  it("forgets the Family Pass days once nobody is on it", () => {
    const draft = run([
      ...withFamily,
      { type: "SET_PASS", id: "kid", pass: "FAMILY_PASS" },
      { type: "TOGGLE_FAMILY_DAY", day: "2026-11-13" },
      { type: "SET_PASS", id: "kid", pass: "DAY_PASS" },
    ]);
    expect(draft.familyDays).toEqual([]);
    expect(toQuoteRequest(draft, festival).familyGroups).toEqual([]);
  });

  it("applies the server's 'switch to All-Day Pass' suggestion", () => {
    const draft = run([...withFamily, { type: "APPLY_SUGGESTION", change: { type: "SWITCH_TO_ALL_DAY_PASS", attendeeId: "kid" } }]);
    expect(draft.people.find((p) => p.id === "kid")?.pass).toBe("ALL_DAY_PASS");
  });

  it("waits for a real date of birth before pricing someone", () => {
    const draft = run([{ type: "ADD_PERSON", id: "new" }, { type: "SET_PERSON", id: "new", field: "dateOfBirth", value: "2018-02-30" }]);
    expect(toQuoteRequest(draft, festival).attendees).toEqual([]);
  });
});

describe("same days for everyone", () => {
  const daysOf = (draft: Draft, id: string) => draft.people.find((p) => p.id === id)?.days;

  it("gives everyone on a Day Pass, under-5s too, the booker's days, and keeps them in step", () => {
    const draft = run([...withFamily, ...sameDaysAsBooker("2026-11-11", "2026-11-13")]);
    expect([daysOf(draft, "kid"), daysOf(draft, "baby")]).toEqual([
      ["2026-11-11", "2026-11-13"],
      ["2026-11-11", "2026-11-13"],
    ]);

    const fewer = run([{ type: "TOGGLE_DAY", id: BOOKER_ID, day: "2026-11-13" }], draft);
    expect([daysOf(fewer, "kid"), daysOf(fewer, "baby")]).toEqual([["2026-11-11"], ["2026-11-11"]]);
  });

  it("gives someone added later the same days", () => {
    const draft = run([...withFamily, ...sameDaysAsBooker("2026-11-12"), { type: "ADD_PERSON", id: "gran" }]);
    expect(daysOf(draft, "gran")).toEqual(["2026-11-12"]);
  });

  it("leaves an All-Day Pass alone, and once unticked lets each person change their days", () => {
    const draft = run([
      ...withFamily,
      ...sameDaysAsBooker("2026-11-11", "2026-11-13"),
      { type: "SET_PASS", id: "kid", pass: "ALL_DAY_PASS" },
      { type: "SET_SAME_DAYS", on: false },
      { type: "TOGGLE_DAY", id: "baby", day: "2026-11-13" },
    ]);
    expect(toQuoteRequest(draft, festival).attendees.find((a) => a.id === "kid")?.entry.type).toBe("ALL_DAY_PASS");
    expect(daysOf(draft, "baby")).toEqual(["2026-11-11"]);
    expect(daysOf(draft, BOOKER_ID)).toEqual(["2026-11-11", "2026-11-13"]);
  });

  it("drops a follower's dinner when the booker drops that day", () => {
    const draft = run([
      ...withFamily,
      ...sameDaysAsBooker("2026-11-11", "2026-11-12"),
      { type: "TOGGLE_DINNER", id: "kid", day: "2026-11-12" },
      { type: "TOGGLE_DAY", id: BOOKER_ID, day: "2026-11-12" },
    ]);
    expect(draft.people.find((p) => p.id === "kid")?.dinnerDays).toEqual([]);
  });
});
