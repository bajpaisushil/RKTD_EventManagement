"use client";

import { BookingSection } from "./BookingSection";
import { useFestival } from "./hooks";
import { PriceList } from "./PriceList";

export function FestivalContent() {
  const { festival, error, reload } = useFestival();
  return (
    <>
      {festival && <PriceList festival={festival} />}
      <BookingSection festival={festival} error={error} reload={reload} />
    </>
  );
}
