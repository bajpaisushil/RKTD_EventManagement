// Measures retrieval on questions phrased the way families actually ask them.
// Each question names the guide section that should come back. The assistant
// passes the top 6 sections to the language model, so hit@6 is the number that matters most.
//   pnpm --filter @rktd/api assistant:eval

import { pool } from "../db.js";
import { searchKnowledge, type SearchMode } from "./search.js";

const QUESTIONS: [question: string, expectedHeading: string][] = [
  ["is my 3 year old free?", "Ages: Under-5s"],
  ["do toddlers need a ticket", "Ages: Under-5s"],
  ["my son turns twelve during the festival, which price?", "Ages: Which age counts"],
  ["why do you need a date of birth", "Ages: Why we ask for a date of birth"],
  ["I'm 17, can I book for my friends?", "Ages: The person booking"],
  ["can a grandparent book for the kids without coming", "Ages: The person booking"],
  ["do kids need a grown up with them", "Ages: Children with an adult"],
  ["will someone check my child's age at the entrance", "Ages: Proof of age"],
  ["how much is a ticket for one evening", "Tickets and prices: Ticket types"],
  ["is the family pass worth it for 2 parents and 3 kids", "Tickets and prices: Family Pass"],
  ["does my 13 year old count as a child on the family ticket", "Tickets and prices: Teenagers"],
  ["can I buy a season ticket for all five nights for an adult", "Tickets and prices: All-Day Pass"],
  ["can my mum and I have different kinds of ticket", "Tickets and prices: One kind of ticket per person"],
  ["when is the garba class", "Extras: Garba Workshop"],
  ["can I buy dinner for my baby", "Extras: Dinner plates"],
  ["how many dandiya sticks can I buy", "Extras: Dandiya sticks"],
  ["does the discount code work on food too", "Extras: Promo codes and extras"],
  ["can I get my money back", "Booking and payment: Changes, cancellations and refunds"],
  ["I closed the payment page by mistake", "Booking and payment: Payment"],
  ["how long are my tickets held while I pay", "Booking and payment: Payment"],
  ["where's my confirmation and QR code", "Booking and payment: Confirmation"],
  ["we are a group of 25 people", "Booking and payment: Group size"],
  ["can I still book on the third day of the festival", "Booking and payment: Booking during the festival"],
  ["what do I show at the door", "At the festival: Checking in at the door"],
  ["I lost my booking email", "At the festival: Lost your reference"],
  ["where do I park", "Sharad Utsav 2026: Things this guide doesn't cover"],
  ["what is sharad utsav about", "Sharad Utsav 2026: What Sharad Utsav celebrates"],
  ["what dates is the festival", "Sharad Utsav 2026: When and where"],
];

// Written before the guide was tuned, and never used to tune it.
const HELD_OUT: [question: string, expectedHeading: string][] = [
  ["my baby is 2, does she need a pass?", "Ages: Under-5s"],
  ["can I cancel my booking", "Booking and payment: Changes, cancellations and refunds"],
  ["what time does it start each evening", "Sharad Utsav 2026: Things this guide doesn't cover"],
  ["what happens if I don't finish paying", "Booking and payment: Payment"],
  ["can my 16 year old pay for the tickets", "Ages: The person booking"],
  ["do I need to bring ID for my daughter", "Ages: Proof of age"],
  ["the adult pass for every day says sold out", "Tickets and prices: All-Day Pass"],
  ["how do I learn the dance steps", "Extras: Garba Workshop"],
  ["what is dandiya", "Sharad Utsav 2026: Garba and Dandiya Raas"],
  ["is there a deal for two parents and two kids", "Tickets and prices: Family Pass"],
];

const MODES: SearchMode[] = ["keyword", "vector", "hybrid"];

async function evaluate(name: string, questions: [string, string][]): Promise<void> {
  console.log(`\n${name} (${questions.length} questions)`);
  for (const mode of MODES) {
    let hitsAt1 = 0;
    let hitsAt3 = 0;
    let hitsAt6 = 0;
    let reciprocalRanks = 0;
    const misses: string[] = [];
    for (const [question, expected] of questions) {
      const results = await searchKnowledge(question, { limit: 10, mode });
      const rank = results.findIndex((hit) => hit.heading === expected) + 1;
      if (rank === 1) hitsAt1++;
      if (rank >= 1 && rank <= 3) hitsAt3++;
      if (rank >= 1 && rank <= 6) hitsAt6++;
      if (rank >= 1) reciprocalRanks += 1 / rank;
      if (rank !== 1) misses.push(`     ${rank || "–"}  ${question}`);
    }
    const percent = (n: number) => `${Math.round((100 * n) / questions.length)}%`.padStart(4);
    console.log(`  ${mode.padEnd(8)} hit@1 ${percent(hitsAt1)}  hit@3 ${percent(hitsAt3)}  hit@6 ${percent(hitsAt6)}  MRR ${(reciprocalRanks / questions.length).toFixed(2)}`);
    if (process.argv.includes("--misses")) console.log(misses.join("\n"));
  }
}

await evaluate("Tuning set", QUESTIONS);
await evaluate("Held-out set", HELD_OUT);
await pool.end();
