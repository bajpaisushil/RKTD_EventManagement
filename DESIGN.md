# Design note: Sharad Utsav 2026 booking

I wrote this before writing any code. I'm leaving it as it is. Where the build ends up different, the README says so.

## Shape of the system

- `packages/domain`: plain TypeScript with no framework. It holds dates, ages, money, the festival catalogue, the validation rules, pricing, promo maths and stock demand. Both the API and the web app import it, so the browser can give instant feedback using the same rules the server enforces. The server never trusts the browser's answer; it recomputes it.
- `apps/api`: Express 5 in TypeScript, deployed on Vercel as a function. It owns prices, stock, promo codes, bookings and payments. Postgres (Neon) is the source of truth. Upstash Redis does rate limiting.
- `apps/web`: Next.js. The booking flow is driven by a reducer, and there is a confirmation page.

## How I'm modelling things

**Money.** Integer cents everywhere (a branded `Cents` type). A percentage discount is rounded half-up to the cent, once. Turning cents into "$146.70" only happens in the UI.

**Dates.** Festival days are calendar dates (`YYYY-MM-DD` strings), never JS `Date` objects, so there's no timezone drift. "Today" is worked out in America/Chicago, the temple's timezone.

**People.** Every person in the group is one attendee: first name, last name, date of birth. I'm asking for date of birth rather than age because the festival runs for five days, and "age" is ambiguous when a birthday falls inside it. The server works out each person's age on the first festival day and puts them in a band: under 5, child (5–11) or adult (12+). Children get no email or phone fields; the booker is the contact. The booker gives name, email, phone and date of birth, and says whether they're coming too.

**Tickets.** The person picks a *kind of pass*: a Day Pass with chosen days, an All-Day Pass, or a place on a Family Pass. Whether it's the adult or child version comes from the age band; the browser can't choose it. So "an adult ticket for a seven-year-old" can't even be expressed. Each attendee carries exactly one entry, so the number of people and the number of tickets can't drift apart however many times the family changes its mind. Under-5s are listed, so the door list is complete, but they carry no ticket.

**Family Pass.** A group object with a day. Exactly 2 adults and 2 children point at it. A family coming on two days buys one pass per day.

**Extras.** Dinner plates and workshop places belong to a person and a day, and only a day that person is attending. Dandiya sticks are a quantity on the booking.

**Catalogue.** Products have stable codes and typed attributes: category, age band, pricing unit, stock key. No rule ever reads a label.

**Promo codes.** Kept on the server (in the database), never shipped to the browser. There are three rule types: percent off the booking, amount off the booking, and child tickets free. Each code has an optional validity window and an optional redemption limit.

**Stock.** An inventory table holds the starting units. Available = starting − confirmed − unexpired holds. Creating a booking takes a 30-minute hold inside a transaction that locks the inventory rows involved (`SELECT … FOR UPDATE`), so two people can't both take the last workshop places. Payment turns the hold into a confirmed booking. An unpaid hold simply lapses, so nothing has to "give stock back".

## Endpoints (first draft)

| Method and path | Takes | Returns |
|---|---|---|
| `GET /api/festival` | nothing | event, days, age rules, products with prices and live availability |
| `POST /api/quotes` | attendees, family passes, dandiya pairs, promo code | priced lines, subtotal, discount, total, issues, savings suggestions |
| `POST /api/bookings` (`Idempotency-Key` header) | quote input + booker + `expectedTotalCents` | reference, status, hold expiry, Stripe Checkout URL (none for a $0 booking) |
| `GET /api/bookings/:reference` (bearer token) | nothing | booking status and details |
| `POST /api/bookings/:reference/cancel` | nothing | releases an unpaid hold |
| `POST /api/webhooks/stripe` | Stripe event | confirms or expires bookings |

Errors all share one shape, `{ error: { code, message, details } }`: 422 when a rule fails, 409 when stock or the price changed, 429 when rate-limited.

## Tricky cases I've spotted so far

1. A child whose birthday falls during the festival: which age counts? My plan is the age on day one.
2. Four Day Passes for a child ($32) cost more than an All-Day Child Pass ($30). Five adult Day Passes ($75) cost more than the All-Day Adult Pass ($60), which is sold out.
3. Families that don't fit the Family Pass: 2 adults + 3 kids, a 13-year-old who counts as an adult, toddlers alongside.
4. KIDSFREE with a Family Pass: is a family pass a "child ticket"? My plan says no. Also, with KIDSFREE a 2+2 family is cheaper on individual passes.
5. A dinner or workshop on a day the person isn't attending, or a workshop on a day it doesn't run.
6. The booker isn't coming, e.g. a parent booking for teenagers or for grandparents.
7. FLAT20 on a booking under $20 gives a $0 total, and Stripe can't charge $0.
8. Booking during the festival: days already past, and an All-Day Pass that would only cover the days left.
9. Price or stock changing between seeing the total and paying. Promo usage limits race just like stock.
10. Pay clicked twice; coming back from Stripe without paying.
11. Workshop stock: is "2" per session or across both? Day Pass stock: per person or per person-day?
12. Children with no adult in the same booking.

## What I'm deliberately not doing

- Accounts or logins. A booking reference plus a secret link is enough for a festival.
- Changing or refunding a paid booking online. That needs a policy I haven't been given.
- An admin screen for prices. The catalogue is typed config in code for now. The README will cover how I'd run ten festivals.
- Verifying ages in the core build. A date of birth can't be proven online, so the door list will show ages for volunteers to check. Photo ID is in the extras below.
- Pushing live stock updates (websockets). Polling, plus a hard re-check when the booking is made, is enough.

## Extras, if time allows

- **A festival agent built with LangGraph.** More than an FAQ bot: a graph with separate nodes for searching the festival guide, pricing through the real pricing and stock code, and drafting a booking. It keeps the conversation's state, so a family can say "add grandma" or "make it Friday instead", and it pauses for the booker to confirm before anything reaches checkout. The LLM never does maths itself.
- **AR at the temple.** A WebXR view on phones, with no app to install: place the temple dressed for the festival on a table at home, or point the camera at the grounds on the night to see where garba, dinner and the workshop are, with that day's timings.
- **Photo ID proof.** Each adult uploads a photo ID when booking, and teenagers a school ID. The door list shows the photo next to the age, so volunteers can match faces and settle age bands without a queue forming. Files are stored encrypted and deleted after the festival.
- **Wallet passes.** An Apple Wallet and Google Wallet pass with a QR code for each booking, so check-in at the door is a single scan.
