"use client";

// WP3.1 — the ONE hash router shared by every drill. Modal open-state reflects
// to location.hash so a deep-link or refresh restores the modal, and Esc/close
// clears it. Routes: #/kpi/<id>, #/page/<enc-path>, #/visitor/<id>.
//
// Opening sets location.hash (one history entry, fires hashchange). Closing
// uses replaceState to strip the hash WITHOUT a scroll jump or a second entry,
// then updates local state directly (replaceState fires no event).

import { useEffect, useState } from "react";

export type DrillRoute =
  | { kind: "kpi"; arg: string }
  | { kind: "page"; arg: string }
  | { kind: "visitor"; arg: string }
  | null;

export function parseHash(hash: string): DrillRoute {
  const body = hash.replace(/^#\/?/, "");
  const slash = body.indexOf("/");
  if (slash < 0) return null;
  const kind = body.slice(0, slash);
  const rawArg = body.slice(slash + 1);
  if (!rawArg) return null;
  let arg: string;
  try {
    arg = decodeURIComponent(rawArg);
  } catch {
    return null;
  }
  if (kind === "kpi") return { kind: "kpi", arg };
  if (kind === "page") return { kind: "page", arg };
  if (kind === "visitor") return { kind: "visitor", arg };
  return null;
}

export const kpiHash = (id: string): string => `#/kpi/${encodeURIComponent(id)}`;
export const pageHash = (path: string): string => `#/page/${encodeURIComponent(path)}`;
export const visitorHash = (id: string): string => `#/visitor/${encodeURIComponent(id)}`;

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
