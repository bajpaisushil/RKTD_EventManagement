import type { PromoCheck } from "@rktd/domain";
import type pg from "pg";
import { z } from "zod";
import { pool, type Db } from "../db.js";
import { festival } from "../festival.js";
import { HOLDS_STOCK } from "./stock.js";

const PromoRuleSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("PERCENT_OFF"), percent: z.number() }),
  z.object({ type: z.literal("AMOUNT_OFF"), amountCents: z.number().int() }),
  z.object({ type: z.literal("FREE_CHILD_TICKETS") }),
]);

type PromoRow = {
  code: string;
  rule: unknown;
  valid_from: Date | null;
  valid_until: Date | null;
  max_redemptions: number | null;
  times_used: number;
};

export async function loadPromoCheck(code: string | null, now: Date, db: Db = pool): Promise<PromoCheck | null> {
  if (!code) return null;
  const { rows } = await db.query<PromoRow>(
    `select p.code, p.rule, p.valid_from, p.valid_until, p.max_redemptions,
            (p.previous_redemptions + (select count(*) from bookings b where b.promo_code = p.code and ${HOLDS_STOCK}))::int as times_used
     from promo_codes p
     where p.code = $1`,
    [code],
  );
  const row = rows[0];
  return {
    code,
    now,
    timeZone: festival.timeZone,
    timesUsed: row?.times_used ?? 0,
    promo: row
      ? {
          code: row.code,
          rule: PromoRuleSchema.parse(row.rule),
          validFrom: row.valid_from,
          validUntil: row.valid_until,
          maxRedemptions: row.max_redemptions,
        }
      : null,
  };
}

// Stops two people using the last redemption of a limited code at the same moment.
export async function lockPromo(db: pg.PoolClient, code: string | null): Promise<void> {
  if (code) await db.query("select code from promo_codes where code = $1 for update", [code]);
}
