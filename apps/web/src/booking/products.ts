import type { FestivalView, ProductCode, ProductView, TicketBand } from "@rktd/domain";
import type { PassChoice } from "./draft";

export function product(festival: FestivalView, code: ProductCode): ProductView {
  const found = festival.products.find((p) => p.code === code);
  if (!found) throw new Error(`Unknown product ${code}`);
  return found;
}

const PASS_CODES: Record<Exclude<PassChoice, "FAMILY_PASS">, Record<TicketBand, ProductCode>> = {
  DAY_PASS: { ADULT: "DAY_PASS_ADULT", CHILD: "DAY_PASS_CHILD" },
  ALL_DAY_PASS: { ADULT: "ALL_DAY_PASS_ADULT", CHILD: "ALL_DAY_PASS_CHILD" },
};

export function passProduct(festival: FestivalView, pass: Exclude<PassChoice, "FAMILY_PASS">, band: TicketBand): ProductView {
  return product(festival, PASS_CODES[pass][band]);
}
