import { describe, expect, it } from "vitest";
import { QuoteRequestSchema } from "../src/index.js";
import {
  ADULT_DOB,
  CHILD_DOB,
  DURING_FESTIVAL,
  TODDLER_DOB,
  allDayPass,
  dayPass,
  finalQuote,
  issueCodes,
  noTicket,
  onFamilyPass,
  quote,
} from "./helpers.js";

const adult = (id: string, days = ["2026-11-11"]) => ({ id, dateOfBirth: ADULT_DOB, entry: dayPass(...days) });

describe("extras", () => {
  it("refuses dinner on a day the person isn't coming", () => {
    const result = quote({ attendees: [{ ...adult("a"), dinnerDays: ["2026-11-12"] }] });
    expect(issueCodes(result)).toEqual(["EXTRA_ON_DAY_NOT_ATTENDING"]);
  });

  it("refuses the workshop on a day it doesn't run", () => {
    const result = quote({ attendees: [{ ...adult("a", ["2026-11-12"]), workshopDays: ["2026-11-12"] }] });
    expect(issueCodes(result)).toEqual(["WORKSHOP_NOT_RUNNING"]);
  });

  it("caps dandiya sticks per booking", () => {
    expect(issueCodes(quote({ attendees: [adult("a")], dandiyaPairs: 21 }))).toEqual(["DANDIYA_LIMIT"]);
  });
});

describe("family pass", () => {
  it("needs exactly 2 adults and 2 children", () => {
    const result = quote({
      attendees: [
        { id: "a1", dateOfBirth: ADULT_DOB, entry: onFamilyPass("f") },
        { id: "a2", dateOfBirth: ADULT_DOB, entry: onFamilyPass("f") },
        { id: "teen", dateOfBirth: "2013-01-01", entry: onFamilyPass("f") },
        { id: "c1", dateOfBirth: CHILD_DOB, entry: onFamilyPass("f") },
      ],
      familyGroups: [{ id: "f", days: ["2026-11-10"] }],
    });
    expect(issueCodes(result)).toEqual(["FAMILY_PASS_COMPOSITION"]);
  });

  it("lets an extra child join on a Day Pass", () => {
    const result = quote({
      attendees: [
        { id: "a1", dateOfBirth: ADULT_DOB, entry: onFamilyPass("f") },
        { id: "a2", dateOfBirth: ADULT_DOB, entry: onFamilyPass("f") },
        { id: "c1", dateOfBirth: CHILD_DOB, entry: onFamilyPass("f") },
        { id: "c2", dateOfBirth: CHILD_DOB, entry: onFamilyPass("f") },
        { id: "c3", dateOfBirth: "2019-07-07", entry: dayPass("2026-11-10") },
        { id: "baby", dateOfBirth: TODDLER_DOB, entry: noTicket("2026-11-10") },
      ],
      familyGroups: [{ id: "f", days: ["2026-11-10"] }],
    });
    expect(result.canBook).toBe(true);
    expect(result.quote.totalCents).toBe(4000 + 800);
  });
});

describe("dates", () => {
  it("refuses days outside the festival", () => {
    expect(issueCodes(quote({ attendees: [adult("a", ["2026-11-09"])] }))).toEqual(["NOT_A_FESTIVAL_DAY"]);
  });

  it("refuses days that have already happened", () => {
    const result = quote({ attendees: [adult("a", ["2026-11-10", "2026-11-13"])] }, { now: DURING_FESTIVAL });
    expect(issueCodes(result)).toEqual(["DAY_ALREADY_PASSED"]);
  });

  it("sells a day until 11:59pm in Allen, even after midnight on the server's UTC clock", () => {
    const tuesday = { attendees: [adult("a", ["2026-11-10"])] };
    expect(quote(tuesday, { now: new Date("2026-11-11T01:30:00Z") }).canBook).toBe(true);
    expect(quote(tuesday, { now: new Date("2026-11-11T05:59:00Z") }).canBook).toBe(true);

    const afterMidnight = quote(tuesday, { now: new Date("2026-11-11T06:00:00Z") });
    expect(issueCodes(afterMidnight)).toEqual(["DAY_ALREADY_PASSED"]);
    expect(afterMidnight.issues[0].message).toBe(
      "Online booking for Tue, Nov 10 closed at midnight Central Time. To request a place, email ravi_chandra@jkyog.org.",
    );
  });

  it("stops selling All-Day Passes once the festival starts", () => {
    const result = quote({ attendees: [{ id: "c", dateOfBirth: CHILD_DOB, entry: allDayPass }] }, { now: DURING_FESTIVAL });
    expect(issueCodes(result)).toContain("ALL_DAY_PASS_OFF_SALE");
  });

  it("sells All-Day Passes until 11:59pm the night before the festival", () => {
    const child = { attendees: [{ id: "c", dateOfBirth: CHILD_DOB, entry: allDayPass }] };
    expect(issueCodes(quote(child, { now: new Date("2026-11-10T05:59:00Z") }))).not.toContain("ALL_DAY_PASS_OFF_SALE");
    expect(issueCodes(quote(child, { now: new Date("2026-11-10T06:00:00Z") }))).toContain("ALL_DAY_PASS_OFF_SALE");
  });

  it("rejects impossible dates before any rule runs", () => {
    const parsed = QuoteRequestSchema.safeParse({ attendees: [{ id: "a", dateOfBirth: "2026-02-30", entry: dayPass("2026-11-10") }] });
    expect(parsed.success).toBe(false);
  });
});

describe("stock", () => {
  it("sells the last 2 workshop places but not a third", () => {
    const two = quote({
      attendees: [
        { ...adult("a", ["2026-11-11"]), workshopDays: ["2026-11-11"] },
        { ...adult("b", ["2026-11-13"]), workshopDays: ["2026-11-13"] },
      ],
    });
    expect(two.canBook).toBe(true);

    const three = quote({
      attendees: [
        { ...adult("a", ["2026-11-11", "2026-11-13"]), workshopDays: ["2026-11-11", "2026-11-13"] },
        { ...adult("b", ["2026-11-13"]), workshopDays: ["2026-11-13"] },
      ],
    });
    expect(issueCodes(three)).toEqual(["NOT_ENOUGH_STOCK"]);
  });

  it("knows the All-Day Adult Pass is sold out", () => {
    expect(issueCodes(quote({ attendees: [{ id: "a", dateOfBirth: ADULT_DOB, entry: allDayPass }] }))).toEqual(["SOLD_OUT"]);
  });
});

describe("the party", () => {
  it("has nothing to book when everyone is under 5", () => {
    expect(issueCodes(quote({ attendees: [{ id: "b", dateOfBirth: TODDLER_DOB, entry: noTicket("2026-11-10") }] }))).toContain(
      "NOTHING_TO_BOOK",
    );
  });

  it("warns, but still allows, children with no adult in the booking", () => {
    const result = quote({ attendees: [{ id: "c", dateOfBirth: CHILD_DOB, entry: dayPass("2026-11-10") }] });
    expect(result.issues).toEqual([expect.objectContaining({ code: "CHILDREN_WITHOUT_ADULT", severity: "warning" })]);
    expect(result.canBook).toBe(true);
  });
});

describe("the person booking", () => {
  const contact = { email: "asha@example.com", phone: "+1 214 555 0100" };
  const named = (id: string, dateOfBirth: string) => ({ id, firstName: "Asha", lastName: "Patel", dateOfBirth, entry: dayPass("2026-11-10") });

  it("must be 18 on the day they book", () => {
    const result = finalQuote({
      attendees: [named("me", "2009-01-01")],
      booker: { attending: true, attendeeId: "me", ...contact },
      expectedTotalCents: 1500,
    });
    expect(issueCodes(result)).toContain("BOOKER_TOO_YOUNG");
  });

  it("can book for others without coming", () => {
    const result = finalQuote({
      attendees: [{ ...named("teen", "2010-05-05"), firstName: "Dev" }],
      booker: { attending: false, firstName: "Asha", lastName: "Patel", dateOfBirth: "1980-01-01", ...contact },
      expectedTotalCents: 1500,
    });
    expect(result.canBook).toBe(true);
  });

  it("spots the same person added twice", () => {
    const result = finalQuote({
      attendees: [named("one", ADULT_DOB), named("two", ADULT_DOB)],
      booker: { attending: true, attendeeId: "one", ...contact },
      expectedTotalCents: 3000,
    });
    expect(issueCodes(result)).toContain("DUPLICATE_PERSON");
  });
});
