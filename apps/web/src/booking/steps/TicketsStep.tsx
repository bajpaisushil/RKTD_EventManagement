"use client";

import { formatCents, formatDay, formatDayList, timeZoneName, type FestivalView, type IsoDate, type QuoteResponse, type Suggestion } from "@rktd/domain";
import type { Dispatch } from "react";
import { Button, ChipGroup, Notice, StepHeading } from "@/components/ui";
import { bandOf, type Draft, type DraftAction, type DraftPerson, type PassChoice } from "../draft";
import { IssueMessages, issuesFor } from "../parts";
import { passProduct, product } from "../products";

type Props = { draft: Draft; dispatch: Dispatch<DraftAction>; festival: FestivalView; quote: QuoteResponse | null };

function dayChips(festival: FestivalView) {
  return festival.days.map((day) => ({
    value: day.date,
    label: day.label,
    disabledReason: day.onSale ? undefined : "Online booking for this day has closed",
  }));
}

function PassOption(props: { name: string; value: PassChoice; checked: boolean; disabled?: boolean; title: string; detail: string; onSelect: () => void }) {
  return (
    <label
      className={`flex items-start gap-3 rounded-lg border p-3 ${props.checked ? "border-gold-deep bg-primary/15" : "border-body/30 bg-white"} ${
        props.disabled ? "cursor-not-allowed opacity-55" : "cursor-pointer"
      }`}
    >
      <input type="radio" name={props.name} value={props.value} checked={props.checked} disabled={props.disabled} onChange={props.onSelect} className="mt-1 size-4 accent-[#8a6a12]" />
      <span>
        <span className="block font-semibold text-heading">{props.title}</span>
        <span className="block text-sm text-body">{props.detail}</span>
      </span>
    </label>
  );
}

function SameDaysBox({ checked, dispatch }: { checked: boolean; dispatch: Dispatch<DraftAction> }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg bg-primary/10 px-3 py-2.5 text-sm font-medium text-heading">
      <input type="checkbox" className="size-5 accent-[#8a6a12]" checked={checked} onChange={(e) => dispatch({ type: "SET_SAME_DAYS", on: e.target.checked })} />
      Everyone else is coming on the same days
    </label>
  );
}

function SameDaysNote({ leadName, days }: { leadName: string; days: IsoDate[] }) {
  return (
    <p className="text-sm text-body">
      Same days as {leadName}: <span className="font-medium text-heading">{days.length ? formatDayList(days) : "none picked yet"}</span>
    </p>
  );
}

function TicketCard({ person, draft, dispatch, festival, quote, familyPossible }: Props & { person: DraftPerson; familyPossible: boolean }) {
  const band = bandOf(person, festival);
  const name = person.firstName || "This person";
  const issues = issuesFor(quote?.issues ?? [], (t) => t.kind === "ATTENDEE" && t.attendeeId === person.id);
  const lead = draft.people[0];
  const isLead = person.id === lead.id;
  const following = draft.sameDays && !isLead;
  const sameDaysBox = isLead && draft.people.length > 1 && <SameDaysBox checked={draft.sameDays} dispatch={dispatch} />;
  const toggleDay = (day: IsoDate) => dispatch({ type: "TOGGLE_DAY", id: person.id, day });
  if (!band) return null;

  if (band === "INFANT") {
    return (
      <div className="space-y-3 rounded-xl border border-body/20 bg-white p-4">
        <p className="font-semibold text-heading">
          {name} <span className="font-normal text-body">· under {festival.agePolicy.childFromAge}, free, no ticket needed</span>
        </p>
        {following ? (
          <SameDaysNote leadName={lead.firstName || "the first person"} days={person.days} />
        ) : (
          <>
            <p className="text-sm text-body">Which days is {name} coming?</p>
            <ChipGroup label={`Days ${name} is coming`} chips={dayChips(festival)} selected={person.days} onToggle={toggleDay} />
          </>
        )}
        {sameDaysBox}
        <IssueMessages issues={issues} />
      </div>
    );
  }

  const dayPass = passProduct(festival, "DAY_PASS", band);
  const allDayPass = passProduct(festival, "ALL_DAY_PASS", band);
  const allDayUnavailable = !festival.allDayPassOnSale
    ? "No longer on sale now the festival has started"
    : allDayPass.status === "SOLD_OUT"
      ? "Sold out. A Day Pass for each day still works."
      : null;
  const choose = (pass: PassChoice) => () => dispatch({ type: "SET_PASS", id: person.id, pass });

  return (
    <div className="space-y-3 rounded-xl border border-body/20 bg-white p-4">
      <p className="font-semibold text-heading">
        {name} <span className="font-normal text-body">· {band === "ADULT" ? "adult ticket" : "child ticket"}</span>
      </p>
      <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label={`Ticket for ${name}`}>
        <PassOption name={`pass-${person.id}`} value="DAY_PASS" checked={person.pass === "DAY_PASS"} title="Day Pass" detail={`${formatCents(dayPass.priceCents)} per day`} onSelect={choose("DAY_PASS")} />
        <PassOption
          name={`pass-${person.id}`}
          value="ALL_DAY_PASS"
          checked={person.pass === "ALL_DAY_PASS"}
          disabled={Boolean(allDayUnavailable) && person.pass !== "ALL_DAY_PASS"}
          title="All-Day Pass"
          detail={allDayUnavailable ?? `${formatCents(allDayPass.priceCents)} for all five days`}
          onSelect={choose("ALL_DAY_PASS")}
        />
        {(familyPossible || person.pass === "FAMILY_PASS") && (
          <PassOption name={`pass-${person.id}`} value="FAMILY_PASS" checked={person.pass === "FAMILY_PASS"} title="Family Pass" detail="Shared by 2 adults and 2 children" onSelect={choose("FAMILY_PASS")} />
        )}
      </div>
      {person.pass === "DAY_PASS" &&
        (following ? (
          <SameDaysNote leadName={lead.firstName || "the first person"} days={person.days} />
        ) : (
          <ChipGroup label={`Days for ${name}`} chips={dayChips(festival)} selected={person.days} onToggle={toggleDay} />
        ))}
      {sameDaysBox}
      <IssueMessages issues={issues} />
    </div>
  );
}

function FamilyPassCard({ draft, dispatch, festival, quote }: Props) {
  const members = draft.people.filter((p) => p.pass === "FAMILY_PASS" && bandOf(p, festival) !== "INFANT");
  if (members.length === 0) return null;
  const familyPass = product(festival, "FAMILY_PASS");
  const adults = members.filter((p) => bandOf(p, festival) === "ADULT").length;
  const children = members.filter((p) => bandOf(p, festival) === "CHILD").length;
  const issues = issuesFor(quote?.issues ?? [], (t) => t.kind === "FAMILY_PASS");

  return (
    <section className="space-y-3 rounded-xl border-2 border-gold-deep/60 bg-white p-4" aria-labelledby="family-pass-heading">
      <h4 id="family-pass-heading" className="font-serif text-xl font-semibold text-heading">
        Family Pass
      </h4>
      <p className="text-sm text-body">
        {formatCents(familyPass.priceCents)} a day covers exactly {festival.familyPass.adults} adults and {festival.familyPass.children} children. On it now:{" "}
        <strong className="text-heading">
          {adults} of {festival.familyPass.adults} adults, {children} of {festival.familyPass.children} children
        </strong>
        .
      </p>
      <p className="text-sm text-body">Which days? Each day is its own Family Pass.</p>
      <ChipGroup label="Family Pass days" chips={dayChips(festival)} selected={draft.familyDays} onToggle={(day) => dispatch({ type: "TOGGLE_FAMILY_DAY", day })} />
      <IssueMessages issues={issues} />
    </section>
  );
}

function Suggestions({ suggestions, dispatch, hasFamilyPass }: { suggestions: Suggestion[]; dispatch: Dispatch<DraftAction>; hasFamilyPass: boolean }) {
  const usable = suggestions.filter((s) => !(s.change.type === "USE_FAMILY_PASS" && hasFamilyPass));
  if (usable.length === 0) return null;
  return (
    <div className="space-y-2" aria-live="polite">
      {usable.map((suggestion) => (
        <div key={JSON.stringify(suggestion.change)} className="flex flex-col gap-3 rounded-lg border border-success bg-success/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-heading">
            <strong>Save {formatCents(suggestion.savingsCents)}.</strong> {suggestion.message}
          </p>
          <Button variant="secondary" onClick={() => dispatch({ type: "APPLY_SUGGESTION", change: suggestion.change })}>
            Switch
          </Button>
        </div>
      ))}
    </div>
  );
}

export function TicketsStep(props: Props) {
  const { draft, festival, quote, dispatch } = props;
  const people = draft.people.filter((p) => bandOf(p, festival) !== null);
  const adults = people.filter((p) => bandOf(p, festival) === "ADULT").length;
  const children = people.filter((p) => bandOf(p, festival) === "CHILD").length;
  const familyPossible = adults >= festival.familyPass.adults && children >= festival.familyPass.children;
  const hasFamilyPass = people.some((p) => p.pass === "FAMILY_PASS" && bandOf(p, festival) !== "INFANT");

  return (
    <div className="space-y-6">
      <StepHeading
        title="Tickets and days"
        subtitle={`Ages count on the first day of the festival (${formatDay(festival.agePolicy.referenceDate)}), so child prices apply automatically.`}
      />
      {festival.days.some((day) => !day.onSale) && (
        <Notice tone="info">
          Online booking for each day closes at midnight {timeZoneName(festival.timeZone)}. To request a place on a day that has ended, email{" "}
          <a href={`mailto:${festival.contactEmail}`} className="font-semibold text-heading underline underline-offset-2">
            {festival.contactEmail}
          </a>
          .
        </Notice>
      )}
      {people.map((person) => (
        <TicketCard key={person.id} {...props} person={person} familyPossible={familyPossible} />
      ))}
      <FamilyPassCard {...props} />
      <Suggestions suggestions={quote?.suggestions ?? []} dispatch={dispatch} hasFamilyPass={hasFamilyPass} />
    </div>
  );
}
