# Sharad Utsav 2026 · Booking

**Live site: https://rktd-sharad-utsav.vercel.app**
API: https://rktd-sharad-utsav-api.vercel.app · Admin for the festival team: https://rktd-sharad-utsav.vercel.app/admin (passcode shared separately)

A family books everyone for Sharad Utsav in one go, pays, and gets a confirmation with a QR code for the door. The festival team sees every booking on an admin page and checks people in at the door.

Stripe is in test mode. Pay with card `4242 4242 4242 4242`, any future expiry, any CVC.

The live site starts with five demo bookings (made-up families with `@example.com` emails, paid with Stripe test cards) so the admin page has something to show. They're why some stock is already a little below the brief's numbers, such as 370 adult Day Passes instead of 380. The Garba Workshop's 2 places and the sold-out adult All-Day Pass are untouched.

## Try these first

| | What it shows | Try it |
|---|---|---|
| **AI festival assistant** | Retrieval-augmented answers: hybrid vector and full-text search inside Postgres, with the embedding model stored in the database itself. Prices come from tool calls into the real pricing engine, every question is screened for prompt injection, and retrieval is measured on held-out questions. | On the [live site](https://rktd-sharad-utsav.vercel.app), open "Ask about the festival" and ask "how much for 2 adults and 2 kids on Friday?" |
| **3D virtual tour** | A guided walk through the temple dressed for the festival, built entirely in code with three.js and react-three-fiber: six stops with camera flights, 56 dancers turning in three garba circles drawn with instanced meshes, resolution that adapts to the frame rate, and a text version when WebGL isn't available | [/tour](https://rktd-sharad-utsav.vercel.app/tour), or "Walk through the temple" on the home page |
| **Admin page** | Every booking with search and filters, card brand and last four pulled live from Stripe, and check-in at the door | [/admin](https://rktd-sharad-utsav.vercel.app/admin) |
| **Bookings under pressure** | Row locks, idempotency keys and a Stripe webhook fallback: 6 buyers racing for 2 places get exactly 2 bookings | `node apps/api/scripts/race-test.mjs <api url> 6` |

**Built with:** TypeScript 5.9 (strict) · Next.js 16 and React 19 · Tailwind CSS 4 · Express 5 · Postgres on Neon with pgvector · Groq `gpt-oss-120b` with tool calling · Llama Prompt Guard 2 · three.js with react-three-fiber · Stripe Checkout and webhooks · Zod 4 · Vitest · Vercel

## Beyond the brief

- **A festival assistant built on retrieval (RAG).** Open "Ask about the festival" and try "is my 3-year-old free?" or "how much for 2 adults and 2 kids on Friday?". It answers from a festival guide using hybrid search: pgvector similarity and Postgres full-text search, fused with reciprocal rank fusion. The embedding model itself lives in Postgres, so a question is embedded inside the same SQL query that searches: no model files, no paid embedding API. Prices come from tool calls into the checkout's own pricing engine, Llama Prompt Guard screens prompt injection, and retrieval is measured on held-out questions. [How it works](#the-festival-assistant)
- **A 3D virtual tour of the temple** at `/tour`, dressed for Sharad Utsav, plus a 3D temple at the top of the home page. Both are built in code with react-three-fiber, with no downloaded models. Six guided stops fly the camera from the marigold gateway up the grand staircase, into the mandir for darshan, then out to garba under the moon, dinner and the Garba workshop. Each caption's dates and prices come from the same festival config the checkout uses. [More](#the-3d-temple-and-virtual-tour)
- **An admin page for the festival team** at `/admin`. Every booking, searchable by reference, name, email, phone or promo code, filtered by status or festival day, with totals at the top. Opening one shows everyone in it (ages, dates of birth, days, dinners, workshop places), any Family Pass and dandiya sticks, the promo code and line-by-line price, how it was paid (card and last four digits from Stripe, with links to the payment and receipt) and its history. Volunteers check people in from the same view, only on days they're booked.
- **Savings a family would miss.** The form notices when a Family Pass, an All-Day Pass, or dropping a Family Pass under KIDSFREE would cost less, prices that option with the real engine and offers it with the exact saving. Nothing changes without the family's say-so.
- **Proven under load.** On production, 6 buyers racing for the last 2 workshop places get exactly 2 bookings. The last use of a limited promo code is protected the same way.
- **Payments that can't fail quietly.** A double click books once. If the Stripe webhook never arrives, the confirmation page checks Stripe itself. A payment that lands after its hold expired, when the stock has since sold, is refunded automatically.
- **Finishing touches.** Gold confetti and a toast when a booking is confirmed (no confetti for reduced motion), a toast for any error, a QR code for the door, a print view, and brand colours checked for contrast.

## How it's put together

```
packages/domain   Plain TypeScript, no framework: ages, dates, money, the festival catalogue,
                  booking rules, pricing, promo codes, stock checks, savings suggestions.
                  Used by both apps, so the browser shows the same rules the server enforces.
apps/api          Express 5 on Vercel. Owns prices, stock, promo codes, bookings and payments.
apps/web          Next.js 16. The booking flow, the confirmation page, the admin page and the 3D tour.
```

- **The server decides the price.** Every quote and booking is recalculated on the server from its own catalogue, stock and promo data. Fields the browser shouldn't send (like `priceCents`) are dropped. When booking, the browser sends the total it showed (`expectedTotalCents`). If the server's total differs, nothing is charged and the person sees the new total.
- **Stock is real.** Postgres (Neon) holds the starting stock. A booking holds its items for 30 minutes while the person pays. Available = starting stock − paid bookings − unexpired holds, so an abandoned payment gives its stock back without anything having to run. Creating a booking locks the inventory rows it needs (`SELECT … FOR UPDATE`, in a fixed order), re-reads stock under the lock, then inserts. Two people can't both take the last workshop place, and the tests prove it.
- **Money is integer cents** throughout. A percentage is rounded half-up, once, on the discount.
- **Dates are `YYYY-MM-DD` strings**, never `Date` objects, so a day can't shift timezone. "Today" is worked out in America/Chicago.
- **Paying twice can't book twice.** Each attempt carries an `Idempotency-Key`. The same key returns the same booking and the same Stripe link, and a key reused with a different booking is refused. The Pay button also locks while it works.
- **Payment** goes through Stripe Checkout. A booking is confirmed by the Stripe webhook. As a backup, the confirmation page also checks Stripe directly, so a late or missing webhook doesn't matter. Leaving Stripe without paying cancels the hold at once.

### Where to change things

| To change… | Look in |
|---|---|
| Prices, products, festival days, age limits, group size, hold time | `packages/domain/src/festivals/sharad-utsav-2026.ts` |
| A booking rule (who can buy what) | `packages/domain/src/rules.ts`: each rule is one function in `QUOTE_RULES` or `BOOKING_RULES` |
| How a booking turns into things bought | `packages/domain/src/items.ts` |
| Promo code behaviour | `packages/domain/src/promo.ts`; the codes themselves are in `apps/api/src/db/seed.ts` |
| Starting stock | `apps/api/src/db/seed.ts` (stored in the `inventory` table) |
| The booking form | `apps/web/src/booking/` (state in `draft.ts`, one file per step in `steps/`) |
| When a day stops selling, and who to email after that | `timeZone` and `contactEmail` in the festival config; the rule is `dayProblem` in `rules.ts` |
| Toasts and the confirmation confetti | `apps/web/src/components/Toasts.tsx`, `apps/web/src/confirmation/celebrate.ts` |
| The admin page | `apps/web/src/admin/`; its API is `apps/api/src/routes/admin.ts` and `apps/api/src/services/admin.ts` |
| The 3D tour's stops, captions and camera positions | `apps/web/src/tour/stops.ts`; the scene is built in `apps/web/src/tour/` |

## Running it locally

Needs Node 22.12+ (24 recommended) and pnpm 11.

```bash
pnpm install
cp .env.example .env                       # fill in the values (see below)
echo "NEXT_PUBLIC_API_URL=http://localhost:4000" > apps/web/.env.local

pnpm --filter @rktd/api db:migrate         # create tables
pnpm --filter @rktd/api db:seed            # starting stock and promo codes (safe to re-run)
pnpm --filter @rktd/api assistant:model    # once: load the embedding model into Postgres
pnpm --filter @rktd/api assistant:ingest   # load the festival guide for the assistant

pnpm dev                                   # API on :4000, web on :3000
pnpm test                                  # all tests
```

The integration tests and the scripts use the database in `.env`. The integration tests work inside a throwaway schema, so they never touch real stock.

## Environment variables

Set on Vercel under Project → Settings → Environment Variables.

**API project (`apps/api`)**

| Variable | What it's for |
|---|---|
| `DATABASE_URL` | Neon Postgres (pooled connection string) |
| `STRIPE_SECRET_KEY` | Stripe test-mode secret key |
| `STRIPE_WEBHOOK_SECRET` | Signing secret of the Stripe webhook pointing at `/api/webhooks/stripe` |
| `BOOKING_TOKEN_SECRET` | Signs the private link to each booking (an HMAC of the reference), so nothing secret is stored |
| `WEB_ORIGIN` | The web app's URL: allowed by CORS and used for Stripe's return links |
| `ADMIN_PASSCODE` | Passcode for the admin page (6+ characters). Without it the admin API answers 503 |
| `RESEND_API_KEY`, `EMAIL_FROM` | Confirmation emails (optional) |
| `GROQ_API_KEY` | The assistant's language model (optional; without it the assistant answers from search alone) |
| `LOCAL_LLM_URL`, `LLM_MODEL` | Optional: any OpenAI-compatible local model (e.g. Ollama) for development |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Rate limiting (optional; off without them) |

**Web project (`apps/web`)**

| Variable | What it's for |
|---|---|
| `NEXT_PUBLIC_API_URL` | The API's URL |

## API

Every error has the same shape:

```json
{ "error": { "code": "PRICE_CHANGED", "message": "Your total is now $93.60. Please check it before paying.", "issues": [], "fieldErrors": [], "quote": {} } }
```

`issues`, `fieldErrors` and `quote` appear only when relevant. Status codes: 400 for malformed input, 401 for a wrong passcode, 404, 409 when stock or the price changed, 422 when a booking rule fails, 429 when rate-limited, 502 when Stripe failed, 503 when busy.

| Method & path | Send | Get back |
|---|---|---|
| `GET /api/festival` | – | Event (with its time zone and contact email), days (with `onSale`, `hasWorkshop`), age policy, products with price and live stock (`left`, `status`: `AVAILABLE` / `LOW` / `SOLD_OUT`) |
| `POST /api/quotes` | `QuoteRequest` | `{ quote, issues, suggestions, canBook }` |
| `POST /api/bookings` + header `Idempotency-Key` | `BookingRequest` | `201 { reference, accessToken, status, totalCents, holdExpiresAt, checkoutUrl }`. `checkoutUrl` is `null` for a $0 booking, which is confirmed at once |
| `GET /api/bookings/:reference` + `Authorization: Bearer <accessToken>` | – | Booking: status, people with ages, tickets and days, totals, email status |
| `POST /api/bookings/:reference/cancel` + bearer token | – | The booking. Releases an unpaid hold and expires its Stripe session |
| `POST /api/webhooks/stripe` | Stripe event (signed) | `{ received: true }` |
| `GET /api/admin/bookings?q=&status=&day=&offset=` + `X-Admin-Passcode` | – | Up to 50 bookings, newest first, matching a reference, name, email, phone or promo code: `{ bookings, total, statusCounts, stats }` |
| `GET /api/admin/bookings/:reference` + `X-Admin-Passcode` | – | One booking in full: people with dates of birth and check-ins, Family Pass groups, the quote and promo code, the payment (card from Stripe, dashboard and receipt links) and the customer's page link |
| `PUT /api/admin/check-ins` + `X-Admin-Passcode` | `{ reference, attendeeId, day, checkedIn }` | `{ ok: true }`. Refused for a day the person isn't booked |
| `POST /api/assistant` | `{ messages: [{ role, content }] }` | `{ answer, sources, answeredBy }` |

A `QuoteRequest` describes who is coming, never what anything costs:

```json
{
  "attendees": [
    { "id": "a1", "firstName": "Asha", "dateOfBirth": "1988-04-12",
      "entry": { "type": "DAY_PASS", "days": ["2026-11-11", "2026-11-13"] },
      "dinnerDays": ["2026-11-11"], "workshopDays": ["2026-11-13"] },
    { "id": "c1", "dateOfBirth": "2018-03-02", "entry": { "type": "ALL_DAY_PASS" } },
    { "id": "b1", "dateOfBirth": "2023-01-20", "entry": { "type": "NO_TICKET", "days": ["2026-11-11"] } }
  ],
  "familyGroups": [],
  "dandiyaPairs": 2,
  "promoCode": "SEVA10"
}
```

`entry.type` is `DAY_PASS` (with days), `ALL_DAY_PASS`, `FAMILY_PASS` (with `familyGroupId`), or `NO_TICKET` (only for under-5s, with days). The adult or child version of a pass is never sent: the server works it out from the date of birth. A `BookingRequest` adds `firstName` and `lastName` for everyone, a `booker`, and `expectedTotalCents`. The booker is either `{ attending: true, attendeeId, email, phone }` or `{ attending: false, firstName, lastName, dateOfBirth, email, phone }`.

The quote response gives priced `lines`, `subtotalCents`, `discountCents`, `totalCents` and `promo` (`APPLIED`, `NO_EFFECT`, `EXPIRED`, `NOT_STARTED`, `USED_UP` or `NOT_FOUND`, each with a message). It also gives `issues` (`code`, `severity` error or warning, a `message`, and a `target`: the booking, the booker, an attendee, a family pass or a product) and `suggestions` (a typed `change` the client can apply, with `savingsCents` and a message).

## Decisions I made

The brief leaves some situations open on purpose. These are the ones I found, what I decided, and why.

1. **A birthday during the festival.** Ages for tickets are taken on the first day, Tue 10 Nov 2026, and that one age holds all week. A child who turns 12 on the 12th pays child prices every day, and one who turns 5 mid-week comes free. It's simple to explain at the door and never charges a family more partway through.
2. **Date of birth, not age.** For the same reason: "age" is ambiguous over five days, and the server can't work out the right band from a number someone typed in October. Children don't get email or phone fields; the booker is their contact.
3. **The person paying must be 18 on the day they book**, not on the festival day, because they are paying now. They don't have to come: "I'm coming too" is a tick-box. A non-attending booker holds no ticket.
4. **Under-5s are listed but free.** Each has a name and date of birth so the festival team knows everyone who's coming, holds no ticket and uses no stock. They can have a dinner plate, so they pick the days they're coming.
5. **Family Pass = exactly 2 adults (12+) and 2 children (5–11), per day.** Taken literally, that's what it covers, and no group is worse off: 2 adults + 1 child, or 1 adult + 2 children, pay less on separate passes anyway. A family coming on two days buys two passes and everyone still holds one kind of ticket. Extra people, like a third child, take their own pass, and a 13-year-old counts as an adult. In the form, one Family Pass group per booking (see Unfinished). Everyone keeps one kind of ticket for all their days, so if Dad also comes alone on the Friday, the whole family goes on Day Passes ($107, where a Family Pass for Wed and Thu plus his Friday Day Pass would be $95). Within a booking that can't be got round, because each person has exactly one ticket. A second booking just for his Friday would get round it, and with no accounts the two can't be linked, so I've left that open.
6. **Cheaper options are suggested, never applied silently.** A child on 4 or 5 Day Passes ($32/$40) is offered the $30 All-Day Pass. 2 adults + 2 children on the same day are offered a Family Pass. With KIDSFREE, separate passes beat the Family Pass and the form says so. Each suggestion is re-priced by the real pricing code, so the saving shown is the saving you get. Changing what someone picked behind their back felt wrong.
7. **KIDSFREE frees child Day and All-Day passes only.** Not the Family Pass, which is a family ticket, and not extras like a child's dinner. If it has nothing to discount, it says why and isn't counted as a use.
8. **SEVA10 and FLAT20 apply to the whole booking, extras included.** FLAT20 can't take a total below $0. A $0 booking is confirmed straight away with no payment step, since Stripe can't take $0. There's no minimum spend because the brief doesn't give one; it's a question for the committee.
9. **Promo codes.** One per booking, matched regardless of case or spaces. EXPIRED5 ended on 30 Sep 2026 and says so. MAXEDOUT allows 100 uses and 100 were made before this system. A booking holds its use of a limited code while unpaid, exactly like stock, so two people can't both take the last use.
10. **Extras only on days you're coming.** Dinner and workshop places belong to a person and a day they attend. The workshop is only on Wed 11 and Fri 13. Dandiya sticks are capped at 20 pairs per booking ("any reasonable quantity").
11. **The adult All-Day Pass is sold out**, so an adult coming every day pays $75 in Day Passes. I didn't cap it at $60: sold out means sold out. The page says so where you'd choose it.
12. **Each day sells online until 11:59pm Central Time.** The brief gives dates but no hours, so the temple's own clock in Allen decides. A family can book any day up to 11:59pm that day, even that same evening, and nobody has to book ahead. At 12:00am, when the next day starts, the day closes: the form greys it out, and the server refuses it with "Online booking for Tue, Nov 10 closed at midnight Central Time. To request a place, email ravi_chandra@jkyog.org." All-Day Passes stop selling at 12:00am on Tue 10 Nov, when the festival starts, because they'd charge full price for fewer days. All booking closes at 12:00am on Sun 15 Nov. The clock is never the server's or the visitor's: Vercel runs on UTC, where 6pm in Allen is already the next day, so Tuesday would otherwise stop selling just as the evening began. Tests pin both midnights.
13. **How stock is counted.** As the brief lists it: one pool per product. A Day Pass for three days uses three Day Pass units (one per person per day). The workshop's 2 places are shared across both sessions. Being cautious can't oversell, and `stockKeyFor` in `stock.ts` is the one place to make it per-day if the committee meant that.
14. **Holds last 30 minutes**, Stripe Checkout's shortest session, plus 5 minutes' grace so a payment made in the last second still finds its stock. If a payment arrives after the hold has gone and the stock was sold, it's refunded automatically instead of overselling.
15. **Children with no adult.** If a booking has children on a day when nobody 18+ in it is coming, the form shows a reminder but doesn't block. Their adult may be on another booking.
16. **Proof of age** can't be checked online. Before paying, the booker ticks a box confirming the dates of birth (and that children may be asked their age), and the admin page shows everyone's age for the door.
17. **Up to 20 people per booking**, under-5s included, and the same name plus date of birth twice is refused. This stops one booking hoarding stock in holds.
18. **No accounts.** A booking reference plus a secret link (an HMAC of the reference) is enough for a festival, and nothing secret is stored. The form keeps its details in session storage: they survive the trip to Stripe and back, but not closing the tab on a shared device.

## Changes from the design note

- **Shared package build.** The domain package is compiled to JavaScript before the apps use it. Turbopack and Vercel's Express builder each resolve TypeScript in a workspace package differently, and compiled output works everywhere.
- **No branded types.** The design note planned a branded `Cents` type. I dropped it for plain integer cents (and plain date strings) so rules read simply; integer maths is guaranteed by construction and pinned by tests.
- **Endpoints added:** the admin page (`/api/admin/*`) and the assistant (`/api/assistant`). Errors gained `issues`/`fieldErrors`/`quote` in place of a generic `details`.
- **Promo uses are held like stock**, which I hadn't planned. I noticed MAXEDOUT's last use could race the same way the last workshop place does.
- **The extras became first steps.** The design note's extras were a LangGraph agent, AR, photo ID and wallet passes. I built the groundwork for the first two instead: a retrieval assistant that an agent would sit on top of, and a 3D temple (which grew into a full virtual tour) that an AR view would reuse. Photo ID and wallet passes weren't started, so the door still checks ages by eye.

## The festival assistant

"Ask about the festival" opens a small helper. It answers from a festival guide (`apps/api/src/assistant/knowledge/*.md`, written from the brief and the decisions above, with nothing invented). For prices and stock it calls the same code the checkout uses.

- **Embeddings:** potion-base-8M, a static embedding model: one fixed vector per token. A sentence's embedding is the average of its token vectors, so the whole model lives in Postgres (`token_embeddings`) and a question is embedded with `avg()` in the same SQL query that searches. The API carries no model files and calls no paid embedding service. The tokenizer is stored in Postgres too.
- **Hybrid search:** pgvector cosine search and Postgres full-text search each pick their best 20 sections, fused with reciprocal rank fusion. `pnpm --filter @rktd/api assistant:eval` measures it:

  | 10 held-out questions | hit@1 | hit@3 | hit@6 | MRR |
  |---|---|---|---|---|
  | keyword only | 40% | 60% | 60% | 0.50 |
  | vector only | 40% | 60% | 70% | 0.54 |
  | hybrid | 30% | 60% | **80%** | 0.48 |

  The model gets the top 6 sections, so hit@6 matters most. Adding "Also asked" phrasings to the guide raised the tuning set to 71% hit@1 and 96% hit@3, but didn't help the held-out set. A static model is weak on paraphrase, and I'd rather report that than hide it.
- **Answers:** Groq (`gpt-oss-120b`, falling back to `gpt-oss-20b` when the free tier's per-minute limit is hit, then to quoting the guide). Tools: `price_tickets` (the real pricing engine, so it never does sums itself) and `check_availability`. Llama Prompt Guard screens each question first. It won't share promo codes or make bookings, and it says when the guide doesn't know (parking, opening times).

## The 3D temple and virtual tour

Both are built from code with three.js and react-three-fiber: no downloaded models, so no licences and nothing large to fetch.

**The home-page temple** loads after the page, pauses when scrolled away, stays still for anyone who prefers reduced motion, and can't be dragged on touch screens, so swiping over it still scrolls the page. The booking form never waits for it.

**The virtual tour** (`/tour`) is modelled on photos of Radha Krishna Temple of Dallas and what the temple publishes about its building and its Navratri celebrations. It's a stylised model, not a measured replica.

- **The scene:** white marble walls with carved panels, four towers with gold tops and smaller side spires, domed pavilions on the corners, balustraded terraces, a 16-step staircase with a blue carpet and two white elephants, and Radha and Krishna in the mandir. Outside are three garba circles of 56 dancers turning under string lights, a band stage, food stalls, diners and a workshop pavilion, all on an evening with a full moon and lamps.
- **The tour:** six stops. The camera dives in from above, then flies between stops (through the door into the hall). Visitors can drag to look around and zoom within limits. Next and Previous, a numbered stop list, the arrow keys and links like `/tour?stop=garba` all work.
- **Captions are real:** dates, prices and workshop days come from `SHARAD_UTSAV_2026`, the same config the checkout prices from. The page makes no API calls.
- **Fast enough for phones:** repeated geometry (dancers, balusters, lamps) is drawn with instanced meshes, and the 3D code loads only after the page shell. Screen resolution is capped on touch screens and drops if the frame rate falls.
- **For everyone:** the guide is plain HTML that's keyboard-operable and announced to screen readers. With reduced motion the camera cuts between stops and nothing animates. Without WebGL, the tour is shown as text with the booking button.

## Colour contrast

| Pair | Ratio | What I did |
|---|---|---|
| White on `#2C2C2C` | 13.97 | Body text on dark |
| `#C99B24` text on `#2C2C2C` | 5.45 | Headings and prices on dark |
| `#291900` on `#C99B24` buttons | 6.65 | Button text is dark: white on gold is only 2.56 |
| `#645743` on `#FDF3E4` | 6.40 | Body text on cream panels |
| Gold on cream | 2.33–2.63 | Too faint for text, so text on cream uses a deeper gold, `#8A6A12` (4.61) |
| `#EF1F1F` red | 3.25 dark / 3.91 cream | Kept for borders and icons. Error text uses `#FF6B6B` on dark (5.03) and `#B3261E` on cream (5.95) |
| `#28A736` green | 4.44 dark / 2.87 cream | Kept for borders. Success text uses `#4CC85A` on dark (6.46) and `#1E7A2A` on cream (4.94) |
| Toasts | 4.94–15.50 | Cream toasts with brand borders. Success text `#1E7A2A` on `#EDF7EE` (4.94), error text `#B3261E` on `#FDECEA` (5.72) |

## Tests

```bash
pnpm test     # 81 tests
```

- `packages/domain` (55): every price, multi-day, Family Pass, extras, every promo code and its rounding, totals always whole cents, age boundaries (4/5, 11/12, leap-day birthdays, birthdays mid-festival), the midnight cut-offs in Central Time, every booking rule, and the savings suggestions.
- `apps/web` (13): the booking state keeps people and tickets matched as the family changes its mind, and "same days for everyone" keeps everyone on the first person's days.
- `apps/api` (13, against real Postgres in a throwaway schema): 3 people racing for the last 2 workshop places, an expired hold returning stock, a double click, a reused key, a stale total, a $0 booking, MAXEDOUT, two people racing for the last use of a limited code, and the admin page: search by reference, name, email and phone, an expired hold counted as expired, the day filter (an All-Day Pass counts on every day), a booking in full, and check-ins only on booked days.

Two scripts check a running API (local or production):

```bash
node apps/api/scripts/race-test.mjs https://rktd-sharad-utsav-api.vercel.app 6   # 6 buyers, 2 places: 2 succeed
node apps/api/scripts/contract-check.mjs https://rktd-sharad-utsav-api.vercel.app <admin passcode>   # 58 checks
```

`TEST-CASES.md` lists the situations I checked and what the app does in each.

## Unfinished, stated plainly

- **Rate limiting is off in production.** It's built (Upstash), but the REST credentials (`UPSTASH_REDIS_REST_URL`/`TOKEN`) aren't set yet. Until they are, nothing stops someone spamming quotes, holds or the assistant.
- **Confirmation emails** only reach the Resend account owner. Without a verified sending domain, Resend's sandbox refuses other addresses. The confirmation page, QR code and print view work regardless, and the page says if the email failed.
- **Paid bookings can't be changed, cancelled or refunded online.** That needs a policy.
- **One Family Pass per booking in the form.** The API and rules support several, so two families in one booking would need the API or two bookings.
- **The admin page can't change prices, stock or promo codes**: they're config and seed data. It uses one shared passcode, not accounts, so it doesn't record who checked someone in.
- **Holds are 30 minutes** because that's Stripe Checkout's minimum. Shorter holds would mean actively expiring Stripe sessions.
- **The assistant** runs on Groq's free tier (about 8k tokens a minute). Under load it falls back to a smaller model, then to quoting the guide.

## Ten festivals, ten rule sets

Every rule already takes the festival's config as an argument, so that's the seam:

- Move `FestivalConfig` into the database, one row per festival, and add `festival_id` to inventory, promo codes and bookings.
- Make product rules data, not code: age bands, pricing unit (per person, per day, per family), family composition, stock scope (pool or per day), session days.
- Rules stay functions, but each festival lists which ones apply, with parameters (minimum ages, caps, composition).
- Let the admin page edit each festival's prices, stock and codes, with an audit log, and give the team named accounts instead of one passcode.
- Theme and domain per festival.
