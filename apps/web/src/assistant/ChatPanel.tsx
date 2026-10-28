"use client";

import { Fragment, useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";

type Message = { role: "user" | "assistant"; content: string; sources?: string[] };

const STARTERS = [
  "Is my 3 year old free?",
  "How much for 2 adults and 2 kids on Friday?",
  "When is the Garba workshop?",
  "Which age counts if a birthday is mid-festival?",
];

// Answers are plain text; **bold** is the one bit of formatting we honour.
function FormattedText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/).map((part, index) =>
        part.startsWith("**") && part.endsWith("**") ? <strong key={index}>{part.slice(2, -2)}</strong> : <Fragment key={index}>{part}</Fragment>,
      )}
    </>
  );
}

export function ChatPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open, onClose]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages, thinking]);

  async function ask(question: string) {
    const text = question.trim();
    if (!text || thinking) return;
    const history: Message[] = [...messages, { role: "user", content: text }];
    setMessages(history);
    setDraft("");
    setThinking(true);
    setError(null);
    try {
      const reply = await api.assistant(history.slice(-10).map(({ role, content }) => ({ role, content })));
      setMessages([...history, { role: "assistant", content: reply.answer, sources: reply.sources }]);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Something went wrong.";
      setError(message);
      toast.error(message, { id: "assistant" });
      setMessages(messages);
      setDraft(text);
    } finally {
      setThinking(false);
      input.current?.focus();
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void ask(draft);
  }

  if (!open) return null;

  return (
    <section
      role="dialog"
      aria-label="Festival helper"
      className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-2xl border border-white/15 bg-night shadow-2xl shadow-black/60 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:max-h-[640px] sm:w-[400px] sm:rounded-2xl"
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div>
          <h2 className="font-serif text-xl font-semibold text-primary">Festival helper</h2>
          <p className="text-xs text-white/60">Answers come from the festival guide; prices from the booking system.</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close the festival helper" className="grid size-10 place-items-center rounded-full text-xl text-white/80 hover:bg-white/10">
          ×
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-white/80">Ask me about tickets, ages, extras or how booking works. For example:</p>
            <div className="flex flex-wrap gap-2">
              {STARTERS.map((starter) => (
                <button key={starter} type="button" onClick={() => void ask(starter)} className="glass rounded-full px-3 py-2 text-left text-sm text-white hover:border-gold-bright">
                  {starter}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, index) =>
          message.role === "user" ? (
            <p key={index} className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm break-words text-heading">
              {message.content}
            </p>
          ) : (
            <div key={index} className="max-w-[90%] space-y-1">
              <p className="rounded-2xl rounded-bl-sm bg-cream px-3 py-2 text-sm break-words whitespace-pre-line text-body">
                <FormattedText text={message.content} />
              </p>
              {message.sources && message.sources.length > 0 && <p className="px-1 text-xs text-white/55">From the guide: {message.sources.join(" · ")}</p>}
            </div>
          ),
        )}

        {thinking && <p className="text-sm text-white/70">Looking that up…</p>}
        {error && (
          <p role="alert" className="text-sm text-error-on-dark">
            {error}
          </p>
        )}
        <div ref={bottom} />
      </div>

      <form onSubmit={submit} className="flex items-end gap-2 border-t border-white/10 p-3">
        <label htmlFor="assistant-question" className="sr-only">
          Your question
        </label>
        <textarea
          id="assistant-question"
          ref={input}
          rows={1}
          maxLength={1000}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void ask(draft);
            }
          }}
          placeholder="Ask a question…"
          className="max-h-32 min-h-11 flex-1 resize-none rounded-lg bg-white px-3 py-2.5 text-sm text-heading placeholder:text-body/60"
        />
        <button type="submit" disabled={!draft.trim() || thinking} className="min-h-11 rounded-lg bg-primary px-4 font-semibold text-heading disabled:opacity-50">
          Send
        </button>
      </form>
    </section>
  );
}
