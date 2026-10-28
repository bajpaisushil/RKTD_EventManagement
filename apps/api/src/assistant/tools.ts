import { festivalView, formatCents, quoteBooking, type QuoteRequest } from "@rktd/domain";
import type { ChatCompletionFunctionTool } from "openai/resources/chat/completions";
import { z } from "zod";
import { festival } from "../festival.js";
import { loadPromoCheck } from "../services/promos.js";
import { loadStockLeft } from "../services/stock.js";

export const TOOLS: ChatCompletionFunctionTool[] = [
  {
    type: "function",
    function: {
      name: "check_availability",
      description: "Live count of each ticket and extra still available. Use for questions like 'is it sold out' or 'how many workshop places are left'.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "price_tickets",
      description:
        "Exact price for a group, worked out by the real booking system, with any warnings and cheaper options. Use it for every price question and never do the sums yourself.",
      parameters: {
        type: "object",
        properties: {
          adults: { type: "integer", minimum: 0, maximum: 20, description: "People aged 12 or over" },
          children: { type: "integer", minimum: 0, maximum: 20, description: "Children aged 5 to 11" },
          under_fives: { type: "integer", minimum: 0, maximum: 20, description: "Children under 5 (free)" },
          days: {
            type: "array",
            items: { type: "string", enum: festival.days },
            description: "Festival days they're coming, as YYYY-MM-DD",
          },
          ticket: { type: "string", enum: ["DAY_PASS", "ALL_DAY_PASS", "FAMILY_PASS"], description: "Defaults to DAY_PASS" },
          dinner_every_day: { type: "boolean", description: "A dinner plate for everyone on each day" },
          dandiya_pairs: { type: "integer", minimum: 0, maximum: 20 },
          promo_code: { type: "string", description: "Only if the person gave you a code" },
        },
        required: ["adults", "children", "days"],
        additionalProperties: false,
      },
    },
  },
];

const PriceArgsSchema = z.object({
  adults: z.number().int().min(0).max(20).default(0),
  children: z.number().int().min(0).max(20).default(0),
  under_fives: z.number().int().min(0).max(20).default(0),
  days: z.array(z.string()).min(1),
  ticket: z.enum(["DAY_PASS", "ALL_DAY_PASS", "FAMILY_PASS"]).default("DAY_PASS"),
  dinner_every_day: z.boolean().default(false),
  dandiya_pairs: z.number().int().min(0).max(20).default(0),
  promo_code: z.string().max(40).optional(),
});

// Someone whose birthday falls on the first festival day, so they are exactly `age` years old.
function dateOfBirthForAge(age: number): string {
  const reference = festival.agePolicy.referenceDate;
  return `${Number(reference.slice(0, 4)) - age}${reference.slice(4)}`;
}

async function priceTickets(rawArgs: unknown) {
  const args = PriceArgsSchema.parse(rawArgs);
  const days = args.days.filter((day) => festival.days.includes(day));
  const dinnerDays = args.dinner_every_day ? (args.ticket === "ALL_DAY_PASS" ? festival.days : days) : [];

  const ticketHolder = (id: string, age: number) => ({
    id,
    dateOfBirth: dateOfBirthForAge(age),
    entry:
      args.ticket === "FAMILY_PASS"
        ? { type: "FAMILY_PASS" as const, familyGroupId: "family" }
        : args.ticket === "ALL_DAY_PASS"
          ? { type: "ALL_DAY_PASS" as const }
          : { type: "DAY_PASS" as const, days },
    dinnerDays,
    workshopDays: [],
  });

  const request: QuoteRequest = {
    attendees: [
      ...Array.from({ length: args.adults }, (_, i) => ticketHolder(`adult-${i + 1}`, 30)),
      ...Array.from({ length: args.children }, (_, i) => ticketHolder(`child-${i + 1}`, 8)),
      ...Array.from({ length: args.under_fives }, (_, i) => ({
        id: `under-five-${i + 1}`,
        dateOfBirth: dateOfBirthForAge(2),
        entry: { type: "NO_TICKET" as const, days },
        dinnerDays: args.dinner_every_day ? days : [],
        workshopDays: [],
      })),
    ],
    familyGroups: args.ticket === "FAMILY_PASS" ? [{ id: "family", days }] : [],
    dandiyaPairs: args.dandiya_pairs,
    promoCode: args.promo_code?.trim().toUpperCase() || null,
  };

  const now = new Date();
  const [stockLeft, promo] = await Promise.all([loadStockLeft(), loadPromoCheck(request.promoCode, now)]);
  const { quote, issues, suggestions } = quoteBooking(request, { festival, now, promo, stockLeft });
  return {
    lines: quote.lines.map((line) => `${line.quantity} × ${line.label}: ${formatCents(line.amountCents)}`),
    discount: quote.discountCents > 0 ? formatCents(quote.discountCents) : null,
    total: formatCents(quote.totalCents),
    promoCode: quote.promo?.message ?? null,
    problems: issues.filter((issue) => issue.severity === "error").map((issue) => issue.message),
    notes: issues.filter((issue) => issue.severity === "warning").map((issue) => issue.message),
    cheaperOptions: suggestions.map((suggestion) => suggestion.message),
  };
}

async function checkAvailability() {
  const view = festivalView(festival, await loadStockLeft(), new Date());
  return {
    allDayPassesOnSale: view.allDayPassOnSale,
    items: view.products.map((product) => `${product.label}: ${product.status === "SOLD_OUT" ? "sold out" : `${product.left} left`}`),
  };
}

export async function runTool(name: string, argumentsJson: string): Promise<unknown> {
  try {
    const args: unknown = JSON.parse(argumentsJson || "{}");
    if (name === "price_tickets") return await priceTickets(args);
    if (name === "check_availability") return await checkAvailability();
    return { error: `There's no tool called ${name}` };
  } catch (error) {
    return { error: error instanceof z.ZodError ? "Those details didn't make sense, please ask again with numbers of adults, children and days." : "That didn't work" };
  }
}
