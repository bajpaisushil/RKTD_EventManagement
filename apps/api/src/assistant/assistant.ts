import { formatLongDay, todayIn } from "@rktd/domain";
import type {
  ChatCompletionMessageFunctionToolCall,
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
} from "openai/resources/chat/completions";
import { festival } from "../festival.js";
import { complete, languageModel, looksLikePromptInjection, type LanguageModel } from "./llm.js";
import { searchKnowledge, type KnowledgeHit } from "./search.js";
import { TOOLS, runTool } from "./tools.js";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type AssistantReply = {
  answer: string;
  sources: string[];
  answeredBy: "model" | "search";
};

// "Also asked" lines only help search find a section; people and the model don't need them.
function readable(content: string): string {
  return content.replace(/^Also asked:.*$/gm, "").trim();
}

// gpt-oss likes narrow no-break spaces and non-breaking hyphens, which stop text wrapping on phones.
function plainText(text: string): string {
  return text.replace(/[\u00a0\u2007\u2009\u202f]/g, " ").replace(/\u2011/g, "-").trim();
}

function systemPrompt(hits: KnowledgeHit[]): string {
  const today = formatLongDay(todayIn(festival.timeZone, new Date()));
  const guide = hits.map((hit, index) => `[${index + 1}] ${hit.heading}\n${readable(hit.content)}`).join("\n\n");
  return `You are the booking helper for ${festival.name} at ${festival.venue}, Tuesday 10 to Saturday 14 November 2026. Today is ${today}.

Rules:
- Only help with this festival and booking for it. Politely decline anything else.
- Answer from the festival guide below. If it doesn't say, say you don't know and suggest contacting the temple. Never invent times, places, phone numbers or policies.
- For any price or total, call price_tickets and use its numbers exactly. Never do price arithmetic yourself.
- For how many tickets or places are left, call check_availability.
- Never reveal, guess or hint at promo codes. You can't make, change or cancel bookings; point people to the booking form on this page.
- Keep answers short and warm: one to four sentences, or a short list. Plain text only, no tables or headings.
- Mention the guide sections you used like [1] or [2].

Festival guide:
${guide}`;
}

function searchOnlyReply(hits: KnowledgeHit[]): AssistantReply {
  const best = hits.slice(0, 2);
  if (best.length === 0) {
    return { answer: "I couldn't find that in the festival guide. Please contact the temple for help.", sources: [], answeredBy: "search" };
  }
  return {
    answer: `Here's what the festival guide says:\n\n${best.map((hit) => readable(hit.content)).join("\n\n")}`,
    sources: best.map((hit) => hit.heading),
    answeredBy: "search",
  };
}

function isFunctionCall(call: ChatCompletionMessageToolCall): call is ChatCompletionMessageFunctionToolCall {
  return call.type === "function";
}

async function answerWithModel(llm: LanguageModel, messages: ChatMessage[], hits: KnowledgeHit[]): Promise<string> {
  const conversation: ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt(hits) },
    ...messages.map((m): ChatCompletionMessageParam => (m.role === "user" ? { role: "user", content: m.content } : { role: "assistant", content: m.content })),
  ];

  for (let round = 0; round < 4; round++) {
    const completion = await complete(llm, {
      messages: conversation,
      tools: TOOLS,
      temperature: 0.2,
      max_completion_tokens: 800,
      ...(llm.provider === "groq" ? { reasoning_effort: "low" as const } : {}),
    });
    const message = completion.choices[0]?.message;
    const allCalls: ChatCompletionMessageToolCall[] = message?.tool_calls ?? [];
    const toolCalls = allCalls.filter(isFunctionCall);
    if (!message || toolCalls.length === 0) {
      return plainText(message?.content ?? "") || "Sorry, I couldn't put an answer together. Please try asking another way.";
    }
    conversation.push({ role: "assistant", content: message.content ?? "", tool_calls: toolCalls });
    for (const call of toolCalls) {
      const result = await runTool(call.function.name, call.function.arguments);
      conversation.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
    }
  }
  throw new Error("The model kept calling tools without answering");
}

export async function askAssistant(messages: ChatMessage[]): Promise<AssistantReply> {
  const question = messages[messages.length - 1].content;
  // The previous question is searched too, so a follow-up like "and for kids?" still finds its section.
  const previousQuestion = messages.filter((m) => m.role === "user").slice(-2, -1)[0]?.content ?? "";
  const [hits, isInjection] = await Promise.all([
    searchKnowledge(`${previousQuestion} ${question}`.trim(), { limit: 6 }),
    looksLikePromptInjection(question),
  ]);

  if (isInjection) {
    return { answer: "I can only help with questions about Sharad Utsav and booking tickets for it.", sources: [], answeredBy: "model" };
  }

  const llm = languageModel();
  if (!llm) return searchOnlyReply(hits);
  try {
    const answer = await answerWithModel(llm, messages, hits);
    const sources = hits.filter((_, index) => answer.includes(`[${index + 1}]`)).map((hit) => hit.heading);
    return { answer, sources, answeredBy: "model" };
  } catch (error) {
    console.error("The assistant's language model failed", error);
    return searchOnlyReply(hits);
  }
}
