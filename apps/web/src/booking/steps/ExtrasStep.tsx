"use client";

import { formatCents, formatDayList, type FestivalView, type QuoteResponse } from "@rktd/domain";
import type { Dispatch } from "react";
import { Button, ChipGroup, StepHeading } from "@/components/ui";
import { bandOf, daysComing, type Draft, type DraftAction } from "../draft";
import { IssueMessages, issuesFor } from "../parts";
import { product } from "../products";

type Props = { draft: Draft; dispatch: Dispatch<DraftAction>; festival: FestivalView; quote: QuoteResponse | null };

export function ExtrasStep({ draft, dispatch, festival, quote }: Props) {
  const dinner = product(festival, "DINNER_PLATE");
  const workshop = product(festival, "GARBA_WORKSHOP");
  const dandiya = product(festival, "DANDIYA_STICKS");
  const people = draft.people.filter((person) => bandOf(person, festival) !== null);
  const dayLabel = (date: string) => festival.days.find((day) => day.date === date)?.label ?? date;
  const productIssues = issuesFor(quote?.issues ?? [], (t) => t.kind === "PRODUCT");

  return (
    <div className="space-y-10">
      <StepHeading title="Extras" subtitle="All optional. You can only add dinner or the workshop on days someone is coming." />

      <section className="space-y-4" aria-labelledby="dinner-heading">
        <h4 id="dinner-heading" className="font-semibold text-heading">
          Dinner plates · {formatCents(dinner.priceCents)} per person, per day
        </h4>
        {people.map((person) => {
          const days = daysComing(person, draft, festival);
          const name = person.firstName || "This person";
          return (
            <div key={person.id} className="space-y-2">
              <p className="text-sm font-medium text-heading">{name}</p>
              {days.length === 0 ? (
                <p className="text-sm text-body">Pick the days {name} is coming first.</p>
              ) : (
                <ChipGroup
                  label={`Dinner for ${name}`}
                  chips={days.map((date) => ({ value: date, label: dayLabel(date) }))}
                  selected={person.dinnerDays}
                  onToggle={(day) => dispatch({ type: "TOGGLE_DINNER", id: person.id, day })}
                />
              )}
            </div>
          );
        })}
      </section>

      <section className="space-y-4" aria-labelledby="workshop-heading">
        <div>
          <h4 id="workshop-heading" className="font-semibold text-heading">
            Garba Workshop · {formatCents(workshop.priceCents)} a place
          </h4>
          <p className="text-sm text-body">
            Runs on {formatDayList(festival.workshopDays)} only.{" "}
            {workshop.status === "LOW" && <strong className="text-heading">Only {workshop.left} {workshop.left === 1 ? "place" : "places"} left.</strong>}
            {workshop.status === "SOLD_OUT" && <strong className="text-heading">Fully booked.</strong>}
          </p>
        </div>
        {people.map((person) => {
          const days = daysComing(person, draft, festival).filter((day) => festival.workshopDays.includes(day));
          const name = person.firstName || "This person";
          if (days.length === 0) return null;
          return (
            <div key={person.id} className="space-y-2">
              <p className="text-sm font-medium text-heading">{name}</p>
              <ChipGroup
                label={`Garba Workshop for ${name}`}
                chips={days.map((date) => ({
                  value: date,
                  label: dayLabel(date),
                  disabledReason: workshop.status === "SOLD_OUT" && !person.workshopDays.includes(date) ? "Fully booked" : undefined,
                }))}
                selected={person.workshopDays}
                onToggle={(day) => dispatch({ type: "TOGGLE_WORKSHOP", id: person.id, day })}
              />
            </div>
          );
        })}
        {!people.some((person) => daysComing(person, draft, festival).some((day) => festival.workshopDays.includes(day))) && (
          <p className="text-sm text-body">Nobody is booked for a workshop day yet.</p>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="dandiya-heading">
        <h4 id="dandiya-heading" className="font-semibold text-heading">
          Dandiya sticks · {formatCents(dandiya.priceCents)} a pair
        </h4>
        <p className="text-sm text-body">A souvenir pair to dance with, collected at the festival. Up to {festival.maxDandiyaPairs} pairs per booking.</p>
        <div className="flex items-center gap-3">
          <Button variant="secondary" aria-label="One pair fewer" disabled={draft.dandiyaPairs <= 0} onClick={() => dispatch({ type: "SET_DANDIYA", pairs: draft.dandiyaPairs - 1 })}>
            −
          </Button>
          <output aria-live="polite" className="min-w-16 text-center text-lg font-semibold text-heading">
            {draft.dandiyaPairs} {draft.dandiyaPairs === 1 ? "pair" : "pairs"}
          </output>
          <Button
            variant="secondary"
            aria-label="One more pair"
            disabled={draft.dandiyaPairs >= festival.maxDandiyaPairs}
            onClick={() => dispatch({ type: "SET_DANDIYA", pairs: draft.dandiyaPairs + 1 })}
          >
            +
          </Button>
        </div>
      </section>

      <IssueMessages issues={productIssues} />
    </div>
  );
}
