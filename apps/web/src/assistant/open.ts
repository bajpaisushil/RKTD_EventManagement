const OPEN_ASSISTANT = "assistant:open";

export function openAssistant(): void {
  window.dispatchEvent(new Event(OPEN_ASSISTANT));
}

export function onOpenAssistant(listener: () => void): () => void {
  window.addEventListener(OPEN_ASSISTANT, listener);
  return () => window.removeEventListener(OPEN_ASSISTANT, listener);
}
