import type { FestivalConfig } from "./catalog.js";
import { todayIn } from "./dates.js";
import type { BookingRequest, QuoteRequest } from "./input.js";
import { hasErrors, type Issue } from "./issues.js";
import { orderItems, type OrderItem } from "./items.js";
import { resolveParty } from "./party.js";
import { priceItems, type Quote } from "./pricing.js";
import type { PromoCheck } from "./promo.js";
import { checkBookingRules, checkQuoteRules, type RuleFacts } from "./rules.js";
import { stockIssues, type StockLevels } from "./stock.js";
import { findCheaperOptions, type Suggestion } from "./suggestions.js";

export type QuoteContext = {
  festival: FestivalConfig;
  now: Date;
  promo: PromoCheck | null;
  stockLeft: StockLevels;
};

export type QuoteResult = {
  quote: Quote;
  issues: Issue[];
  suggestions: Suggestion[];
  items: OrderItem[];
  canBook: boolean;
};

function factsFor(request: QuoteRequest, context: QuoteContext): RuleFacts {
  return {
    request,
    party: resolveParty(request, context.festival),
    festival: context.festival,
    today: todayIn(context.festival.timeZone, context.now),
  };
}

function priceWithIssues(facts: RuleFacts, ruleIssues: Issue[], context: QuoteContext): QuoteResult {
  const items = orderItems(facts.request, facts.party, context.festival.catalog);
  const quote = priceItems(items, context.festival.catalog, context.promo);
  const issues = [...ruleIssues, ...stockIssues(items, context.stockLeft)];
  return { quote, issues, suggestions: [], items, canBook: !hasErrors(issues) };
}

function quoteWithoutSuggestions(request: QuoteRequest, context: QuoteContext): QuoteResult {
  const facts = factsFor(request, context);
  return priceWithIssues(facts, checkQuoteRules(facts), context);
}

export function quoteBooking(request: QuoteRequest, context: QuoteContext): QuoteResult {
  const result = quoteWithoutSuggestions(request, context);
  if (!result.canBook) return result;

  const priceOf = (candidate: QuoteRequest) => {
    const candidateResult = quoteWithoutSuggestions(candidate, context);
    return { totalCents: candidateResult.quote.totalCents, canBook: candidateResult.canBook };
  };
  const party = resolveParty(request, context.festival);
  const suggestions = findCheaperOptions(request, party, context.festival, result.quote.totalCents, priceOf);
  return { ...result, suggestions };
}

export function quoteFinalBooking(request: BookingRequest, context: QuoteContext): QuoteResult {
  const facts = { ...factsFor(request, context), request };
  return priceWithIssues(facts, checkBookingRules(facts), context);
}
