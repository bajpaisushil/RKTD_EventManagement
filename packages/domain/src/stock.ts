import type { Product } from "./catalog.js";
import { error, type Issue } from "./issues.js";
import type { OrderItem } from "./items.js";

export type StockLevels = Record<string, number>;

export type StockNeed = { stockKey: string; product: Product; units: number };

// Every product has one pool for the whole festival. A per-day pool would
// return `${item.product.stockKey}@${item.day}` here instead.
export function stockKeyFor(item: OrderItem): string {
  return item.product.stockKey;
}

export function stockNeeded(items: OrderItem[]): StockNeed[] {
  const needs = new Map<string, StockNeed>();
  for (const item of items) {
    const stockKey = stockKeyFor(item);
    const need = needs.get(stockKey) ?? { stockKey, product: item.product, units: 0 };
    need.units += item.quantity;
    needs.set(stockKey, need);
  }
  return [...needs.values()];
}

export function stockIssues(items: OrderItem[], stockLeft: StockLevels): Issue[] {
  const issues: Issue[] = [];
  for (const need of stockNeeded(items)) {
    const left = stockLeft[need.stockKey] ?? 0;
    if (need.units <= left) continue;
    const target = { kind: "PRODUCT" as const, productCode: need.product.code };
    if (left <= 0) {
      issues.push(error("SOLD_OUT", `${need.product.label} is sold out.`, target));
    } else {
      issues.push(error("NOT_ENOUGH_STOCK", `Only ${left} left for ${need.product.label}, and this booking needs ${need.units}.`, target));
    }
  }
  return issues;
}
