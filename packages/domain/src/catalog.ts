import type { AgePolicy, TicketBand } from "./age.js";
import type { IsoDate } from "./dates.js";
import type { Cents } from "./money.js";

export type ProductCode =
  | "DAY_PASS_ADULT"
  | "DAY_PASS_CHILD"
  | "ALL_DAY_PASS_ADULT"
  | "ALL_DAY_PASS_CHILD"
  | "FAMILY_PASS"
  | "DANDIYA_STICKS"
  | "DINNER_PLATE"
  | "GARBA_WORKSHOP";

export type Product = {
  code: ProductCode;
  label: string;
  description: string;
  priceUnit: string;
  category: "ENTRY" | "EXTRA";
  priceCents: Cents;
  ticketBand: TicketBand | null;
  stockKey: string;
};

export type Catalog = {
  dayPass: Record<TicketBand, Product>;
  allDayPass: Record<TicketBand, Product>;
  familyPass: Product & { adults: number; children: number };
  dandiyaSticks: Product & { maxPerBooking: number };
  dinnerPlate: Product;
  garbaWorkshop: Product & { sessionDays: IsoDate[] };
};

export type FestivalConfig = {
  id: string;
  name: string;
  venue: string;
  timeZone: string;
  days: IsoDate[];
  agePolicy: AgePolicy;
  catalog: Catalog;
  maxAttendees: number;
  holdMinutes: number;
  lowStockThreshold: number;
};

export function allProducts(catalog: Catalog): Product[] {
  return [
    catalog.dayPass.ADULT,
    catalog.dayPass.CHILD,
    catalog.allDayPass.ADULT,
    catalog.allDayPass.CHILD,
    catalog.familyPass,
    catalog.dandiyaSticks,
    catalog.dinnerPlate,
    catalog.garbaWorkshop,
  ];
}
