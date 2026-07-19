"use client";

// WP3.1 — the ONE hash router shared by every drill. Modal open-state reflects
// to location.hash so a deep-link or refresh restores the modal, and Esc/close
// clears it. Routes: #/kpi/<id>, #/page/<enc-path>, #/visitor/<id>.
//
// Opening sets location.hash (one history entry, fires hashchange). Closing
// uses replaceState to strip the hash WITHOUT a scroll jump or a second entry,
// then updates local state directly (replaceState fires no event).

import { useEffect, useState } from "react";
import type { GscDetailKind } from "@/lib/admin/iq/types";

export type DrillRoute =
  | { kind: "kpi"; arg: string }
  | { kind: "page"; arg: string }
  | { kind: "visitor"; arg: string }
  | { kind: "gsc"; gscKind: GscDetailKind; query: string | null }
  | { kind: "funnel"; arg: string; tab?: string }
  | { kind: "day"; arg: string }
  | null;

const FUNNEL_TABS: readonly string[] = ["events", "trend", "people"];

const GSC_KINDS: readonly GscDetailKind[] = ["branded", "classifiable", "intent", "query"];

function safeDecode(s: string): string | null {
  try {
    return decodeURIComponent(s);
  } catch {
    return null;
  }
}

export function parseHash(hash: string): DrillRoute {
  const body = hash.replace(/^#\/?/, "");
  const slash = body.indexOf("/");
  if (slash < 0) return null;
  const kind = body.slice(0, slash);
  const rest = body.slice(slash + 1);
  if (!rest) return null;

  // GSC has a nested shape: gsc/<gscKind>[/<enc-query>]. Split BEFORE decoding
  // so a query containing "/" round-trips through its own encoded segment.
  if (kind === "gsc") {
    const sub = rest.indexOf("/");
    const gscKindRaw = sub < 0 ? rest : rest.slice(0, sub);
    const gscKind = GSC_KINDS.find((k) => k === gscKindRaw);
    if (!gscKind) return null;
    if (gscKind === "query") {
      if (sub < 0) return null;
      const query = safeDecode(rest.slice(sub + 1));
      if (!query) return null;
      return { kind: "gsc", gscKind, query };
    }
    return { kind: "gsc", gscKind, query: null };
  }

  // Funnel carries an optional tab segment (#/funnel/<step>/people) so a
  // rate-card open lands on the reached-next cohort; a step-cell open defaults.
  if (kind === "funnel") {
    const sub = rest.indexOf("/");
    const step = safeDecode(sub < 0 ? rest : rest.slice(0, sub));
    if (step === null) return null;
    const tabRaw = sub < 0 ? null : safeDecode(rest.slice(sub + 1));
    const tab = tabRaw && FUNNEL_TABS.includes(tabRaw) ? tabRaw : undefined;
    return { kind: "funnel", arg: step, tab };
  }

  const arg = safeDecode(rest);
  if (arg === null) return null;
  if (kind === "kpi") return { kind: "kpi", arg };
  if (kind === "page") return { kind: "page", arg };
  if (kind === "visitor") return { kind: "visitor", arg };
  if (kind === "day") return { kind: "day", arg };
  return null;
}

export const kpiHash = (id: string): string => `#/kpi/${encodeURIComponent(id)}`;
export const pageHash = (path: string): string => `#/page/${encodeURIComponent(path)}`;
export const visitorHash = (id: string): string => `#/visitor/${encodeURIComponent(id)}`;
export const gscHash = (gscKind: GscDetailKind, query?: string): string =>
  gscKind === "query" && query ? `#/gsc/query/${encodeURIComponent(query)}` : `#/gsc/${gscKind}`;
export const funnelHash = (step: string, tab?: string): string =>
  tab ? `#/funnel/${encodeURIComponent(step)}/${encodeURIComponent(tab)}` : `#/funnel/${encodeURIComponent(step)}`;
export const dayHash = (day: string): string => `#/day/${encodeURIComponent(day)}`;

/** Open a drill by setting the hash (deep-linkable, adds one history entry). */
export function openDrill(hash: string): void {
  if (typeof window !== "undefined") window.location.hash = hash;
}

export function useHashRoute(): { route: DrillRoute; close: () => void } {
  const [route, setRoute] = useState<DrillRoute>(null);

  useEffect(() => {
    const sync = () => setRoute(parseHash(window.location.hash));
    sync();
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);

  const close = () => {
    if (typeof window !== "undefined" && window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    setRoute(null);
  };

  return { route, close };
}
