import type { AgePolicy, TicketBand } from "./age.js";
import { allProducts, type FestivalConfig, type ProductCode } from "./catalog.js";
import { formatDay, todayIn, type IsoDate } from "./dates.js";
import type { Cents } from "./money.js";
import type { StockLevels } from "./stock.js";

export type StockStatus = "AVAILABLE" | "LOW" | "SOLD_OUT";

export type ProductView = {
  code: ProductCode;
  label: string;
  description: string;
  priceUnit: string;
  category: "ENTRY" | "EXTRA";
  priceCents: Cents;
  ticketBand: TicketBand | null;
  left: number;
  status: StockStatus;
};

export type FestivalView = {
  id: string;
  name: string;
  venue: string;
  timeZone: string;
  contactEmail: string;
  today: IsoDate;
  salesOpen: boolean;
  allDayPassOnSale: boolean;
  days: { date: IsoDate; label: string; onSale: boolean; hasWorkshop: boolean }[];
  agePolicy: AgePolicy;
  products: ProductView[];
  familyPass: { adults: number; children: number };
  workshopDays: IsoDate[];
  maxAttendees: number;
  maxDandiyaPairs: number;
  holdMinutes: number;
};

function statusFor(left: number, lowStockThreshold: number): StockStatus {
  if (left <= 0) return "SOLD_OUT";
  if (left <= lowStockThreshold) return "LOW";
  return "AVAILABLE";
}

export function festivalView(festival: FestivalConfig, stockLeft: StockLevels, now: Date): FestivalView {
  const today = todayIn(festival.timeZone, now);
  const { catalog } = festival;
  const lastDay = festival.days[festival.days.length - 1];

  return {
    id: festival.id,
    name: festival.name,
    venue: festival.venue,
    timeZone: festival.timeZone,
    contactEmail: festival.contactEmail,
    today,
    salesOpen: today <= lastDay,
    allDayPassOnSale: today < festival.days[0],
    days: festival.days.map((date) => ({
      date,
      label: formatDay(date),
      onSale: date >= today,
      hasWorkshop: catalog.garbaWorkshop.sessionDays.includes(date),
    })),
    agePolicy: festival.agePolicy,
    products: allProducts(catalog).map((product) => {
      const left = Math.max(0, stockLeft[product.stockKey] ?? 0);
      return {
        code: product.code,
        label: product.label,
        description: product.description,
        priceUnit: product.priceUnit,
        category: product.category,
        priceCents: product.priceCents,
        ticketBand: product.ticketBand,
        left,
        status: statusFor(left, festival.lowStockThreshold),
      };
    }),
    familyPass: { adults: catalog.familyPass.adults, children: catalog.familyPass.children },
    workshopDays: catalog.garbaWorkshop.sessionDays,
    maxAttendees: festival.maxAttendees,
    maxDandiyaPairs: catalog.dandiyaSticks.maxPerBooking,
    holdMinutes: festival.holdMinutes,
  };
}
