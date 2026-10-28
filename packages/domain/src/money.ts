export type Cents = number;

// Rounds half-up to the nearest cent.
export function percentOf(amount: Cents, percent: number): Cents {
  return Math.round((amount * percent) / 100);
}

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function formatCents(amount: Cents): string {
  return usd.format(amount / 100);
}
