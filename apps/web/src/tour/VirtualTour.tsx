"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Framing } from "./TourCanvas";
import { STOPS } from "./stops";

const TourCanvas = dynamic(() => import("./TourCanvas"), { ssr: false });

type Support = "checking" | "webgl" | "none";

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function NightSky() {
  return (
    <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,#070718_0%,#22184a_55%,#7a3f5c_100%)]">
      <div className="absolute top-[12%] left-[18%] size-16 rounded-full bg-cream shadow-[0_0_80px_30px_rgba(255,226,168,0.35)]" />
    </div>
  );
}

function Arrow({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="size-5 fill-none stroke-current stroke-2">
      <path d={direction === "left" ? "M12 4l-6 6 6 6" : "M8 4l6 6-6 6"} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function VirtualTour() {
  const [{ index, previous }, setPosition] = useState<{ index: number; previous: number | null }>({ index: 0, previous: null });
  const [support, setSupport] = useState<Support>("checking");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [ready, setReady] = useState(false);
  const [guideOpen, setGuideOpen] = useState(true);
  const [framing, setFraming] = useState<Framing>({ x: 0, y: 0 });
  const guide = useRef<HTMLElement>(null);
  const stop = STOPS[index];
  const isLast = index === STOPS.length - 1;

  const goTo = useCallback((next: number) => {
    setPosition((current) => {
      const clamped = Math.min(STOPS.length - 1, Math.max(0, next));
      return clamped === current.index ? current : { index: clamped, previous: current.index };
    });
  }, []);

  useEffect(() => {
    const linked = STOPS.findIndex((item) => item.id === new URLSearchParams(window.location.search).get("stop"));
    if (linked > 0) setPosition({ index: linked, previous: null });
    setSupport(supportsWebGL() ? "webgl" : "none");
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(motion.matches);
    const onChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    motion.addEventListener("change", onChange);
    return () => motion.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.target instanceof HTMLInputElement) return;
      if (event.key === "ArrowRight") goTo(index + 1);
      if (event.key === "ArrowLeft") goTo(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, index]);

  useEffect(() => {
    if (previous === null && index === 0) return;
    window.history.replaceState(null, "", index === 0 ? "/tour" : `/tour?stop=${STOPS[index].id}`);
  }, [index, previous]);

  useEffect(() => {
    const panel = guide.current;
    if (!guideOpen || !panel) {
      setFraming({ x: 0, y: 0 });
      return;
    }
    const measure = () => {
      const box = panel.getBoundingClientRect();
      const { innerWidth: width, innerHeight: height } = window;
      const beside = box.width < width * 0.7;
      setFraming(beside ? { x: box.right / (2 * width), y: 0 } : { x: 0, y: (height - box.top) / (2 * height) });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(panel);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [guideOpen]);

  const onReady = useCallback(() => setReady(true), []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#0d0a1c] text-white">
      <NightSky />
      {support === "webgl" && (
        <div className="absolute inset-0" aria-hidden="true">
          <TourCanvas stop={stop} previous={previous === null ? null : STOPS[previous]} animate={!reducedMotion} framing={framing} onReady={onReady} />
        </div>
      )}

      {support === "webgl" && !ready && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <p className="glass rounded-full px-5 py-2 text-sm text-white/90 backdrop-blur-sm motion-safe:animate-pulse">Opening the temple gates…</p>
        </div>
      )}

      <header className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 p-3 sm:p-5">
        <Link href="/" className="glass inline-flex min-h-11 items-center gap-1 rounded-lg px-3 text-sm font-semibold backdrop-blur-sm transition hover:border-gold-bright">
          <Arrow direction="left" />
          Sharad Utsav 2026
        </Link>
        <Link href="/#book" className="inline-flex min-h-11 items-center rounded-lg bg-primary px-5 font-semibold text-heading transition hover:bg-gold-bright">
          Book tickets
        </Link>
      </header>

      {guideOpen ? (
        <section
          ref={guide}
          aria-labelledby="tour-stop-title"
          className="absolute inset-x-0 bottom-0 max-h-[52dvh] overflow-y-auto rounded-t-2xl border-t border-white/15 bg-night/85 px-4 pt-3 pb-4 backdrop-blur-md sm:inset-x-auto sm:bottom-5 sm:left-5 sm:max-h-[80dvh] sm:max-w-lg sm:rounded-2xl sm:border sm:p-6"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
              Virtual tour · stop {index + 1} of {STOPS.length}
            </p>
            <button type="button" onClick={() => setGuideOpen(false)} className="-mt-3 -mr-3 min-h-11 rounded-lg px-3 text-sm text-white/70 underline-offset-4 hover:text-white hover:underline">
              Hide guide
            </button>
          </div>
          <div aria-live="polite" className="space-y-1.5 sm:mt-1 sm:space-y-2">
            <h1 id="tour-stop-title" className="font-serif text-[1.75rem] leading-tight font-semibold sm:text-4xl">
              {stop.title}
            </h1>
            <p className="text-xs font-semibold text-gold-bright sm:text-sm">{stop.fact}</p>
            <p className="text-sm text-white/85 sm:text-base">{stop.body}</p>
          </div>
          {support === "none" && (
            <p className="mt-3 text-sm text-white/70">Your browser can&apos;t show the 3D view, so here&apos;s the walk-through in words.</p>
          )}

          <nav aria-label="Tour stops" className="-mx-4 mt-3 overflow-x-auto px-4 sm:mx-0 sm:mt-4 sm:overflow-visible sm:px-0">
            <ol className="flex gap-1.5 sm:flex-wrap">
              {STOPS.map((item, position) => (
                <li key={item.id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => goTo(position)}
                    aria-current={position === index ? "step" : undefined}
                    className={`min-h-9 rounded-full border px-3 text-xs font-semibold transition ${
                      position === index ? "border-primary bg-primary text-heading" : "border-white/25 text-white/80 hover:border-gold-bright hover:text-white"
                    }`}
                  >
                    {position + 1}. {item.name}
                  </button>
                </li>
              ))}
            </ol>
          </nav>

          <div className="mt-3 flex items-center gap-2 sm:mt-4">
            <button
              type="button"
              onClick={() => goTo(index - 1)}
              disabled={index === 0}
              aria-label="Previous stop"
              className="glass inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg transition hover:border-gold-bright disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Arrow direction="left" />
            </button>
            {isLast ? (
              <>
                <Link href="/#book" className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-primary px-5 font-semibold text-heading transition hover:bg-gold-bright">
                  Book your family&apos;s tickets
                </Link>
                <button type="button" onClick={() => goTo(0)} className="glass inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-semibold transition hover:border-gold-bright">
                  Start again
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => goTo(index + 1)}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded-lg bg-primary px-5 font-semibold text-heading transition hover:bg-gold-bright"
              >
                Next: {STOPS[index + 1].name}
                <Arrow direction="right" />
              </button>
            )}
          </div>
          {support === "webgl" && <p className="mt-3 hidden text-xs text-white/60 sm:block">Drag to look around, scroll to zoom, or use the arrow keys to move between stops.</p>}
          {support === "webgl" && <p className="mt-2 text-xs text-white/60 sm:hidden">Drag to look around · pinch to zoom</p>}
        </section>
      ) : (
        <button
          type="button"
          onClick={() => setGuideOpen(true)}
          className="absolute bottom-4 left-4 inline-flex min-h-11 items-center rounded-lg bg-night/85 px-4 text-sm font-semibold backdrop-blur-md transition hover:text-gold-bright sm:bottom-5 sm:left-5"
        >
          Show guide · {stop.title}
        </button>
      )}
    </div>
  );
}
