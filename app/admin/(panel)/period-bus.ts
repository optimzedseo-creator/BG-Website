"use client";

// Period plumbing (WP2.3 consumer contract → PERIOD-UI wave): the top-bar
// PeriodSwitch and the compare pills publish; two listener channels exist
// because they mean different things:
//
//  - REFETCH listeners (the module islands) actually recompute their surface
//    through /admin/api/iq* without navigation. When one is present the
//    publisher lets the island sync the querystring itself (api A4
//    single-owner rule) instead of navigating.
//  - WATCH listeners (the rail, the top-bar switch) only mirror the current
//    period into their links/highlights and never count as "handled" —
//    otherwise their mere presence would swallow the navigation fallback on
//    server-rendered pages (Search, Leads, the landing).
//
// PERIOD-UI wave: the DEFAULT signal is calendar month-to-date ("month") —
// window mode (`period: null`) is no longer published by any control. The
// required `window` field stays the dormant internal fallback (contract rule
// 2); nothing user-facing emits ?p= anymore.

import type { WindowDays } from "@/lib/admin/iq/types";
import { buildIqQuery, type PeriodParams } from "@/lib/admin/iq/shared";

export { parseWindowParam } from "@/lib/admin/iq/shared";

/** The full period state on the bus: the parsed dashboard-wave params PLUS the
 * required `window` fallback. `period: null` = window mode (internal fallback
 * only — no control publishes it since the PERIOD-UI wave). */
export interface PeriodSignal extends PeriodParams {
  window: WindowDays;
}

type PeriodListener = (s: PeriodSignal) => void;

const refetchListeners = new Set<PeriodListener>();
const watchListeners = new Set<PeriodListener>();

export function subscribePeriodRefetch(fn: PeriodListener): () => void {
  refetchListeners.add(fn);
  return () => {
    refetchListeners.delete(fn);
  };
}

export function watchPeriod(fn: PeriodListener): () => void {
  watchListeners.add(fn);
  return () => {
    watchListeners.delete(fn);
  };
}

/** Broadcast a period change. Returns true when a refetch consumer handled it
 * (caller then lets the island write the canonical URL instead of navigating). */
export function publishPeriod(s: PeriodSignal): boolean {
  for (const fn of watchListeners) fn(s);
  const handled = refetchListeners.size > 0;
  for (const fn of refetchListeners) fn(s);
  return handled;
}

/** The grammar keys the navigation fallback rewrites wholesale. ?p= is
 * included: it is the dormant legacy fallback and must never re-enter a URL
 * from a control (a lingering ?p would be dead state under the MTD default). */
const GRAMMAR_KEYS = ["p", "period", "compare", "from", "to", "cmpFrom", "cmpTo"] as const;

/**
 * PERIOD-UI wave — the ONE publish path for the top-bar switch AND the compare
 * pills. If a refetch island handled the signal, done (the island writes the
 * canonical URL on success). Otherwise this is a server-rendered page (Search,
 * Leads, the landing, Security): navigate, rewriting the grammar keys wholesale
 * while page-local params (status, sort, chips) survive. `window` is forced to
 * 30 in the serialization so ?p= never reappears.
 */
export function publishPeriodOrNavigate(
  next: PeriodSignal,
  nav: { pathname: string; search: string; replace: (url: string) => void }
): void {
  if (publishPeriod(next)) return;
  const qs = new URLSearchParams(nav.search);
  for (const k of GRAMMAR_KEYS) qs.delete(k);
  const grammar = new URLSearchParams(buildIqQuery(30, {}, next));
  for (const [k, v] of grammar) qs.set(k, v);
  const s = qs.toString();
  nav.replace(`${nav.pathname}${s ? `?${s}` : ""}`);
}
