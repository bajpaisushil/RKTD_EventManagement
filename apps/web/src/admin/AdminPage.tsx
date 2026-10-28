"use client";

import type { FestivalView } from "@rktd/domain";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Button, Notice, TextField } from "@/components/ui";
import { api } from "@/lib/api";
import { BookingsBoard } from "./BookingsBoard";
import { Icon } from "./parts";

const PASSCODE_KEY = "admin-passcode";

function readPasscode(): string {
  try {
    return sessionStorage.getItem(PASSCODE_KEY) ?? "";
  } catch {
    return "";
  }
}

function storePasscode(passcode: string): void {
  try {
    if (passcode) sessionStorage.setItem(PASSCODE_KEY, passcode);
    else sessionStorage.removeItem(PASSCODE_KEY);
  } catch {
    // Without storage the passcode is asked for again after a refresh.
  }
}

function Monogram({ className = "size-10 text-lg" }: { className?: string }) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-xl bg-linear-to-br from-gold-bright to-gold-deep font-serif font-bold text-white shadow-sm ${className}`}>
      SU
    </span>
  );
}

function Unlock({ notice, onUnlock }: { notice: string | null; onUnlock: (passcode: string) => Promise<string | null> }) {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-12">
      <form
        className="w-full max-w-sm space-y-6 rounded-3xl border border-line bg-white p-8 shadow-[0_24px_60px_-24px_rgb(41_25_0/0.25)]"
        onSubmit={async (event) => {
          event.preventDefault();
          setChecking(true);
          setError(await onUnlock(passcode));
          setChecking(false);
        }}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <Monogram className="size-14 text-2xl" />
          <h1 className="font-serif text-3xl font-semibold text-heading">Festival admin</h1>
          <p className="text-sm">Bookings, payments and check-ins for Sharad Utsav 2026.</p>
        </div>
        {notice && <Notice tone="warning">{notice}</Notice>}
        <TextField
          id="passcode"
          label="Passcode"
          type="password"
          autoComplete="current-password"
          autoFocus
          value={passcode}
          onChange={(event) => setPasscode(event.target.value)}
          error={error ?? undefined}
        />
        <Button type="submit" disabled={!passcode || checking} className="w-full">
          <Icon name="lock" />
          {checking ? "Checking…" : "Unlock"}
        </Button>
        <p className="text-center text-xs">Ask the festival coordinator for the passcode.</p>
      </form>
    </main>
  );
}

function Shell({ onLock, children }: { onLock: () => void; children: ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Monogram />
            <div className="min-w-0 leading-tight">
              <p className="truncate font-serif text-xl font-semibold text-heading">Sharad Utsav 2026</p>
              <p className="truncate text-xs">Admin · Radha Krishna Temple, Allen</p>
            </div>
          </div>
          <nav className="flex shrink-0 items-center gap-1 text-sm font-medium">
            <Link href="/" className="hidden rounded-lg px-3 py-2 text-heading transition hover:bg-paper sm:inline-flex sm:items-center sm:gap-1.5">
              View site
              <Icon name="external" className="size-3.5" />
            </Link>
            <button type="button" onClick={onLock} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-heading transition hover:bg-paper">
              <Icon name="lock" className="size-3.5" />
              Lock
            </button>
          </nav>
        </div>
      </header>
      {children}
    </>
  );
}

export function AdminPage() {
  const [passcode, setPasscode] = useState<string | null>(null);
  const [festival, setFestival] = useState<FestivalView | null>(null);
  const [lockNotice, setLockNotice] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setPasscode(readPasscode());
    api.festival().then(setFestival, () => setLoadError("Couldn't load the festival. Check your connection and refresh."));
  }, []);

  function lock(notice: string | null = null) {
    storePasscode("");
    setPasscode("");
    setLockNotice(notice);
  }

  async function unlock(candidate: string): Promise<string | null> {
    try {
      await api.adminBookings({ q: "", status: null, day: null }, 0, candidate);
      storePasscode(candidate);
      setPasscode(candidate);
      setLockNotice(null);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "That didn't work";
    }
  }

  return (
    <div data-admin className="min-h-dvh bg-paper text-body">
      {passcode === "" && <Unlock notice={lockNotice} onUnlock={unlock} />}
      {passcode && (
        <Shell onLock={() => lock()}>
          {loadError && (
            <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
              <Notice tone="error">{loadError}</Notice>
            </div>
          )}
          {festival && <BookingsBoard passcode={passcode} festival={festival} onUnauthorized={() => lock("The passcode has changed. Please enter it again.")} />}
        </Shell>
      )}
    </div>
  );
}
