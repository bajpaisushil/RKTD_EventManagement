"use client";

import { formatDay, formatDayList, normalizePromoCode, type FestivalView, type PromoResult, type QuoteResponse } from "@rktd/domain";
import { useEffect, useState, type Dispatch } from "react";
import { toast } from "sonner";
import { Button, Notice, StepHeading, TextField } from "@/components/ui";
import { bandOf, daysComing, type Draft, type DraftAction, type DraftPerson } from "../draft";
import { IssueMessages } from "../parts";
import { passProduct } from "../products";

type Props = {
  draft: Draft;
  dispatch: Dispatch<DraftAction>;
  festival: FestivalView;
  quote: QuoteResponse | null;
  consented: boolean;
  onConsentChange: (value: boolean) => void;
  checkoutError: string | null;
};

function ticketName(person: DraftPerson, festival: FestivalView): string {
  const band = bandOf(person, festival);
  if (band === null) return "";
  if (band === "INFANT") return "Free (under 5)";
  if (person.pass === "FAMILY_PASS") return "Family Pass";
  return passProduct(festival, person.pass, band).label;
}

function PromoField({ promoCode, result, onApply }: { promoCode: string | null; result: PromoResult | null; onApply: (code: string | null) => void }) {
  const [text, setText] = useState(promoCode ?? "");
  const [justApplied, setJustApplied] = useState<string | null>(null);
  const tone = result?.status === "APPLIED" ? "success" : result?.status === "NO_EFFECT" ? "warning" : "error";

  useEffect(() => {
    if (!justApplied || result?.code !== justApplied) return;
    toast[tone](result.message, { id: "promo" });
    setJustApplied(null);
  }, [justApplied, result, tone]);

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        const code = text.trim() || null;
        setJustApplied(normalizePromoCode(code));
        onApply(code);
      }}
    >
      <div className="flex items-end gap-2">
        <TextField id="promo" label="Promo code (optional)" className="flex-1" autoComplete="off" autoCapitalize="characters" value={text} onChange={(e) => setText(e.target.value)} />
        <Button type="submit" variant="secondary" disabled={!text.trim()}>
          Apply
        </Button>
      </div>
      {promoCode && result && (
        <div className="space-y-2">
          <Notice tone={tone}>{result.message}</Notice>
          <Button
            variant="quiet"
            className="min-h-9 px-0 text-sm"
            onClick={() => {
              setText("");
              onApply(null);
            }}
          >
            Remove code
          </Button>
        </div>
      )}
    </form>
  );
}

export function ReviewStep({ draft, dispatch, festival, quote, consented, onConsentChange, checkoutError }: Props) {
  return (
    <div className="space-y-8">
      <StepHeading title="Check and pay" subtitle="Have a quick look before paying. You can go back and change anything." />

      <ul className="divide-y divide-body/15 rounded-xl border border-body/20 bg-white">
        {draft.people.map((person) => {
          const days = daysComing(person, draft, festival);
          return (
            <li key={person.id} className="space-y-1 p-4 text-sm">
              <p className="font-semibold text-heading">
                {person.firstName} {person.lastName} <span className="font-normal text-body">· {ticketName(person, festival)}</span>
              </p>
              <p className="text-body">{days.length ? formatDayList(days) : "No days picked yet"}</p>
              {person.dinnerDays.length > 0 && <p className="text-body">Dinner: {person.dinnerDays.map(formatDay).join(", ")}</p>}
              {person.workshopDays.length > 0 && <p className="text-body">Garba Workshop: {person.workshopDays.map(formatDay).join(", ")}</p>}
            </li>
          );
        })}
        {draft.dandiyaPairs > 0 && <li className="p-4 text-sm text-heading">Dandiya sticks: {draft.dandiyaPairs} pair(s)</li>}
      </ul>

      <PromoField promoCode={draft.promoCode} result={quote?.quote.promo ?? null} onApply={(code) => dispatch({ type: "SET_PROMO", code })} />

      <IssueMessages issues={quote?.issues ?? []} />

      <label className="flex cursor-pointer items-start gap-3 text-sm text-heading">
        <input type="checkbox" className="mt-0.5 size-5 accent-[#8a6a12]" checked={consented} onChange={(e) => onConsentChange(e.target.checked)} />
        <span>
          The dates of birth above are correct. I understand child tickets are for ages {festival.agePolicy.childFromAge} to {festival.agePolicy.adultFromAge - 1} on{" "}
          {formatDay(festival.agePolicy.referenceDate)}, and children may be asked their age at the door.
        </span>
      </label>

      {checkoutError && <Notice tone="error">{checkoutError}</Notice>}
    </div>
  );
}
