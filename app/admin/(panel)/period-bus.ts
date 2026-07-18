"use client";

// Wave 2 period plumbing (WP2.3 consumer contract): the top-bar PeriodSwitch
// publishes; two listener channels exist because they mean different things:
//
//  - REFETCH listeners (the Command island) actually recompute their surface
//    through /api/admin/iq without navigation. When one is present the switch
//    syncs ?p= via history.replaceState instead of navigating.
//  - WATCH listeners (the rail) only mirror the current period into their
//    links/highlights and never count as "handled" — otherwise the rail's
//    mere presence would swallow the navigation fallback on server-rendered
//    pages (the landing).

import type { WindowDays } from "@/lib/admin/iq/types";

export { parseWindowParam } from "@/lib/admin/iq/shared";

type PeriodListener = (p: WindowDays) => void;

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
export function publishPeriod(p: WindowDays): boolean {
  for (const fn of watchListeners) fn(p);
  const handled = refetchListeners.size > 0;
  for (const fn of refetchListeners) fn(p);
  return handled;
}

