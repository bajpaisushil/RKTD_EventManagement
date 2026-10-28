import { Router } from "express";
import { z } from "zod";
import { askAssistant } from "../assistant/assistant.js";
import { parseBody } from "../http/errors.js";
import { rateLimit } from "../http/rate-limit.js";

export const assistantRoutes = Router();

const ChatSchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(1000) }))
    .min(1)
    .max(12)
    .refine((messages) => messages[messages.length - 1].role === "user", "The last message must be the question"),
});

assistantRoutes.post("/", rateLimit("assistant", 20, "10 m"), async (req, res) => {
  const { messages } = parseBody(ChatSchema, req.body);
  res.json(await askAssistant(messages));
});
