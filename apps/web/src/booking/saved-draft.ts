import type { Draft } from "./draft";

// Session storage only: it survives the trip to Stripe and back, but not closing
// the tab, so names and dates of birth don't linger on a shared device.
const KEY = "sharad-utsav-draft";
const VERSION = 1;

export function loadSavedDraft(): Draft | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) ?? "null");
    return saved?.version === VERSION ? { sameDays: false, ...saved.draft } : null;
  } catch {
    return null;
  }
}

export function saveDraft(draft: Draft): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ version: VERSION, draft }));
  } catch {
    // Private browsing can block storage; the booking still works without it.
  }
}

export function clearSavedDraft(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}
