import type { Product } from "./catalog.js";
import { formatLongDay, todayIn } from "./dates.js";
import { formatCents, percentOf, type Cents } from "./money.js";

export type PromoRule =
  | { type: "PERCENT_OFF"; percent: number }
  | { type: "AMOUNT_OFF"; amountCents: Cents }
  | { type: "FREE_CHILD_TICKETS" };

export type PromoCode = {
  code: string;
  rule: PromoRule;
  validFrom: Date | null;
  validUntil: Date | null;
  maxRedemptions: number | null;
};

export type PromoCheck = {
  code: string;
  promo: PromoCode | null;
  timesUsed: number;
  now: Date;
  timeZone: string;
};

export type PromoResult =
  | { status: "APPLIED"; code: string; discountCents: Cents; message: string }
  | {
      status: "NO_EFFECT" | "EXPIRED" | "NOT_STARTED" | "USED_UP" | "NOT_FOUND";
      code: string;
      message: string;
    };

export type PricedLine = { product: Product; quantity: number; amountCents: Cents };

export function normalizePromoCode(input: string | null): string | null {
  const code = (input ?? "").trim().toUpperCase();
  return code === "" ? null : code;
}

function discountFor(rule: PromoRule, lines: PricedLine[], subtotal: Cents): Cents {
  switch (rule.type) {
    case "PERCENT_OFF":
      return percentOf(subtotal, rule.percent);
    case "AMOUNT_OFF":
      return Math.min(rule.amountCents, subtotal);
    case "FREE_CHILD_TICKETS":
      return lines
        .filter((line) => line.product.ticketBand === "CHILD")
        .reduce((sum, line) => sum + line.amountCents, 0);
  }
}

function appliedMessage(code: string, rule: PromoRule, subtotal: Cents): string {
  switch (rule.type) {
    case "PERCENT_OFF":
      return `${code} applied: ${rule.percent}% off your whole booking.`;
    case "AMOUNT_OFF":
      return rule.amountCents > subtotal
        ? `${code} applied: ${formatCents(rule.amountCents)} off. Your booking came to less than that, so it's now free.`
        : `${code} applied: ${formatCents(rule.amountCents)} off your booking.`;
    case "FREE_CHILD_TICKETS":
      return `${code} applied: child tickets are free. It doesn't cover the Family Pass or extras.`;
  }
}

function noEffectMessage(code: string, rule: PromoRule): string {
  if (rule.type === "FREE_CHILD_TICKETS") {
    return `${code} makes child tickets free, but there are no child Day or All-Day passes in this booking. A Family Pass isn't a child ticket.`;
  }
  return `${code} will apply once there's something in your booking.`;
}

export function applyPromo(check: PromoCheck, lines: PricedLine[], subtotal: Cents): PromoResult {
  const { code, promo, now } = check;

  if (!promo) {
    return { status: "NOT_FOUND", code, message: `"${code}" isn't a code we recognise. Check the spelling, or remove it to carry on.` };
  }
  if (promo.validFrom && now < promo.validFrom) {
    const starts = formatLongDay(todayIn(check.timeZone, promo.validFrom));
    return { status: "NOT_STARTED", code, message: `${code} isn't active yet. It starts on ${starts}.` };
  }
  if (promo.validUntil && now >= promo.validUntil) {
    const lastDay = formatLongDay(todayIn(check.timeZone, new Date(promo.validUntil.getTime() - 1)));
    return { status: "EXPIRED", code, message: `${code} expired on ${lastDay}, so it can't be used any more.` };
  }
  if (promo.maxRedemptions !== null && check.timesUsed >= promo.maxRedemptions) {
    return { status: "USED_UP", code, message: `${code} has already been used as many times as it allows, so it can't be applied.` };
  }

  const discountCents = discountFor(promo.rule, lines, subtotal);
  if (discountCents === 0) {
    return { status: "NO_EFFECT", code, message: noEffectMessage(code, promo.rule) };
  }
  return { status: "APPLIED", code, discountCents, message: appliedMessage(code, promo.rule, subtotal) };
}
