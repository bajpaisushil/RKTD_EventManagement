import { allProducts, type PromoRule } from "@rktd/domain";
import { pool } from "../db.js";
import { festival } from "../festival.js";

export const STARTING_STOCK: Record<string, number> = {
  DAY_PASS_ADULT: 380,
  DAY_PASS_CHILD: 260,
  ALL_DAY_PASS_ADULT: 0,
  ALL_DAY_PASS_CHILD: 140,
  FAMILY_PASS: 95,
  DANDIYA_STICKS: 900,
  DINNER_PLATE: 1700,
  GARBA_WORKSHOP: 2,
};

type PromoSeed = {
  code: string;
  rule: PromoRule;
  validUntil?: string;
  maxRedemptions?: number;
  previousRedemptions?: number;
};

// The brief doesn't say what EXPIRED5 and MAXEDOUT took off, as they can never apply.
export const PROMO_CODES: PromoSeed[] = [
  { code: "SEVA10", rule: { type: "PERCENT_OFF", percent: 10 } },
  { code: "FLAT20", rule: { type: "AMOUNT_OFF", amountCents: 2000 } },
  { code: "KIDSFREE", rule: { type: "FREE_CHILD_TICKETS" } },
  { code: "EXPIRED5", rule: { type: "PERCENT_OFF", percent: 5 }, validUntil: "2026-10-01T05:00:00Z" },
  { code: "MAXEDOUT", rule: { type: "PERCENT_OFF", percent: 15 }, maxRedemptions: 100, previousRedemptions: 100 },
];

export async function seed(): Promise<void> {
  for (const product of allProducts(festival.catalog)) {
    const units = STARTING_STOCK[product.stockKey];
    if (units === undefined) throw new Error(`No starting stock for ${product.stockKey}`);
    // "do nothing" so re-running the seed never resets stock that's already been sold.
    await pool.query(
      "insert into inventory (stock_key, starting_units) values ($1, $2) on conflict (stock_key) do nothing",
      [product.stockKey, units],
    );
  }

  for (const promo of PROMO_CODES) {
    await pool.query(
      `insert into promo_codes (code, rule, valid_until, max_redemptions, previous_redemptions)
       values ($1, $2, $3, $4, $5)
       on conflict (code) do update set
         rule = excluded.rule,
         valid_until = excluded.valid_until,
         max_redemptions = excluded.max_redemptions,
         previous_redemptions = excluded.previous_redemptions`,
      [promo.code, promo.rule, promo.validUntil ?? null, promo.maxRedemptions ?? null, promo.previousRedemptions ?? 0],
    );
  }
  console.log("Seeded stock and promo codes");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await seed();
  await pool.end();
}
