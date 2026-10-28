"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { openAssistant } from "@/assistant/open";

const CARD = "glass group flex flex-col gap-1 rounded-xl p-4 text-left backdrop-blur-sm transition hover:border-gold-bright focus-visible:border-gold-bright";

function CardText({ label, title, children }: { label: string; title: string; children: ReactNode }) {
  return (
    <>
      <span className="text-xs font-semibold tracking-[0.15em] text-gold-bright uppercase">{label}</span>
      <span className="font-semibold text-white">
        {title}{" "}
        <span aria-hidden="true" className="inline-block transition group-hover:translate-x-0.5">
          →
        </span>
      </span>
      <span className="text-sm text-white/70">{children}</span>
    </>
  );
}

export function Highlights() {
  return (
    <div className="grid max-w-xl gap-3 sm:grid-cols-2">
      <Link href="/tour" className={CARD}>
        <CardText label="New · 3D tour" title="Walk through the temple">
          Six stops, from the grand staircase to the garba circle under the moon.
        </CardText>
      </Link>
      <button type="button" onClick={openAssistant} className={CARD}>
        <CardText label="New · AI guide" title="Ask about the festival">
          “Is my 3-year-old free?” Answers from the festival guide, with real prices.
        </CardText>
      </button>
    </div>
  );
}
