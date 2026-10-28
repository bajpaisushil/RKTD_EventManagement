import { describe, expect, it } from "vitest";
import { ADULT_DOB, CHILD_DOB, allDayPass, dayPass, onFamilyPass, quote } from "./helpers.js";

const fourDays = ["2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13"];
const allFiveDays = [...fourDays, "2026-11-14"];

describe("cheaper options", () => {
  it("suggests an All-Day Child Pass when Day Passes cost more", () => {
    const result = quote({
      attendees: [
        { id: "mum", dateOfBirth: ADULT_DOB, entry: allDayPass },
        { id: "kid", dateOfBirth: CHILD_DOB, entry: dayPass(...fourDays) },
      ],
    }, { stock: { DAY_PASS_ADULT: 380, DAY_PASS_CHILD: 260, ALL_DAY_PASS_ADULT: 5, ALL_DAY_PASS_CHILD: 140 } });
    expect(result.suggestions).toEqual([
      expect.objectContaining({ change: { type: "SWITCH_TO_ALL_DAY_PASS", attendeeId: "kid" }, savingsCents: 200 }),
    ]);
  });

  it("does not suggest the sold-out All-Day Adult Pass", () => {
    const result = quote({ attendees: [{ id: "a", dateOfBirth: ADULT_DOB, entry: dayPass(...allFiveDays) }] });
    expect(result.suggestions).toEqual([]);
  });

  it("suggests a Family Pass for 2 adults and 2 children coming on the same day", () => {
    const result = quote({
      attendees: [
        { id: "a1", dateOfBirth: ADULT_DOB, entry: dayPass("2026-11-12") },
        { id: "a2", dateOfBirth: ADULT_DOB, entry: dayPass("2026-11-12") },
        { id: "c1", dateOfBirth: CHILD_DOB, entry: dayPass("2026-11-12") },
        { id: "c2", dateOfBirth: CHILD_DOB, entry: dayPass("2026-11-12") },
      ],
    });
    expect(result.suggestions).toEqual([
      expect.objectContaining({ change: expect.objectContaining({ type: "USE_FAMILY_PASS" }), savingsCents: 600 }),
    ]);
  });

  it("suggests splitting a Family Pass when KIDSFREE makes separate passes cheaper", () => {
    const result = quote({
      attendees: [
        { id: "a1", dateOfBirth: ADULT_DOB, entry: onFamilyPass("f") },
        { id: "a2", dateOfBirth: ADULT_DOB, entry: onFamilyPass("f") },
        { id: "c1", dateOfBirth: CHILD_DOB, entry: onFamilyPass("f") },
        { id: "c2", dateOfBirth: CHILD_DOB, entry: onFamilyPass("f") },
      ],
      familyGroups: [{ id: "f", days: ["2026-11-12"] }],
      promoCode: "KIDSFREE",
    });
    expect(result.suggestions).toEqual([
      expect.objectContaining({ change: { type: "SPLIT_FAMILY_PASS", familyGroupId: "f" }, savingsCents: 1000 }),
    ]);
  });
});
