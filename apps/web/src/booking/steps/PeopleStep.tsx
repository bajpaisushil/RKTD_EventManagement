"use client";

import { ageOn, describeAgeBand, formatDay, todayIn, type FestivalView } from "@rktd/domain";
import type { Dispatch } from "react";
import { Button, Notice, StepHeading, TextField } from "@/components/ui";
import { BOOKER_ID, bandOf, type Draft, type DraftAction, type DraftPerson } from "../draft";
import type { FieldErrors } from "../requests";

type Props = { draft: Draft; dispatch: Dispatch<DraftAction>; festival: FestivalView; errors: FieldErrors };

function AgeNote({ person, festival }: { person: DraftPerson; festival: FestivalView }) {
  const band = bandOf(person, festival);
  if (!band) return null;
  const age = ageOn(person.dateOfBirth, festival.agePolicy.referenceDate);
  return (
    <p className="text-sm text-body">
      <span className="rounded-full bg-heading px-2.5 py-0.5 text-xs font-semibold text-cream">{describeAgeBand(band, festival.agePolicy)}</span>{" "}
      {age} on {formatDay(festival.agePolicy.referenceDate)}
    </p>
  );
}

export function PeopleStep({ draft, dispatch, festival, errors }: Props) {
  const { booker } = draft;
  const today = todayIn(festival.timeZone, new Date());
  const others = draft.people.filter((person) => person.id !== BOOKER_ID);
  const bookerPerson = draft.people.find((person) => person.id === BOOKER_ID);
  const isFull = draft.people.length >= festival.maxAttendees;

  const setBooker = (field: "firstName" | "lastName" | "email" | "phone" | "dateOfBirth") => (value: string) =>
    dispatch({ type: "SET_BOOKER", field, value });
  const setPerson = (id: string, field: "firstName" | "lastName" | "dateOfBirth") => (value: string) =>
    dispatch({ type: "SET_PERSON", id, field, value });

  return (
    <div className="space-y-10">
      <section aria-labelledby="booker-heading" className="space-y-4">
        <StepHeading
          id="booker-heading"
          title="Your details"
          subtitle={`We'll send your confirmation here. The person paying needs to be ${festival.agePolicy.bookerMinAge} or over.`}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField id="booker-firstName" label="First name" autoComplete="given-name" value={booker.firstName} onChange={(e) => setBooker("firstName")(e.target.value)} error={errors["booker.firstName"]} />
          <TextField id="booker-lastName" label="Last name" autoComplete="family-name" value={booker.lastName} onChange={(e) => setBooker("lastName")(e.target.value)} error={errors["booker.lastName"]} />
          <TextField id="booker-email" label="Email" type="email" autoComplete="email" inputMode="email" value={booker.email} onChange={(e) => setBooker("email")(e.target.value)} error={errors["booker.email"]} />
          <TextField id="booker-phone" label="Mobile number" type="tel" autoComplete="tel" value={booker.phone} onChange={(e) => setBooker("phone")(e.target.value)} error={errors["booker.phone"]} hint="In case we need to reach you on the day" />
          <TextField id="booker-dateOfBirth" label="Your date of birth" type="date" min="1900-01-01" max={today} value={booker.dateOfBirth} onChange={(e) => setBooker("dateOfBirth")(e.target.value)} error={errors["booker.dateOfBirth"]} />
        </div>
        <label className="flex cursor-pointer items-start gap-3 text-heading">
          <input
            type="checkbox"
            className="mt-0.5 size-5 accent-[#8a6a12]"
            checked={booker.attending}
            onChange={(e) => dispatch({ type: "SET_ATTENDING", attending: e.target.checked })}
          />
          <span>
            I'm coming to the festival too
            <span className="block text-sm text-body">Untick this if you're booking for others and not coming yourself.</span>
          </span>
        </label>
      </section>

      <section aria-labelledby="party-heading" className="space-y-4">
        <StepHeading
          id="party-heading"
          title="Who's coming"
          subtitle="Add everyone, under-5s too. They get in free, but the volunteers on the door like to know who to expect."
        />

        {bookerPerson && (
          <div className="rounded-xl border border-body/20 bg-white p-4">
            <p className="font-semibold text-heading">
              You{booker.firstName ? ` (${booker.firstName} ${booker.lastName})` : ""}
            </p>
            <AgeNote person={bookerPerson} festival={festival} />
          </div>
        )}

        {others.map((person, index) => (
          <fieldset key={person.id} className="space-y-3 rounded-xl border border-body/20 bg-white p-4">
            <legend className="sr-only">Person {index + 1}</legend>
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-heading">{person.firstName || `Person ${index + 1}`}</p>
              <Button variant="quiet" className="min-h-9 px-2 text-sm" onClick={() => dispatch({ type: "REMOVE_PERSON", id: person.id })}>
                Remove
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <TextField id={`${person.id}-firstName`} label="First name" autoComplete="off" value={person.firstName} onChange={(e) => setPerson(person.id, "firstName")(e.target.value)} error={errors[`${person.id}.firstName`]} />
              <TextField id={`${person.id}-lastName`} label="Last name" autoComplete="off" value={person.lastName} onChange={(e) => setPerson(person.id, "lastName")(e.target.value)} error={errors[`${person.id}.lastName`]} />
              <TextField id={`${person.id}-dateOfBirth`} label="Date of birth" type="date" min="1900-01-01" max={today} value={person.dateOfBirth} onChange={(e) => setPerson(person.id, "dateOfBirth")(e.target.value)} error={errors[`${person.id}.dateOfBirth`]} />
            </div>
            <AgeNote person={person} festival={festival} />
          </fieldset>
        ))}

        {errors.people && <Notice tone="error">{errors.people}</Notice>}

        <Button variant="secondary" disabled={isFull} onClick={() => dispatch({ type: "ADD_PERSON", id: crypto.randomUUID() })}>
          + Add a person
        </Button>
        {isFull && <p className="text-sm text-body">That's the most one booking can hold ({festival.maxAttendees} people).</p>}
      </section>
    </div>
  );
}
