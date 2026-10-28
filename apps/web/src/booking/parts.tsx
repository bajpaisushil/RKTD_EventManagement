"use client";

import { formatCents, type Issue, type IssueTarget, type QuoteResponse } from "@rktd/domain";
import { Notice } from "@/components/ui";
import { STEPS, type Step } from "./draft";

export function issuesFor(issues: Issue[], matches: (target: IssueTarget) => boolean): Issue[] {
  return issues.filter((issue) => matches(issue.target));
}

export function IssueMessages({ issues }: { issues: Issue[] }) {
  if (issues.length === 0) return null;
  return (
    <div className="space-y-2">
      {issues.map((issue, index) => (
        <Notice key={`${issue.code}-${index}`} tone={issue.severity === "error" ? "error" : "warning"}>
          {issue.message}
        </Notice>
      ))}
    </div>
  );
}

const STEP_LABELS: Record<Step, string> = {
  people: "Who's coming",
  tickets: "Tickets",
  extras: "Extras",
  review: "Review & pay",
};

export function Stepper({ current }: { current: Step }) {
  const currentIndex = STEPS.indexOf(current);
  return (
    <ol className="flex gap-2 text-sm" aria-label="Booking steps">
      {STEPS.map((step, index) => (
        <li
          key={step}
          aria-current={step === current ? "step" : undefined}
          className={`flex-1 border-t-4 pt-2 ${index <= currentIndex ? "border-primary text-white" : "border-white/20 text-white/60"}`}
        >
          <span className="hidden sm:inline">{index + 1}. </span>
          {STEP_LABELS[step]}
        </li>
      ))}
    </ol>
  );
}

type SummaryProps = { quote: QuoteResponse | null; loading: boolean; error: string | null; onRetry: () => void };

export function OrderSummary({ quote, loading, error, onRetry }: SummaryProps) {
  const lines = quote?.quote.lines ?? [];
  return (
    <div className="glass space-y-4 rounded-2xl p-5">
      <h3 className="font-serif text-2xl font-semibold">Your booking</h3>
      {lines.length === 0 && !error && <p className="text-sm text-white/70">Add people and their dates of birth to see prices.</p>}
      {lines.length > 0 && quote && (
        <dl className="space-y-2 text-sm">
          {lines.map((line) => (
            <div key={line.productCode} className="flex justify-between gap-4">
              <dt className="text-white/80">
                {line.quantity} × {line.label}
              </dt>
              <dd>{formatCents(line.amountCents)}</dd>
            </div>
          ))}
          {quote.quote.discountCents > 0 && (
            <div className="flex justify-between gap-4 text-success-on-dark">
              <dt>Code {quote.quote.promo?.code}</dt>
              <dd>−{formatCents(quote.quote.discountCents)}</dd>
            </div>
          )}
          <div className="flex justify-between gap-4 border-t border-white/20 pt-3 text-lg font-semibold">
            <dt>Total</dt>
            <dd>{formatCents(quote.quote.totalCents)}</dd>
          </div>
        </dl>
      )}
      <p aria-live="polite" className="text-xs text-white/60">
        {loading ? "Updating your total…" : "Prices are worked out on our server, so what you see is what you pay."}
      </p>
      {error && (
        <p role="alert" className="text-sm text-error-on-dark">
          {error}{" "}
          <button type="button" className="underline" onClick={onRetry}>
            Try again
          </button>
        </p>
      )}
    </div>
  );
}
