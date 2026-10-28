import { OpenAI, RateLimitError } from "openai";
import type { ChatCompletion, ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat/completions";
import { env } from "../env.js";

export type LanguageModel = { client: OpenAI; models: string[]; provider: "groq" | "local" };

// Groq when a key is set; otherwise any OpenAI-compatible local server, e.g. Ollama at
// http://localhost:11434/v1. With neither, the assistant answers from search alone.
export function languageModel(): LanguageModel | null {
  if (env.GROQ_API_KEY) {
    return {
      client: new OpenAI({ apiKey: env.GROQ_API_KEY, baseURL: "https://api.groq.com/openai/v1", timeout: 20_000, maxRetries: 0 }),
      // Each Groq model has its own per-minute token allowance, so a busy minute on the
      // larger model falls through to the smaller one instead of failing.
      models: env.LLM_MODEL ? [env.LLM_MODEL] : ["openai/gpt-oss-120b", "openai/gpt-oss-20b"],
      provider: "groq",
    };
  }
  if (env.LOCAL_LLM_URL) {
    return {
      client: new OpenAI({ apiKey: "local", baseURL: env.LOCAL_LLM_URL, timeout: 60_000, maxRetries: 0 }),
      models: [env.LLM_MODEL ?? "llama3.2"],
      provider: "local",
    };
  }
  return null;
}

export async function complete(llm: LanguageModel, request: Omit<ChatCompletionCreateParamsNonStreaming, "model">): Promise<ChatCompletion> {
  for (const [index, model] of llm.models.entries()) {
    try {
      return await llm.client.chat.completions.create({ ...request, model });
    } catch (error) {
      const isLastModel = index === llm.models.length - 1;
      if (!(error instanceof RateLimitError) || isLastModel) throw error;
    }
  }
  throw new Error("No language model configured");
}

// Groq's Prompt Guard model returns the probability that a message is a jailbreak attempt.
export async function looksLikePromptInjection(text: string): Promise<boolean> {
  const llm = languageModel();
  if (llm?.provider !== "groq") return false;
  try {
    const result = await llm.client.chat.completions.create({
      model: "meta-llama/llama-prompt-guard-2-86m",
      messages: [{ role: "user", content: text }],
    });
    return Number(result.choices[0]?.message.content) > 0.9;
  } catch {
    return false;
  }
}
