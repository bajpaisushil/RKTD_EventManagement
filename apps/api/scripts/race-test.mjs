// Fires N bookings at once, each wanting one Garba Workshop place, then cancels the winners.
// Only as many as there are places should succeed.
//   node apps/api/scripts/race-test.mjs [apiBaseUrl] [requests]

const api = `${process.argv[2] ?? "http://localhost:4000"}/api`;
const requests = Number(process.argv[3] ?? 6);
const started = Date.now();
const seconds = () => `${((Date.now() - started) / 1000).toFixed(1)}s`;

const festival = await (await fetch(`${api}/festival`)).json();
const workshop = festival.products.find((product) => product.code === "GARBA_WORKSHOP");
const day = festival.workshopDays.find((date) => festival.days.some((d) => d.date === date && d.onSale));
console.log(`${workshop.left} workshop place(s) left. Sending ${requests} bookings at once for ${day}...\n`);

const bookingFor = (i) => ({
  attendees: [
    {
      id: "racer",
      firstName: "Race",
      lastName: `Tester${String.fromCharCode(65 + i)}`,
      dateOfBirth: "1990-01-01",
      entry: { type: "DAY_PASS", days: [day] },
      workshopDays: [day],
    },
  ],
  booker: { attending: true, attendeeId: "racer", email: `race-test-${i}@example.com`, phone: "2145550100" },
  expectedTotalCents: 3500,
});

const results = await Promise.all(
  Array.from({ length: requests }, async (_, i) => {
    const response = await fetch(`${api}/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": `race-${started}-${i}` },
      body: JSON.stringify(bookingFor(i)),
      signal: AbortSignal.timeout(60_000),
    });
    const body = await response.json();
    console.log(`${seconds()}  #${i}  ${response.status}  ${body.reference ?? `${body.error.code}: ${body.error.message}`}`);
    return { status: response.status, body };
  }),
);

const winners = results.filter((result) => result.status === 201);
console.log(`\n${winners.length} of ${requests} got a place.`);

for (const { body } of winners) {
  await fetch(`${api}/bookings/${body.reference}/cancel`, {
    method: "POST",
    headers: { Authorization: `Bearer ${body.accessToken}` },
  });
}
const after = await (await fetch(`${api}/festival`)).json();
console.log(`Cancelled the test bookings. Workshop places left: ${after.products.find((p) => p.code === "GARBA_WORKSHOP").left}`);
