import { festivalView } from "@rktd/domain";
import { Router } from "express";
import { festival } from "../festival.js";
import { loadStockLeft } from "../services/stock.js";

export const festivalRoutes = Router();

festivalRoutes.get("/", async (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json(festivalView(festival, await loadStockLeft(), new Date()));
});
