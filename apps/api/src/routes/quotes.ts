import { QuoteRequestSchema } from "@rktd/domain";
import { Router } from "express";
import { parseBody } from "../http/errors.js";
import { rateLimit } from "../http/rate-limit.js";
import { getQuote } from "../services/quotes.js";

export const quoteRoutes = Router();

quoteRoutes.post("/", rateLimit("quotes", 120, "1 m"), async (req, res) => {
  res.json(await getQuote(parseBody(QuoteRequestSchema, req.body)));
});
