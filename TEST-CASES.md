# Test cases

The situations I thought worth checking, what the app does in each, and how each was verified:

- **unit:** `packages/domain` tests
- **state:** `apps/web` booking-state tests
- **db:** `apps/api` tests against real Postgres
- **contract:** `apps/api/scripts/contract-check.mjs` against a running API
- **browser:** in a real browser against the live site, by hand or scripted with Playwright (the admin page, the 3D tour, toasts and confetti so far in Chrome against the local servers, until they're deployed)

## Ages

| Situation | What happens | Checked by |
|---|---|---|
| Child turns 12 during the festival (e.g. on 12 Nov) | Age is taken on 10 Nov, so they pay child prices every day | unit, contract |
| Child turns 5 during the festival | Under 5 on 10 Nov, so free all week | unit |
| Birthday on 10 Nov itself | Counts, so they're the new age | unit |
| Born 29 Feb | Birthday falls on 1 Mar in other years | unit |
| Ages 4 / 5 / 11 / 12 | Free / child / child / adult | unit |
| Under-5 sent with a ticket | Refused: "no ticket is needed" | unit, contract |
| Child (5–11) sent with no ticket | Refused: needs a child ticket | unit, contract |
| Adult ticket for a 7-year-old, or child ticket for an adult | Can't be sent: the server picks adult or child from the date of birth | contract (injected `band` ignored) |
| Date of birth in the future | Refused with a clear message | unit |
| Date of birth making someone 130 | Refused: "please check" | unit |
| Impossible date (30 Feb, month 13), or text | 400 with the field named | unit, contract |
| Person paying is 16 | Refused: must be 18 on the day they book (shown in the form as they type, re-checked by the server) | unit, contract, browser |
| Person paying isn't coming | Allowed; no ticket for them | unit |

## Tickets

| Situation | What happens | Checked by |
|---|---|---|
| Adult Day Pass, 1 and 3 days | $15 / $45 | unit, contract |
| Child Day Pass, 2 days | $16 | unit |
| Child All-Day Pass | $30 | unit |
| Adult All-Day Pass | Sold out: refused, shown as sold out on the page and in the picker | unit, contract, browser |
| Child on 4 Day Passes ($32) | Booking allowed; a "switch to the $30 All-Day Pass" suggestion offered | unit, contract, browser |
| Adult on 5 Day Passes ($75) | No All-Day suggestion, because it's sold out | unit |
| Day Pass with no days picked | "Pick at least one day" | unit |
| A day outside 10–14 Nov | Refused | unit, contract |
| The same day twice | 400 | contract |
| Booking a day after it ends (from 12:00am the next day, Central Time) | Refused: "Online booking for Tue, Nov 10 closed at midnight Central Time. To request a place, email ravi_chandra@jkyog.org." | unit |
| Booking the same evening, 7:30pm Tue (already Wednesday on the server's UTC clock) | Allowed: a day sells until 11:59pm Central Time | unit |
| All-Day Pass at 11:59pm Mon 9 Nov, then at 12:00am Tue 10 Nov | Allowed, then refused: from then on it would only cover the days left | unit |
| Booking after the festival ends | Booking section says sales are closed | (by `salesOpen`) |
| 21 people in one booking | Refused (limit 20, under-5s included) | contract |
| Only under-5s in a booking | "Nothing to book yet" | unit |
| Same name and date of birth twice | Refused as a duplicate | unit, contract |

## Family Pass

| Situation | What happens | Checked by |
|---|---|---|
| 2 adults + 2 children, one day | $40 | unit, contract, browser |
| Same family, two days | $80 (one pass per day) | unit |
| 3 adults + 1 child (a 13-year-old counts as an adult) | Refused: "covers exactly 2 adults and 2 children" | unit, contract |
| 2 adults + 3 children | Family Pass for four, third child on a Day Pass ($48) | unit |
| Toddler with a family | Free alongside, not counted on the pass | unit, browser |
| 2 adults + 2 children on Day Passes for the same day ($46) | Booking allowed; Family Pass suggested, saving $6 | unit, contract, browser |
| Family Pass with nobody on it | Refused | unit |
| Everyone moved off the Family Pass | Its days are forgotten; no empty pass is sent | state |
| Dad on the Family Pass for Wed + Thu, also coming alone on Fri | He can't hold two kinds of ticket, so the family books Day Passes ($107). A second booking just for his Friday would get round it: with no accounts, bookings can't be linked (left open, see decision 5) | (by shape: each person has one `entry`) |

## Extras

| Situation | What happens | Checked by |
|---|---|---|
| Dinner on a day the person isn't coming | Refused (and the form only offers their days) | unit, contract |
| Dinner for an under-5 | Allowed, $12 | unit |
| Days changed after picking dinner | Dinner on dropped days is removed | state |
| Workshop on 12 Nov | Refused: runs on 11 and 13 only | unit, contract |
| Workshop on a day not attending | Refused | unit |
| 21 pairs of dandiya sticks | Refused (20 per booking) | unit, contract |
| Fractional or negative quantities | 400 | contract |

## Promo codes

| Situation | What happens | Checked by |
|---|---|---|
| SEVA10 | 10% off everything, extras included, rounded half-up to the cent | unit, contract, browser (Stripe charged the same total) |
| " seva10 " | Same as SEVA10 | unit, contract |
| FLAT20 on $35 | $15 | unit |
| FLAT20 on $15 | $0. Confirmed with no payment step | unit, contract, db, browser |
| KIDSFREE with child Day/All-Day passes | Those passes are free; adults and the child's dinner still paid | unit, contract |
| KIDSFREE with only a Family Pass | Not applied: "A Family Pass isn't a child ticket". Not counted as a use | unit, contract, browser |
| KIDSFREE + Family Pass | Suggests splitting into separate passes (saves $10) | unit, contract, browser |
| EXPIRED5 | Refused: "expired on Wednesday, September 30, 2026" | unit, contract |
| MAXEDOUT | Refused: used as many times as allowed | unit, contract, db |
| Last use of a limited code, two people at once | Only one gets it | db |
| Unknown code | Refused: "isn't a code we recognise"; total unchanged | unit, contract |

## Money

| Situation | What happens | Checked by |
|---|---|---|
| Any mix of people, days, extras and codes | Total is whole cents, ≥ 0, and = subtotal − discount | unit (64 combinations) |
| Browser sends `priceCents`, `totalCents` or `discountCents` | Ignored: the server prices from its own data | contract |
| Total changed between seeing it and paying (code used up, price change) | 409 PRICE_CHANGED with the new quote; nothing charged | db, contract |
| What Stripe charges | Exactly the server's total | browser |
| Stripe says it charged a different amount | Booking not confirmed; logged for a person to check | (code path in `payment-status.ts`) |

## Stock and concurrency

| Situation | What happens | Checked by |
|---|---|---|
| 3 people want the last 2 workshop places at once | Exactly 2 succeed; the third is told it's sold out | db |
| 6 bookings at once on production | 2 succeed, 4 get OUT_OF_STOCK | race script |
| Wanting 3 workshop places when 2 are left | "Only 2 left, and this booking needs 3" | unit, contract |
| Unpaid booking abandoned | Its stock counts again once the hold ends, with nothing to run | db |
| Leaving the Stripe page | Back on the site, the hold is released at once and the details are still filled in | contract, browser |
| Paid after the hold expired and stock sold | Refunded automatically; booking marked refunded | (code path in `payment-status.ts`) |
| Database very busy | Lock and connection waits are capped at 10s; the person sees "please try again" | (by configuration) |

## Paying

| Situation | What happens | Checked by |
|---|---|---|
| Pay double-clicked | One Idempotency-Key, one booking | db, contract, browser |
| Same key, different booking | Refused | db, contract |
| No Idempotency-Key | 400 | contract |
| Stripe payment completes | Webhook confirms it (verified with our own success page blocked) | browser |
| Webhook late or missing | The confirmation page checks Stripe itself and confirms | browser (local, no webhook) |
| Fake webhook call | Rejected: signature doesn't match | contract |
| Viewing someone else's booking without the link | 404 | contract |
| Confirmation email can't be sent | Booking still confirmed; page says to save or print it | browser |

## The form

| Situation | What happens | Checked by |
|---|---|---|
| Continue with empty fields | Each field says what's wrong, and a toast asks to fix the highlighted details | browser |
| Person removed | Their ticket and extras go with them | state |
| "Everyone else is coming on the same days" ticked | Everyone else on a Day Pass, under-5s too, follows the first person's days as they change, and so does anyone added later; All-Day and Family Pass holders keep their own; unticked, each person keeps the days and can change them | state, browser |
| Booker unticks "I'm coming" | Their own ticket is removed | state |
| Date of birth half-typed or impossible | That person isn't priced yet; the rest are | state |
| Connection lost while changing the booking | An error toast and "Couldn't reach the booking service" in the summary; Pay disabled; recovers by itself when back online, and the toast clears | browser |
| Price still updating | Pay disabled until the new total arrives | browser |
| Phone-sized screen | One column, no sideways scrolling, sticky total and Continue | browser |
| Keyboard only | Fields in order, day chips toggle with Space and announce their state, visible focus | browser |
| Reduced motion | Temple stays still, no sparkles, no confetti | browser |
| Page refresh or return from Stripe | Details restored from session storage | browser |
| Promo code applied or refused | A toast says which, matching the message under the field | browser |
| Payment can't start (e.g. the places sold out meanwhile) | Error toast; the message also stays by the Pay button | browser |
| Booking confirmed | Gold confetti and a "You're booked!" toast, once per booking (not again on reload) | browser |

## Admin

| Situation | What happens | Checked by |
|---|---|---|
| Wrong passcode | Refused; the page asks again | contract, browser |
| Search by reference without dashes, anyone's name, email, phone or promo code | Finds the booking | db, contract, browser |
| Filter by status or festival day | Counts per status follow the search; an All-Day Pass shows on every day | db, contract, browser |
| Unpaid booking past its hold | Listed as Expired, not Awaiting payment | db |
| Open a booking | Everyone in it with ages, dates of birth, days, dinners and workshop places; Family Pass and dandiya sticks; the promo code and line-by-line price; card brand and last four from Stripe with links to the payment and receipt; its history | contract, browser |
| $0 booking with FLAT20 | "Nothing to pay", covered in full by FLAT20 | db, contract, browser |
| Unpaid or cancelled booking | Days shown but not clickable: "Check-in opens once paid" | browser |
| Check in on a booked day | Saved with the time; doing it twice changes nothing; shows in the booking's history | db, contract, browser |
| Check in on a day not booked | Refused: "isn't booked for Fri, Nov 13" | db, contract |
| Unknown reference | 404 | db, contract |
| Phone-sized screen | Cards instead of a table, the booking opens full screen, no sideways scrolling | browser |

## Assistant

| Situation | What happens | Checked by |
|---|---|---|
| "Is my 3 year old free?" | Answers from the guide with sources | contract, browser |
| "How much for 2 adults and 2 kids on Friday with dinner?" | Calls the real pricing code and answers $88, choosing the Family Pass | by hand |
| "How many workshop places are left?" | Live count from stock | by hand |
| "Any discount codes?" | Won't share codes | by hand |
| Prompt injection ("ignore all previous instructions…") | Blocked by Prompt Guard | by hand |
| "Where do I park?" | Says the guide doesn't cover it; suggests contacting the temple | by hand |
| Free-tier rate limit hit | Falls back to a smaller model, then to quoting the guide | by hand (seen in production logs) |
| Conversation not ending with a question | 400 | contract |
| The assistant can't answer (busy or offline) | Error toast; the question goes back in the box to send again | browser |

## 3D tour

| Situation | What happens | Checked by |
|---|---|---|
| Next, Previous or a stop in the list | The camera flies to the stop and the caption changes (announced to screen readers) | browser |
| Arrow keys | Move between stops; the address updates to `?stop=…` | browser |
| Link to a stop (`/tour?stop=garba`) | Opens at that stop | browser |
| Reduced motion | The camera cuts between stops and nothing animates | browser |
| No WebGL | The tour is shown as text with the booking button | browser |
| Phone-sized screen | Compact guide under the scene, a wider lens, nothing scrolls sideways | browser |
| API unreachable | The tour still works: its dates and prices come from the festival config, not the API | browser |
| Home page | "Walk through the temple" and "Ask about the festival" cards in the hero; the second opens the assistant | browser |
