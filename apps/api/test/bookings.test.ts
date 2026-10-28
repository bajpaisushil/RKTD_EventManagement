import { BookingRequestSchema, type BookingRequestBody } from "@rktd/domain";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { pool } from "../src/db.js";
import { migrate } from "../src/db/migrate.js";
import { seed } from "../src/db/seed.js";
import { ApiError } from "../src/http/errors.js";
import { getAdminBooking, listAdminBookings, setCheckedIn } from "../src/services/admin.js";
import { reserveBooking } from "../src/services/create-booking.js";
import { loadStockLeft } from "../src/services/stock.js";

const schema = process.env.TEST_SCHEMA ?? "";

beforeAll(async () => {
  await pool.query(`create schema ${schema}`);
  await migrate();
  await seed();
});

afterAll(async () => {
  await pool.query(`drop schema ${schema} cascade`);
  await pool.end();
});

let keyCounter = 0;
const newKey = () => `test-key-${Date.now()}-${keyCounter++}`;

function booking(name: string, overrides: Partial<BookingRequestBody> & { workshop?: boolean; days?: string[] } = {}) {
  const days = overrides.days ?? ["2026-11-11"];
  return BookingRequestSchema.parse({
    attendees: [
      {
        id: "me",
        firstName: name,
        lastName: "Tester",
        dateOfBirth: "1990-01-01",
        entry: { type: "DAY_PASS", days },
        workshopDays: overrides.workshop ? ["2026-11-11"] : [],
      },
    ],
    booker: { attending: true, attendeeId: "me", email: `${name.toLowerCase()}@example.com`, phone: "2145550100" },
    expectedTotalCents: days.length * 1500 + (overrides.workshop ? 2000 : 0),
    ...overrides,
  });
}

async function errorCodeOf(promise: Promise<unknown>): Promise<string | null> {
  try {
    await promise;
    return null;
  } catch (error) {
    return error instanceof ApiError ? error.code : String(error);
  }
}

describe("stock under pressure", () => {
  it("lets only two of three simultaneous buyers take the last two workshop places", async () => {
    const attempts = await Promise.allSettled(
      ["Asha", "Ravi", "Meera"].map((name) => reserveBooking(booking(name, { workshop: true }), newKey())),
    );
    const won = attempts.filter((attempt) => attempt.status === "fulfilled");
    const lost = attempts.filter((attempt): attempt is PromiseRejectedResult => attempt.status === "rejected");
    expect(won).toHaveLength(2);
    expect(lost).toHaveLength(1);
    expect(lost[0].reason).toBeInstanceOf(ApiError);
    expect((await loadStockLeft()).GARBA_WORKSHOP).toBe(0);
  });

  it("gives stock back when an unpaid hold runs out", async () => {
    await pool.query("update bookings set hold_expires_at = now() - interval '1 minute' where status = 'PENDING_PAYMENT'");
    expect((await loadStockLeft()).GARBA_WORKSHOP).toBe(2);
  });
});

describe("paying twice", () => {
  it("returns the same booking when Pay is clicked twice", async () => {
    const key = newKey();
    const request = booking("Double");
    const [first, second] = await Promise.all([reserveBooking(request, key), reserveBooking(request, key)]);
    expect(second.id).toBe(first.id);
  });

  it("refuses to reuse a key for a different booking", async () => {
    const key = newKey();
    await reserveBooking(booking("Original"), key);
    expect(await errorCodeOf(reserveBooking(booking("Different"), key))).toBe("IDEMPOTENCY_KEY_REUSED");
  });
});

describe("the amount charged", () => {
  it("refuses a booking whose total changed since the person saw it", async () => {
    expect(await errorCodeOf(reserveBooking(booking("Stale", { expectedTotalCents: 1000 }), newKey()))).toBe("PRICE_CHANGED");
  });

  it("confirms a $0 booking straight away, with nothing to pay", async () => {
    const result = await reserveBooking(booking("Free", { promoCode: "FLAT20", expectedTotalCents: 0 }), newKey());
    expect(result.status).toBe("CONFIRMED");
    expect(result.total_cents).toBe(0);
  });

  it("refuses MAXEDOUT", async () => {
    const result = await reserveBooking(booking("Maxed", { promoCode: "MAXEDOUT" }), newKey());
    expect(result.promo_code).toBeNull();
    expect(result.total_cents).toBe(1500);
  });

  it("lets only one booking take the last use of a limited code", async () => {
    await pool.query(
      "insert into promo_codes (code, rule, max_redemptions, previous_redemptions) values ('LASTONE', '{\"type\":\"AMOUNT_OFF\",\"amountCents\":500}', 1, 0)",
    );
    const attempts = await Promise.allSettled(
      ["First", "Second"].map((name) => reserveBooking(booking(name, { promoCode: "LASTONE", expectedTotalCents: 1000 }), newKey())),
    );
    expect(attempts.filter((attempt) => attempt.status === "fulfilled")).toHaveLength(1);
  });
});

describe("the admin list", () => {
  const search = (q: string, filters: { status?: "PENDING_PAYMENT" | "EXPIRED"; day?: string } = {}) => listAdminBookings({ q, offset: 0, ...filters });

  it("finds a booking by reference without dashes, anyone's name, email or phone", async () => {
    const created = await reserveBooking(
      booking("Kavya", {
        days: ["2026-11-14"],
        booker: { attending: true, attendeeId: "me", email: "kavya.r@example.com", phone: "+1 (469) 555-0123" },
      }),
      newKey(),
    );
    for (const q of [created.reference.replace(/-/g, "").toLowerCase(), "kavya tester", "KAVYA.R@", "469 555 0123"]) {
      expect((await search(q)).bookings.map((found) => found.reference), q).toContain(created.reference);
    }
  });

  it("counts an unpaid booking past its hold as expired, not awaiting payment", async () => {
    const created = await reserveBooking(booking("Lapsed", { days: ["2026-11-13"] }), newKey());
    await pool.query("update bookings set hold_expires_at = now() - interval '1 minute' where id = $1", [created.id]);
    const result = await search("lapsed");
    expect(result.bookings[0].status).toBe("EXPIRED");
    expect(result.statusCounts).toMatchObject({ EXPIRED: 1, PENDING_PAYMENT: 0 });
    expect((await search("lapsed", { status: "PENDING_PAYMENT" })).total).toBe(0);
    expect((await search("lapsed", { status: "EXPIRED" })).total).toBe(1);
  });

  it("filters by festival day, counting an All-Day Pass on every day", async () => {
    const allWeek = await reserveBooking(
      BookingRequestSchema.parse({
        attendees: [{ id: "kid", firstName: "Allweek", lastName: "Tester", dateOfBirth: "2018-03-02", entry: { type: "ALL_DAY_PASS" } }],
        booker: { attending: false, firstName: "Parent", lastName: "Tester", dateOfBirth: "1980-01-01", email: "allweek@example.com", phone: "2145550100" },
        expectedTotalCents: 3000,
      }),
      newKey(),
    );
    const thursday = await reserveBooking(booking("Thursday", { days: ["2026-11-12"] }), newKey());
    const comingTuesday = (await search("", { day: "2026-11-10" })).bookings.map((found) => found.reference);
    const comingThursday = (await search("", { day: "2026-11-12" })).bookings.map((found) => found.reference);
    expect(comingTuesday).toContain(allWeek.reference);
    expect(comingTuesday).not.toContain(thursday.reference);
    expect(comingThursday).toEqual(expect.arrayContaining([allWeek.reference, thursday.reference]));
  });

  it("shows one booking in full and checks people in only on their days", async () => {
    const free = await reserveBooking(booking("Nisha", { days: ["2026-11-12"], promoCode: "FLAT20", expectedTotalCents: 0 }), newKey());
    const detail = await getAdminBooking(free.reference.toLowerCase());
    expect(detail.payment.method).toBe("NOT_NEEDED");
    expect(detail.quote.promo?.code).toBe("FLAT20");
    expect(detail.people[0]).toMatchObject({ firstName: "Nisha", dateOfBirth: "1990-01-01", days: ["2026-11-12"], checkIns: [] });

    expect(await errorCodeOf(setCheckedIn(free.reference, "me", "2026-11-13", true))).toBe("NOT_BOOKED_THAT_DAY");
    await setCheckedIn(free.reference, "me", "2026-11-12", true);
    await setCheckedIn(free.reference, "me", "2026-11-12", true);
    expect((await getAdminBooking(free.reference)).people[0].checkIns.map((checkIn) => checkIn.day)).toEqual(["2026-11-12"]);
    await setCheckedIn(free.reference, "me", "2026-11-12", false);
    expect((await getAdminBooking(free.reference)).people[0].checkIns).toEqual([]);
  });

  it("says so when a reference doesn't exist", async () => {
    expect(await errorCodeOf(getAdminBooking("SU-NOPE-0000"))).toBe("NOT_FOUND");
  });
});
