"use client";

import type { BookingRequestBody, CreateBookingResponse, FestivalView, QuoteRequestBody, QuoteResponse } from "@rktd/domain";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ApiRequestError, api } from "@/lib/api";

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

export function useFestival() {
  const [festival, setFestival] = useState<FestivalView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setFestival(await api.festival());
    } catch (e) {
      setError(messageOf(e));
      toast.error(messageOf(e), { id: "festival" });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { festival, error, reload: load };
}

type QuoteState = {
  response: QuoteResponse | null;
  forRequest: string | null;
  loading: boolean;
  error: string | null;
};

// Asks the server for a price 300ms after the booking stops changing. Older
// requests are cancelled, so a slow reply can never overwrite a newer one.
export function useQuote(request: QuoteRequestBody | null) {
  const [state, setState] = useState<QuoteState>({ response: null, forRequest: null, loading: false, error: null });
  const [attempt, setAttempt] = useState(0);
  const key = request ? JSON.stringify(request) : null;

  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    const timer = setTimeout(async () => {
      try {
        const response = await api.quote(JSON.parse(key), controller.signal);
        setState({ response, forRequest: key, loading: false, error: null });
      } catch (e) {
        if (!controller.signal.aborted) setState((s) => ({ ...s, loading: false, error: messageOf(e) }));
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [key, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, [retry]);

  const isCurrent = state.forRequest === key && !state.loading && !state.error;
  return { response: state.response, loading: state.loading, error: state.error, isCurrent, retry };
}

// The same booking always goes out with the same Idempotency-Key, so a double
// click or a retry after a dropped connection can't create two bookings.
export function useCheckout() {
  const attempt = useRef<{ body: string; key: string } | null>(null);
  const inFlight = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ApiRequestError | null>(null);

  async function pay(request: BookingRequestBody): Promise<CreateBookingResponse | null> {
    if (inFlight.current) return null;
    const body = JSON.stringify(request);
    if (attempt.current?.body !== body) attempt.current = { body, key: crypto.randomUUID() };

    inFlight.current = true;
    setSubmitting(true);
    setError(null);
    try {
      return await api.createBooking(request, attempt.current.key);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e : new ApiRequestError(0, null, messageOf(e)));
      inFlight.current = false;
      setSubmitting(false);
      return null;
    }
  }

  return { pay, submitting, error, clearError: () => setError(null) };
}
