import type { StockLevels } from "@rktd/domain";
import type pg from "pg";
import { pool, type Db } from "../db.js";

// A booking holds stock while it's paid, or unpaid but still inside its hold.
export const HOLDS_STOCK = `(b.status = 'CONFIRMED' or (b.status = 'PENDING_PAYMENT' and b.hold_expires_at > now()))`;

export async function loadStockLeft(db: Db = pool): Promise<StockLevels> {
  const { rows } = await db.query<{ stock_key: string; units_left: number }>(
    `select inv.stock_key,
            inv.starting_units - coalesce(sum(i.quantity) filter (where ${HOLDS_STOCK}), 0)::int as units_left
     from inventory inv
     left join booking_items i on i.stock_key = inv.stock_key
     left join bookings b on b.id = i.booking_id
     group by inv.stock_key, inv.starting_units`,
  );
  return Object.fromEntries(rows.map((row) => [row.stock_key, row.units_left]));
}

// Locks the inventory rows a booking needs, in a fixed order so two bookings can't deadlock.
// Anyone else booking the same items waits here until this transaction ends.
export async function lockStock(db: pg.PoolClient, stockKeys: string[]): Promise<void> {
  await db.query("select stock_key from inventory where stock_key = any($1) order by stock_key for update", [stockKeys]);
}
