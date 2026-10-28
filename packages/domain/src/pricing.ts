import { allProducts, type Catalog, type ProductCode } from "./catalog.js";
import type { OrderItem } from "./items.js";
import type { Cents } from "./money.js";
import { applyPromo, type PricedLine, type PromoCheck, type PromoResult } from "./promo.js";

export type QuoteLine = {
  productCode: ProductCode;
  label: string;
  priceUnit: string;
  unitPriceCents: Cents;
  quantity: number;
  amountCents: Cents;
};

export type Quote = {
  lines: QuoteLine[];
  subtotalCents: Cents;
  discountCents: Cents;
  totalCents: Cents;
  promo: PromoResult | null;
};

export function priceItems(items: OrderItem[], catalog: Catalog, promoCheck: PromoCheck | null): Quote {
  const lines: PricedLine[] = [];
  for (const product of allProducts(catalog)) {
    const quantity = items
      .filter((item) => item.product.code === product.code)
      .reduce((sum, item) => sum + item.quantity, 0);
    if (quantity > 0) {
      lines.push({ product, quantity, amountCents: product.priceCents * quantity });
    }
  }

  const subtotalCents = lines.reduce((sum, line) => sum + line.amountCents, 0);
  const promo = promoCheck ? applyPromo(promoCheck, lines, subtotalCents) : null;
  const discountCents = promo?.status === "APPLIED" ? promo.discountCents : 0;

  return {
    lines: lines.map(({ product, quantity, amountCents }) => ({
      productCode: product.code,
      label: product.label,
      priceUnit: product.priceUnit,
      unitPriceCents: product.priceCents,
      quantity,
      amountCents,
    })),
    subtotalCents,
    discountCents,
    totalCents: subtotalCents - discountCents,
    promo,
  };
}
