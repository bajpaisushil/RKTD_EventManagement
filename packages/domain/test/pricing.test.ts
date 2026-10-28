import { describe, expect, it } from "vitest";
import { percentOf } from "../src/index.js";
import {
  ADULT_DOB,
  CHILD_DOB,
  TODDLER_DOB,
  allDayPass,
  dayPass,
  noTicket,
  onFamilyPass,
  quote,
} from "./helpers.js";

const family = (familyGroupId = "fam") => [
  { id: "mum", dateOfBirth: ADULT_DOB, entry: onFamilyPass(familyGroupId) },
  { id: "dad", dateOfBirth: "1983-02-10", entry: onFamilyPass(familyGroupId) },
  { id: "kid1", dateOfBirth: CHILD_DOB, entry: onFamilyPass(familyGroupId) },
  { id: "kid2", dateOfBirth: "2020-09-09", entry: onFamilyPass(familyGroupId) },
];

describe("ticket prices", () => {
  it.each([
    ["adult, 1 day", ADULT_DOB, dayPass("2026-11-10"), 1500],
    ["adult, 3 days", ADULT_DOB, dayPass("2026-11-10", "2026-11-11", "2026-11-12"), 4500],
    ["child, 2 days", CHILD_DOB, dayPass("2026-11-10", "2026-11-14"), 1600],
    ["child, all days", CHILD_DOB, allDayPass, 3000],
  ])("%s", (_, dateOfBirth, entry, expected) => {
    expect(quote({ attendees: [{ id: "a", dateOfBirth, entry }] }).quote.totalCents).toBe(expected);
  });

  it("charges a Family Pass once per day for the four people on it", () => {
    const oneDay = quote({ attendees: family(), familyGroups: [{ id: "fam", days: ["2026-11-12"] }] });
    expect(oneDay.canBook).toBe(true);
    expect(oneDay.quote.totalCents).toBe(4000);

    const twoDays = quote({ attendees: family(), familyGroups: [{ id: "fam", days: ["2026-11-12", "2026-11-13"] }] });
    expect(twoDays.quote.totalCents).toBe(8000);
  });

  it("lets under-5s in free but charges for their dinner", () => {
    const result = quote({
      attendees: [
        { id: "mum", dateOfBirth: ADULT_DOB, entry: dayPass("2026-11-10") },
        { id: "baby", dateOfBirth: TODDLER_DOB, entry: noTicket("2026-11-10"), dinnerDays: ["2026-11-10"] },
      ],
    });
    expect(result.quote.totalCents).toBe(1500 + 1200);
  });

  it("prices a mixed booking line by line", () => {
    const result = quote({
      attendees: [
        { id: "a", dateOfBirth: ADULT_DOB, entry: dayPass("2026-11-11", "2026-11-13"), dinnerDays: ["2026-11-11"], workshopDays: ["2026-11-13"] },
        { id: "c", dateOfBirth: CHILD_DOB, entry: allDayPass, dinnerDays: ["2026-11-11", "2026-11-12"] },
        { id: "t", dateOfBirth: TODDLER_DOB, entry: noTicket("2026-11-11") },
      ],
      dandiyaPairs: 3,
    });
    expect(result.quote.lines.map((line) => [line.productCode, line.quantity, line.amountCents])).toEqual([
      ["DAY_PASS_ADULT", 2, 3000],
      ["ALL_DAY_PASS_CHILD", 1, 3000],
      ["DANDIYA_STICKS", 3, 1500],
      ["DINNER_PLATE", 3, 3600],
      ["GARBA_WORKSHOP", 1, 2000],
    ]);
    expect(result.quote.subtotalCents).toBe(13100);
    expect(result.quote.totalCents).toBe(13100);
  });
});

describe("promo codes", () => {
  const adultTwoDays = { id: "a", dateOfBirth: ADULT_DOB, entry: dayPass("2026-11-10", "2026-11-11") };
  const childTwoDays = { id: "c", dateOfBirth: CHILD_DOB, entry: dayPass("2026-11-10", "2026-11-11"), dinnerDays: ["2026-11-10"] };

  it("SEVA10 takes 10% off the whole booking, extras included", () => {
    const result = quote({ attendees: [adultTwoDays, childTwoDays], dandiyaPairs: 1, promoCode: "SEVA10" });
    expect(result.quote.subtotalCents).toBe(3000 + 1600 + 1200 + 500);
    expect(result.quote.discountCents).toBe(630);
    expect(result.quote.totalCents).toBe(5670);
  });

  it("rounds percentages half-up to the cent", () => {
    expect(percentOf(1235, 10)).toBe(124);
    expect(percentOf(1234, 10)).toBe(123);
    expect(percentOf(14670, 10)).toBe(1467);
  });

  it("FLAT20 takes $20 off", () => {
    const result = quote({ attendees: [adultTwoDays], promoCode: "FLAT20", dandiyaPairs: 1 });
    expect(result.quote.totalCents).toBe(3500 - 2000);
  });

  it("FLAT20 never takes the total below zero", () => {
    const result = quote({ attendees: [{ id: "a", dateOfBirth: ADULT_DOB, entry: dayPass("2026-11-10") }], promoCode: "FLAT20" });
    expect(result.quote.discountCents).toBe(1500);
    expect(result.quote.totalCents).toBe(0);
  });

  it("KIDSFREE frees child tickets only, not adults or the child's dinner", () => {
    const result = quote({ attendees: [adultTwoDays, childTwoDays], promoCode: "KIDSFREE" });
    expect(result.quote.discountCents).toBe(1600);
    expect(result.quote.totalCents).toBe(3000 + 1200);
  });

  it("KIDSFREE frees an All-Day Child Pass", () => {
    const result = quote({
      attendees: [adultTwoDays, { id: "c", dateOfBirth: CHILD_DOB, entry: allDayPass }],
      promoCode: "KIDSFREE",
    });
    expect(result.quote.discountCents).toBe(3000);
  });

  it("KIDSFREE does not discount a Family Pass, and says why", () => {
    const result = quote({ attendees: family(), familyGroups: [{ id: "fam", days: ["2026-11-12"] }], promoCode: "KIDSFREE" });
    expect(result.quote.promo?.status).toBe("NO_EFFECT");
    expect(result.quote.totalCents).toBe(4000);
  });

  it("EXPIRED5 is recognised but refused, with the date it ended", () => {
    const result = quote({ attendees: [adultTwoDays], promoCode: "EXPIRED5" });
    expect(result.quote.promo?.status).toBe("EXPIRED");
    expect(result.quote.promo?.message).toContain("September 30, 2026");
    expect(result.quote.totalCents).toBe(3000);
  });

  it("MAXEDOUT is refused once its uses run out", () => {
    const result = quote({ attendees: [adultTwoDays], promoCode: "MAXEDOUT" }, { promoUses: 50 });
    expect(result.quote.promo?.status).toBe("USED_UP");
    expect(result.quote.totalCents).toBe(3000);
  });

  it("an unknown code changes nothing", () => {
    const result = quote({ attendees: [adultTwoDays], promoCode: "FREESTUFF" });
    expect(result.quote.promo?.status).toBe("NOT_FOUND");
    expect(result.quote.totalCents).toBe(3000);
  });

  it("codes are matched without caring about case or spaces", () => {
    const result = quote({ attendees: [adultTwoDays], promoCode: "  seva10 " });
    expect(result.quote.promo?.status).toBe("APPLIED");
  });
});

describe("totals are always whole cents", () => {
  it("never produces a fraction of a cent across many combinations", () => {
    const codes = [null, "SEVA10", "FLAT20", "KIDSFREE"];
    for (let adults = 0; adults <= 3; adults++) {
      for (let children = 0; children <= 3; children++) {
        for (const promoCode of codes) {
          const attendees = [
            ...Array.from({ length: adults }, (_, i) => ({ id: `a${i}`, dateOfBirth: ADULT_DOB, entry: dayPass("2026-11-10", "2026-11-12"), dinnerDays: ["2026-11-10"] })),
            ...Array.from({ length: children }, (_, i) => ({ id: `c${i}`, dateOfBirth: CHILD_DOB, entry: dayPass("2026-11-12") })),
          ];
          const { quote: q } = quote({ attendees, promoCode, dandiyaPairs: adults });
          expect(Number.isInteger(q.totalCents)).toBe(true);
          expect(q.totalCents).toBeGreaterThanOrEqual(0);
          expect(q.totalCents).toBe(q.subtotalCents - q.discountCents);
        }
      }
    }
  });
});
