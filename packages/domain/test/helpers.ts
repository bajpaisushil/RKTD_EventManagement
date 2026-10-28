import {
  BookingRequestSchema,
  QuoteRequestSchema,
  SHARAD_UTSAV_2026,
  quoteBooking,
  quoteFinalBooking,
  type BookingRequestBody,
  type PromoCode,
  type QuoteContext,
  type QuoteRequestBody,
  type StockLevels,
} from "../src/index.js";

export const festival = SHARAD_UTSAV_2026;

export const BEFORE_FESTIVAL = new Date("2026-10-28T15:00:00Z");
export const DURING_FESTIVAL = new Date("2026-11-12T15:00:00Z");

export const STOCK_FROM_BRIEF: StockLevels = {
  DAY_PASS_ADULT: 380,
  DAY_PASS_CHILD: 260,
  ALL_DAY_PASS_ADULT: 0,
  ALL_DAY_PASS_CHILD: 140,
  FAMILY_PASS: 95,
  DANDIYA_STICKS: 900,
  DINNER_PLATE: 1700,
  GARBA_WORKSHOP: 2,
};

export const PROMOS: Record<string, PromoCode> = {
  SEVA10: { code: "SEVA10", rule: { type: "PERCENT_OFF", percent: 10 }, validFrom: null, validUntil: null, maxRedemptions: null },
  FLAT20: { code: "FLAT20", rule: { type: "AMOUNT_OFF", amountCents: 2000 }, validFrom: null, validUntil: null, maxRedemptions: null },
  KIDSFREE: { code: "KIDSFREE", rule: { type: "FREE_CHILD_TICKETS" }, validFrom: null, validUntil: null, maxRedemptions: null },
  EXPIRED5: {
    code: "EXPIRED5",
    rule: { type: "PERCENT_OFF", percent: 5 },
    validFrom: null,
    validUntil: new Date("2026-10-01T05:00:00Z"),
    maxRedemptions: null,
  },
  MAXEDOUT: { code: "MAXEDOUT", rule: { type: "PERCENT_OFF", percent: 15 }, validFrom: null, validUntil: null, maxRedemptions: 50 },
};

type Options = { now?: Date; stock?: StockLevels; promoUses?: number };

function contextFor(promoCode: string | null, options: Options): QuoteContext {
  const now = options.now ?? BEFORE_FESTIVAL;
  const promo = promoCode
    ? { code: promoCode, promo: PROMOS[promoCode] ?? null, timesUsed: options.promoUses ?? 0, now, timeZone: festival.timeZone }
    : null;
  return { festival, now, promo, stockLeft: options.stock ?? STOCK_FROM_BRIEF };
}

export function quote(body: QuoteRequestBody, options: Options = {}) {
  const request = QuoteRequestSchema.parse(body);
  return quoteBooking(request, contextFor(request.promoCode, options));
}

export function finalQuote(body: BookingRequestBody, options: Options = {}) {
  const request = BookingRequestSchema.parse(body);
  return quoteFinalBooking(request, contextFor(request.promoCode, options));
}

export function issueCodes(result: { issues: { code: string }[] }): string[] {
  return result.issues.map((issue) => issue.code);
}

export const ADULT_DOB = "1985-06-15";
export const CHILD_DOB = "2018-03-02";
export const TODDLER_DOB = "2023-01-20";

export const dayPass = (...days: string[]) => ({ type: "DAY_PASS" as const, days });
export const allDayPass = { type: "ALL_DAY_PASS" as const };
export const onFamilyPass = (familyGroupId: string) => ({ type: "FAMILY_PASS" as const, familyGroupId });
export const noTicket = (...days: string[]) => ({ type: "NO_TICKET" as const, days });
