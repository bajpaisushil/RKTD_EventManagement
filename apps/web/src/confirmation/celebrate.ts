const GOLDS = ["#c99b24", "#d1ac3e", "#bc9226", "#fdf3e4", "#ffffff"];

export function firstTimeConfirmed(reference: string): boolean {
  const key = `celebrated-${reference}`;
  try {
    if (localStorage.getItem(key)) return false;
    localStorage.setItem(key, "1");
  } catch {
    // Without storage the confetti may show again on a later visit, which is harmless.
  }
  return true;
}

export async function throwConfetti(): Promise<void> {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const { default: confetti } = await import("canvas-confetti");
  confetti({ particleCount: 140, spread: 80, startVelocity: 45, origin: { y: 0.35 }, colors: GOLDS });
  setTimeout(() => {
    confetti({ particleCount: 70, angle: 60, spread: 60, origin: { x: 0, y: 0.65 }, colors: GOLDS });
    confetti({ particleCount: 70, angle: 120, spread: 60, origin: { x: 1, y: 0.65 }, colors: GOLDS });
  }, 300);
}
