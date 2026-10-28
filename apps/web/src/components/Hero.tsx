import type { ReactNode } from "react";

export function Hero({ visual }: { visual?: ReactNode }) {
  return (
    <header className="relative overflow-hidden">
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(201,155,36,0.28),transparent_60%)]" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-4 pt-12 pb-6 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
        <div className="space-y-6">
          <p className="text-sm font-semibold tracking-[0.2em] text-primary uppercase">Radha Krishna Temple · Allen, Texas</p>
          <h1 className="font-serif text-5xl leading-[1.05] font-semibold sm:text-7xl">Sharad Utsav 2026</h1>
          <p className="max-w-xl text-lg text-white/85">
            Tuesday 10 to Saturday 14 November 2026. Book the whole family in one go: entry passes, dinner, the Garba workshop and dandiya sticks.
          </p>
          <div className="flex flex-wrap gap-3">
            <a href="#book" className="inline-flex min-h-12 items-center rounded-lg bg-primary px-6 font-semibold text-heading transition hover:bg-gold-bright">
              Book tickets
            </a>
            <a href="#prices-heading" className="glass inline-flex min-h-12 items-center rounded-lg px-6 font-semibold text-white transition hover:border-gold-bright">
              See prices
            </a>
          </div>
        </div>
        <div className="relative aspect-square w-full max-w-xl justify-self-center lg:aspect-[4/5]">{visual}</div>
      </div>
    </header>
  );
}
