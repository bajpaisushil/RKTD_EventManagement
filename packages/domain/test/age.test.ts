import { describe, expect, it } from "vitest";
import { ageBand, ageOn } from "../src/index.js";
import { CHILD_DOB, dayPass, festival, noTicket, quote } from "./helpers.js";

describe("ageOn", () => {
  it("counts a birthday on the day itself", () => {
    expect(ageOn("2018-11-10", "2026-11-10")).toBe(8);
  });

  it("does not count a birthday that is still to come", () => {
    expect(ageOn("2018-11-11", "2026-11-10")).toBe(7);
  });

  it("treats 29 February birthdays as 1 March in other years", () => {
    expect(ageOn("2016-02-29", "2026-02-28")).toBe(9);
    expect(ageOn("2016-02-29", "2026-03-01")).toBe(10);
  });

  it("gives 0 for someone not yet born", () => {
    expect(ageOn("2026-11-12", "2026-11-10")).toBe(0);
  });
});

describe("age bands", () => {
  const policy = festival.agePolicy;

  it.each([
    [0, "INFANT"],
    [4, "INFANT"],
    [5, "CHILD"],
    [11, "CHILD"],
    [12, "ADULT"],
    [90, "ADULT"],
  ])("age %i is %s", (age, band) => {
    expect(ageBand(age, policy)).toBe(band);
  });
});

describe("age is taken on the first festival day", () => {
  it("prices a child who turns 12 mid-festival as a child for every day", () => {
    const result = quote({
      attendees: [{ id: "a", dateOfBirth: "2014-11-12", entry: dayPass("2026-11-10", "2026-11-14") }],
    });
    expect(result.quote.lines).toEqual([expect.objectContaining({ productCode: "DAY_PASS_CHILD", quantity: 2 })]);
  });

  it("lets a child who turns 5 mid-festival in free", () => {
    const result = quote({
      attendees: [
        { id: "parent", dateOfBirth: "1990-01-01", entry: dayPass("2026-11-11") },
        { id: "kid", dateOfBirth: "2021-11-11", entry: noTicket("2026-11-11") },
      ],
    });
    expect(result.canBook).toBe(true);
    expect(result.quote.totalCents).toBe(1500);
  });

  it("refuses a ticket for an under-5", () => {
    const result = quote({
      attendees: [
        { id: "parent", dateOfBirth: "1990-01-01", entry: dayPass("2026-11-11") },
        { id: "toddler", dateOfBirth: "2023-05-01", entry: dayPass("2026-11-11") },
      ],
    });
    expect(result.issues.map((issue) => issue.code)).toContain("TICKET_NOT_NEEDED");
    expect(result.canBook).toBe(false);
  });

  it("refuses to let a child through without a ticket", () => {
    const result = quote({ attendees: [{ id: "kid", dateOfBirth: CHILD_DOB, entry: noTicket("2026-11-11") }] });
    expect(result.issues.map((issue) => issue.code)).toContain("TICKET_REQUIRED");
  });
});
