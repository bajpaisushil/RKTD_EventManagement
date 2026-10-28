// Checks the API contract end to end: prices, promo codes, rules, tampering, stock, idempotency, the admin page and the assistant.
//   node apps/api/scripts/contract-check.mjs [apiBaseUrl] [adminPasscode]
// It creates a couple of test bookings (one cancelled, one free) and prints their references.
const API = `${process.argv[2] ?? "http://localhost:4000"}/api`;
const PASSCODE = process.argv[3] ?? "";
let passed = 0;
const failures = [];
const created = [];

function check(name, condition, detail = "") {
  if (condition) passed++;
  else failures.push(`${name} ${detail}`);
  console.log(`${condition ? "✓" : "✗"} ${name}${condition ? "" : `  -> ${detail}`}`);
}

async function call(method, path, body, headers = {}) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
  const json = await response.json().catch(() => null);
  return { status: response.status, json };
}

const quote = (body) => call("POST", "/quotes", body);
const codes = (r) => (r.json?.issues ?? []).map((i) => i.code);
const adult = (id, days, extra = {}) => ({ id, dateOfBirth: "1985-06-15", entry: { type: "DAY_PASS", days }, ...extra });
const child = (id, entry, extra = {}) => ({ id, dateOfBirth: "2018-03-02", entry, ...extra });
const key = () => `qa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const bookingBody = (name, extra = {}) => ({
  attendees: [{ id: "me", firstName: name, lastName: "Qa", dateOfBirth: "1985-06-15", entry: { type: "DAY_PASS", days: ["2026-11-12"] } }],
  booker: { attending: true, attendeeId: "me", email: `qa.${name.toLowerCase()}@example.com`, phone: "2145550100" },
  expectedTotalCents: 1500,
  ...extra,
});

// --- basics
check("health", (await call("GET", "/health")).json?.ok === true);
const festival = (await call("GET", "/festival")).json;
const product = (code) => festival.products.find((p) => p.code === code);
check("All-Day Adult is sold out", product("ALL_DAY_PASS_ADULT").status === "SOLD_OUT");
check("Workshop shows as low", ["LOW", "SOLD_OUT"].includes(product("GARBA_WORKSHOP").status), product("GARBA_WORKSHOP").status);
check("unknown route is JSON 404", (await call("GET", "/nope")).status === 404);
check("bad JSON is 400", (await call("POST", "/quotes", "{oops")).status === 400);

// --- prices
let r = await quote({ attendees: [adult("a", ["2026-11-12"])] });
check("adult day pass = $15", r.json.quote.totalCents === 1500, JSON.stringify(r.json.quote.totalCents));
r = await quote({ attendees: [adult("a", ["2026-11-11"]), child("c", { type: "DAY_PASS", days: ["2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13"] })] });
check("child on 4 day passes gets the All-Day suggestion ($2)", r.json.suggestions.some((s) => s.change.type === "SWITCH_TO_ALL_DAY_PASS" && s.savingsCents === 200));
r = await quote({ attendees: [adult("a1", ["2026-11-12"]), adult("a2", ["2026-11-12"]), child("c1", { type: "DAY_PASS", days: ["2026-11-12"] }), child("c2", { type: "DAY_PASS", days: ["2026-11-12"] })] });
check("2A+2C on day passes get the Family Pass suggestion ($6)", r.json.suggestions.some((s) => s.change.type === "USE_FAMILY_PASS" && s.savingsCents === 600));
const family = [0, 1].map((i) => ({ id: `a${i}`, dateOfBirth: "1985-06-15", entry: { type: "FAMILY_PASS", familyGroupId: "f" } })).concat([0, 1].map((i) => ({ id: `c${i}`, dateOfBirth: "2018-03-02", entry: { type: "FAMILY_PASS", familyGroupId: "f" } })));
r = await quote({ attendees: family, familyGroups: [{ id: "f", days: ["2026-11-12"] }] });
check("Family Pass = $40", r.json.quote.totalCents === 4000 && r.json.canBook);
r = await quote({ attendees: family, familyGroups: [{ id: "f", days: ["2026-11-12"] }], promoCode: "KIDSFREE" });
check("KIDSFREE doesn't discount a Family Pass", r.json.quote.promo.status === "NO_EFFECT" && r.json.quote.totalCents === 4000);
check("...and suggests splitting it ($10)", r.json.suggestions.some((s) => s.change.type === "SPLIT_FAMILY_PASS" && s.savingsCents === 1000));
r = await quote({ attendees: [...family.slice(0, 2), { id: "teen", dateOfBirth: "2013-01-01", entry: { type: "FAMILY_PASS", familyGroupId: "f" } }, family[2]], familyGroups: [{ id: "f", days: ["2026-11-12"] }] });
check("3 adults + 1 child can't share a Family Pass", codes(r).includes("FAMILY_PASS_COMPOSITION"));

// --- promo codes
const twoDays = { attendees: [adult("a", ["2026-11-11", "2026-11-12"]), child("c", { type: "DAY_PASS", days: ["2026-11-11", "2026-11-12"] }, { dinnerDays: ["2026-11-11"] })], dandiyaPairs: 1 };
r = await quote({ ...twoDays, promoCode: " seva10 " });
check("SEVA10 (lowercase, spaces) takes 10% off everything", r.json.quote.promo.status === "APPLIED" && r.json.quote.discountCents === 630, JSON.stringify(r.json.quote.promo));
r = await quote({ attendees: [adult("a", ["2026-11-12"])], promoCode: "FLAT20" });
check("FLAT20 is capped at the total", r.json.quote.totalCents === 0 && r.json.quote.discountCents === 1500);
r = await quote({ ...twoDays, promoCode: "KIDSFREE" });
check("KIDSFREE frees child tickets only", r.json.quote.discountCents === 1600);
r = await quote({ ...twoDays, promoCode: "EXPIRED5" });
check("EXPIRED5 is refused with its end date", r.json.quote.promo.status === "EXPIRED" && /September 30, 2026/.test(r.json.quote.promo.message), r.json.quote.promo.message);
r = await quote({ ...twoDays, promoCode: "MAXEDOUT" });
check("MAXEDOUT is refused", r.json.quote.promo.status === "USED_UP");
r = await quote({ ...twoDays, promoCode: "LETMEIN" });
check("unknown code is refused", r.json.quote.promo.status === "NOT_FOUND");

// --- ages and rules
r = await quote({ attendees: [adult("a", ["2026-11-12"]), { id: "t", dateOfBirth: "2023-05-05", entry: { type: "DAY_PASS", days: ["2026-11-12"] } }] });
check("under-5 with a ticket is refused", codes(r).includes("TICKET_NOT_NEEDED"));
r = await quote({ attendees: [adult("a", ["2026-11-12"]), child("c", { type: "NO_TICKET", days: ["2026-11-12"] })] });
check("child without a ticket is refused", codes(r).includes("TICKET_REQUIRED"));
r = await quote({ attendees: [{ id: "x", dateOfBirth: "2014-11-12", entry: { type: "DAY_PASS", days: ["2026-11-10"] } }] });
check("child turning 12 mid-festival pays child price", r.json.quote.lines[0]?.productCode === "DAY_PASS_CHILD");
r = await quote({ attendees: [adult("a", ["2026-11-11"], { dinnerDays: ["2026-11-12"] })] });
check("dinner on a day not attending is refused", codes(r).includes("EXTRA_ON_DAY_NOT_ATTENDING"));
r = await quote({ attendees: [adult("a", ["2026-11-12"], { workshopDays: ["2026-11-12"] })] });
check("workshop on a non-workshop day is refused", codes(r).includes("WORKSHOP_NOT_RUNNING"));
r = await quote({ attendees: [adult("a", ["2026-11-11", "2026-11-13"], { workshopDays: ["2026-11-11", "2026-11-13"] }), adult("b", ["2026-11-13"], { workshopDays: ["2026-11-13"] })] });
check("3 workshop places when 2 are left is refused", codes(r).includes("NOT_ENOUGH_STOCK") || codes(r).includes("SOLD_OUT"), codes(r).join(","));
r = await quote({ attendees: [{ id: "a", dateOfBirth: "1985-06-15", entry: { type: "ALL_DAY_PASS" } }] });
check("adult All-Day Pass is sold out", codes(r).includes("SOLD_OUT"));
r = await quote({ attendees: [adult("a", ["2026-11-09"])] });
check("a day outside the festival is refused", codes(r).includes("NOT_A_FESTIVAL_DAY"));
r = await quote({ attendees: [adult("a", ["2026-11-12"])], dandiyaPairs: 21 });
check("21 dandiya pairs is refused", codes(r).includes("DANDIYA_LIMIT"));
r = await quote({ attendees: Array.from({ length: 21 }, (_, i) => adult(`p${i}`, ["2026-11-12"])) });
check("21 people is refused", codes(r).includes("PARTY_TOO_LARGE"));

// --- tampering
r = await quote({ attendees: [{ ...adult("a", ["2026-11-12"]), priceCents: 1, band: "CHILD" }], totalCents: 1, discountCents: 99999 });
check("injected price/band/total fields are ignored", r.json.quote.totalCents === 1500);
r = await quote({ attendees: [adult("a", ["2026-11-12"])], dandiyaPairs: -5 });
check("negative quantity is a 400", r.status === 400);
r = await quote({ attendees: [adult("a", ["2026-11-12"])], dandiyaPairs: 1.5 });
check("fractional quantity is a 400", r.status === 400);
r = await quote({ attendees: [{ id: "a", dateOfBirth: "2026-02-30", entry: { type: "DAY_PASS", days: ["2026-11-12"] } }] });
check("impossible date of birth is a 400", r.status === 400);
r = await quote({ attendees: [{ id: "a", dateOfBirth: "1985-06-15", entry: { type: "ADULT_DISCOUNT_PASS" } }] });
check("made-up ticket type is a 400", r.status === 400);
r = await quote({ attendees: [adult("a", ["2026-11-12", "2026-11-12"])] });
check("the same day twice is a 400", r.status === 400);

// --- bookings
r = await call("POST", "/bookings", bookingBody("Nokey"));
check("booking without Idempotency-Key is a 400", r.status === 400 && r.json.error.code === "IDEMPOTENCY_KEY_MISSING");
r = await call("POST", "/bookings", bookingBody("Young", { attendees: [{ id: "me", firstName: "Young", lastName: "Qa", dateOfBirth: "2010-01-01", entry: { type: "DAY_PASS", days: ["2026-11-12"] } }] }), { "Idempotency-Key": key() });
check("a 16-year-old booker is refused", r.status === 422 && r.json.error.issues.some((i) => i.code === "BOOKER_TOO_YOUNG"));
r = await call("POST", "/bookings", bookingBody("Stale", { expectedTotalCents: 900 }), { "Idempotency-Key": key() });
check("a stale total is refused (409 PRICE_CHANGED)", r.status === 409 && r.json.error.code === "PRICE_CHANGED");
r = await call("POST", "/bookings", { ...bookingBody("Twin"), attendees: [bookingBody("Twin").attendees[0], { ...bookingBody("Twin").attendees[0], id: "me2" }], expectedTotalCents: 3000 }, { "Idempotency-Key": key() });
check("the same person twice is refused", r.status === 422 && r.json.error.issues.some((i) => i.code === "DUPLICATE_PERSON"));

const paidKey = key();
const paid = await call("POST", "/bookings", bookingBody("Paid"), { "Idempotency-Key": paidKey });
created.push(paid.json);
check("paid booking returns a Stripe Checkout link", paid.status === 201 && /checkout\.stripe\.com/.test(paid.json.checkoutUrl ?? ""));
const again = await call("POST", "/bookings", bookingBody("Paid"), { "Idempotency-Key": paidKey });
check("double click returns the same booking", again.json.reference === paid.json.reference && again.json.checkoutUrl === paid.json.checkoutUrl);
const reused = await call("POST", "/bookings", bookingBody("Other"), { "Idempotency-Key": paidKey });
check("reusing the key for a different booking is refused", reused.status === 422 && reused.json.error.code === "IDEMPOTENCY_KEY_REUSED");
const view = await call("GET", `/bookings/${paid.json.reference}`, undefined, { Authorization: `Bearer ${paid.json.accessToken}` });
check("booking is viewable with its token", view.status === 200 && view.json.status === "PENDING_PAYMENT");
const sneaky = await call("GET", `/bookings/${paid.json.reference}`, undefined, { Authorization: "Bearer guessed-token" });
check("booking is hidden without its token", sneaky.status === 404);
const before = (await call("GET", "/festival")).json.products.find((p) => p.code === "DAY_PASS_ADULT").left;
const cancelled = await call("POST", `/bookings/${paid.json.reference}/cancel`, undefined, { Authorization: `Bearer ${paid.json.accessToken}` });
const after = (await call("GET", "/festival")).json.products.find((p) => p.code === "DAY_PASS_ADULT").left;
check("cancelling releases the held place", cancelled.json.status === "CANCELLED" && after === before + 1, `${before} -> ${after}`);

const free = await call("POST", "/bookings", bookingBody("Free", { promoCode: "FLAT20", expectedTotalCents: 0 }), { "Idempotency-Key": key() });
created.push(free.json);
check("a $0 booking is confirmed with no payment step", free.status === 201 && free.json.status === "CONFIRMED" && free.json.checkoutUrl === null);

// --- admin
if (PASSCODE) {
  const admin = (method, path, body) => call(method, `/admin${path}`, body, { "X-Admin-Passcode": PASSCODE });
  check("admin refuses a wrong passcode", (await call("GET", "/admin/bookings", undefined, { "X-Admin-Passcode": "wrong-code" })).status === 401);
  const found = await admin("GET", `/bookings?q=${free.json.reference.replace(/-/g, "").toLowerCase()}`);
  check("admin finds a booking by reference without dashes", found.json.bookings?.[0]?.reference === free.json.reference && found.json.total === 1);
  const cancelledOnly = await admin("GET", `/bookings?q=${paid.json.reference}&status=CANCELLED`);
  check("admin filters by status", cancelledOnly.json.bookings?.[0]?.status === "CANCELLED");
  check("admin refuses an unknown status", (await admin("GET", "/bookings?status=LOST")).status === 400);
  const detail = await admin("GET", `/bookings/${free.json.reference}`);
  check("admin shows a booking in full", detail.json.people?.[0]?.dateOfBirth === "1985-06-15" && detail.json.payment?.method === "NOT_NEEDED" && detail.json.quote?.promo?.code === "FLAT20");
  check("admin 404s an unknown reference", (await admin("GET", "/bookings/SU-NOPE-0000")).status === 404);
  const checkIn = (day, checkedIn) => admin("PUT", "/check-ins", { reference: free.json.reference, attendeeId: "me", day, checkedIn });
  check("check-in on a booked day works", (await checkIn("2026-11-12", true)).status === 200);
  check("check-in again changes nothing", (await checkIn("2026-11-12", true)).status === 200);
  check("check-in on a day not booked is refused", (await checkIn("2026-11-13", true)).json?.error?.code === "NOT_BOOKED_THAT_DAY");
  const checkedIn = await admin("GET", `/bookings/${free.json.reference}`);
  check("the check-in shows on the booking", checkedIn.json.people?.[0]?.checkIns?.[0]?.day === "2026-11-12");
  await checkIn("2026-11-12", false);
}

// --- webhook
check("webhook rejects an unsigned call", (await call("POST", "/webhooks/stripe", { type: "checkout.session.completed" }, { "stripe-signature": "t=1,v1=fake" })).status === 400);

// --- assistant (kept to two calls to stay within the free model allowance)
r = await call("POST", "/assistant", { messages: [{ role: "user", content: "Is my 3 year old free?" }] });
check("assistant answers a guide question", r.status === 200 && /free/i.test(r.json.answer), r.json?.answer);
r = await call("POST", "/assistant", { messages: [{ role: "assistant", content: "hi" }] });
check("assistant rejects a conversation not ending in a question", r.status === 400);

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) console.log("FAILED:\n" + failures.map((f) => `  - ${f}`).join("\n"));
console.log("Created for cleanup:", created.filter(Boolean).map((b) => b.reference).join(", "));
