import type { Catalog, Product } from "./catalog.js";
import type { IsoDate } from "./dates.js";
import type { QuoteRequest } from "./input.js";
import type { PartyMember } from "./party.js";

// One row per thing bought: pricing, stock and the door list all read from these.
export type OrderItem = {
  product: Product;
  quantity: number;
  day: IsoDate | null;
  attendeeId: string | null;
  familyGroupId: string | null;
};

export function orderItems(request: QuoteRequest, party: PartyMember[], catalog: Catalog): OrderItem[] {
  const items: OrderItem[] = [];

  for (const member of party) {
    const attendeeId = member.attendee.id;
    const entry = member.attendee.entry;

    if (member.band !== "INFANT") {
      if (entry.type === "DAY_PASS") {
        for (const day of entry.days) {
          items.push({ product: catalog.dayPass[member.band], quantity: 1, day, attendeeId, familyGroupId: null });
        }
      }
      if (entry.type === "ALL_DAY_PASS") {
        items.push({ product: catalog.allDayPass[member.band], quantity: 1, day: null, attendeeId, familyGroupId: null });
      }
    }

    for (const day of member.attendee.dinnerDays) {
      items.push({ product: catalog.dinnerPlate, quantity: 1, day, attendeeId, familyGroupId: null });
    }
    for (const day of member.attendee.workshopDays) {
      items.push({ product: catalog.garbaWorkshop, quantity: 1, day, attendeeId, familyGroupId: null });
    }
  }

  for (const group of request.familyGroups) {
    for (const day of group.days) {
      items.push({ product: catalog.familyPass, quantity: 1, day, attendeeId: null, familyGroupId: group.id });
    }
  }

  if (request.dandiyaPairs > 0) {
    items.push({ product: catalog.dandiyaSticks, quantity: request.dandiyaPairs, day: null, attendeeId: null, familyGroupId: null });
  }

  return items;
}
