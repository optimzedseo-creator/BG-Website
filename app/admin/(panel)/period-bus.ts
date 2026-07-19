"use client";

// Wave 2 period plumbing (WP2.3 consumer contract): the top-bar PeriodSwitch
// and the overview control strip publish; two listener channels exist because
// they mean different things:
//
//  - REFETCH listeners (the Command island) actually recompute their surface
//    through /api/admin/iq without navigation. When one is present the switch
//    syncs the querystring via history.replaceState instead of navigating.
//  - WATCH listeners (the rail) only mirror the current period into their
//    links/highlights and never count as "handled" — otherwise the rail's
//    mere presence would swallow the navigation fallback on server-rendered
//    pages (the landing).
//
// Dashboard Wave WP2 (ux sequencing item 1): the bus now broadcasts the FULL
// parsed period params object (PeriodSignal), not a WindowDays scalar — the
// same upgrade that unblocked DateRangeControl's global wiring. `window` stays
// a required field of the signal, so window-only consumers (rail links, the
// Traffic/Content/Activity islands still on ?p=) keep working by reading
// `signal.window` (the documented fallback, contract rule 2).

import type { WindowDays } from "@/lib/admin/iq/types";
import type { PeriodParams } from "@/lib/admin/iq/shared";

export { parseWindowParam } from "@/lib/admin/iq/shared";

/** The full period state on the bus: the parsed dashboard-wave params PLUS the
 * required `window` fallback. `period: null` = window mode (legacy ?p=). */
export interface PeriodSignal extends PeriodParams {
  window: WindowDays;
}

/** A pure window-mode signal (the top-bar 7/30/90 switch): period preset off,
 * compare back to the historical "prior" default. */
export function windowSignal(window: WindowDays): PeriodSignal {
  return {
    window,
    period: null,
    compareMode: "prior",
    from: null,
    to: null,
    cmpFrom: null,
    cmpTo: null,
  };
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
 * (caller then syncs the querystring via replaceState instead of navigating). */
export function publishPeriod(s: PeriodSignal): boolean {
  for (const fn of watchListeners) fn(s);
  const handled = refetchListeners.size > 0;
  for (const fn of refetchListeners) fn(s);
  return handled;
}
