import { quoteBooking, type QuoteRequest, type QuoteResponse, type QuoteResult } from "@rktd/domain";
import { festival } from "../festival.js";
import { loadPromoCheck } from "./promos.js";
import { loadStockLeft } from "./stock.js";

export function toQuoteResponse(result: QuoteResult): QuoteResponse {
  return { quote: result.quote, issues: result.issues, suggestions: result.suggestions, canBook: result.canBook };
}

export async function getQuote(request: QuoteRequest): Promise<QuoteResponse> {
  const now = new Date();
  const [stockLeft, promo] = await Promise.all([loadStockLeft(), loadPromoCheck(request.promoCode, now)]);
  return toQuoteResponse(quoteBooking(request, { festival, now, promo, stockLeft }));
}
