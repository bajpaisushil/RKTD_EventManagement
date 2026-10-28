"use client";

import { formatCents, type FestivalView } from "@rktd/domain";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui";
import { STEPS, createDraftReducer, emptyDraft, type Step } from "./draft";
import { useCheckout, useQuote } from "./hooks";
import { OrderSummary, Stepper } from "./parts";
import { checkPeopleStep, toBookingRequest, toQuoteRequest } from "./requests";
import { loadSavedDraft, saveDraft } from "./saved-draft";
import { ExtrasStep } from "./steps/ExtrasStep";
import { PeopleStep } from "./steps/PeopleStep";
import { ReviewStep } from "./steps/ReviewStep";
import { TicketsStep } from "./steps/TicketsStep";

export function BookingFlow({ festival, notice }: { festival: FestivalView; notice?: ReactNode }) {
  const router = useRouter();
  const reducer = useMemo(() => createDraftReducer(festival), [festival]);
  const [draft, dispatch] = useReducer(reducer, null, () => loadSavedDraft() ?? emptyDraft());
  const [showErrors, setShowErrors] = useState(false);
  const [consented, setConsented] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  const quoteRequest = useMemo(() => toQuoteRequest(draft, festival), [draft, festival]);
  const quote = useQuote(quoteRequest.attendees.length > 0 ? quoteRequest : null);
  const checkout = useCheckout();

  useEffect(() => saveDraft(draft), [draft]);

  useEffect(() => {
    if (quote.error) toast.error(quote.error, { id: "quote" });
  }, [quote.error]);

  useEffect(() => {
    if (quote.isCurrent) toast.dismiss("quote");
  }, [quote.isCurrent]);

  useEffect(() => {
    if (checkout.error) toast.error(checkout.error.message, { id: "checkout" });
  }, [checkout.error]);

  const peopleErrors = checkPeopleStep(draft, festival);
  const stepIndex = STEPS.indexOf(draft.step);
  const quoteErrors = (quote.response?.issues ?? []).filter((issue) => issue.severity === "error");
  const total = quote.response && quoteRequest.attendees.length > 0 ? formatCents(quote.response.quote.totalCents) : "—";

  function goTo(step: Step) {
    dispatch({ type: "GO_TO", step });
    setShowErrors(false);
    checkout.clearError();
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function next() {
    const blocked = draft.step === "people" ? Object.keys(peopleErrors).length > 0 : quoteErrors.length > 0;
    if (blocked) {
      setShowErrors(true);
      toast.error("Please fix the highlighted details before carrying on.", { id: "step" });
      return;
    }
    goTo(STEPS[stepIndex + 1]);
  }

  async function pay() {
    const response = quote.response;
    if (!response || !quote.isCurrent || !response.canBook || !consented) return;

    const result = await checkout.pay(toBookingRequest(draft, festival, response.quote.totalCents));
    if (!result) {
      quote.retry();
      return;
    }
    if (result.checkoutUrl) {
      window.location.assign(result.checkoutUrl);
    } else {
      router.push(`/booking/${result.reference}?token=${result.accessToken}`);
    }
  }

  const canPay = Boolean(quote.response?.canBook) && quote.isCurrent && consented && !checkout.submitting;
  const payLabel = checkout.submitting
    ? "Holding your places…"
    : quote.response?.quote.totalCents === 0
      ? "Confirm free booking"
      : `Pay ${total}`;

  return (
    <div ref={topRef} className="scroll-mt-6 space-y-6">
      <Stepper current={draft.step} />
      {notice}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-2xl bg-cream p-5 text-body sm:p-8">
          {draft.step === "people" && <PeopleStep draft={draft} dispatch={dispatch} festival={festival} errors={showErrors ? peopleErrors : {}} />}
          {draft.step === "tickets" && <TicketsStep draft={draft} dispatch={dispatch} festival={festival} quote={quote.response} />}
          {draft.step === "extras" && <ExtrasStep draft={draft} dispatch={dispatch} festival={festival} quote={quote.response} />}
          {draft.step === "review" && (
            <ReviewStep
              draft={draft}
              dispatch={dispatch}
              festival={festival}
              quote={quote.response}
              consented={consented}
              onConsentChange={setConsented}
              checkoutError={checkout.error?.message ?? null}
            />
          )}

          <div className="sticky bottom-0 z-10 -mx-5 mt-8 border-t border-body/20 bg-cream/95 px-5 py-3 backdrop-blur sm:-mx-8 sm:px-8">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-body">Total</p>
                <p className="text-xl font-bold text-heading" aria-live="polite">
                  {total}
                  {quote.loading && <span className="ml-2 text-xs font-normal text-body">updating…</span>}
                </p>
              </div>
              <div className="flex gap-2">
                {stepIndex > 0 && (
                  <Button variant="secondary" onClick={() => goTo(STEPS[stepIndex - 1])} disabled={checkout.submitting}>
                    Back
                  </Button>
                )}
                {draft.step === "review" ? (
                  <Button onClick={pay} disabled={!canPay} aria-busy={checkout.submitting}>
                    {payLabel}
                  </Button>
                ) : (
                  <Button onClick={next} disabled={draft.step !== "people" && quote.loading}>
                    Continue
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:sticky lg:top-6">
          <OrderSummary quote={quote.response} loading={quote.loading} error={quote.error} onRetry={quote.retry} />
        </div>
      </div>
    </div>
  );
}
