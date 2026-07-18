"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { WindowDays } from "@/lib/admin/iq/types";
import { parseWindowParam, publishPeriod } from "./period-bus";

/*
 * Global period filter (WP2.1): segmented 7d / 30d / 90d ONLY, persisted as
 * ?p= (default 30). No "Custom" until the DateRangeModal exists (Wave 3) and
 * no compare toggle until overlays exist — dead affordances are banned
 * (logged deviation from the WP2.1 slot list; manager ruling).
 *
 * URL single-owner rule (api A4): on island pages (Command/Traffic/Content)
 * the island refetches through /admin/api/iq* without navigation and writes
 * the FULL canonical querystring itself on SUCCESS — this switch writes
 * NOTHING there (two writers raced under rapid flips, and a failed refetch
 * left the URL claiming data the surface didn't show). Everywhere else it
 * navigates (server re-render).
 */

const WINDOWS: readonly WindowDays[] = [7, 30, 90];

export default function PeriodSwitch() {
  const pathname = usePathname() ?? "/admin";
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlPeriod = parseWindowParam(searchParams.get("p"));
  const [period, setPeriod] = useState<WindowDays>(urlPeriod);

  // Real navigations (rail clicks, deep links) win over stale local state.
  useEffect(() => {
    setPeriod(urlPeriod);
  }, [urlPeriod]);

  function choose(d: WindowDays) {
    if (d === period) return;
    setPeriod(d);
    const handled = publishPeriod(d);
    if (!handled) {
      // No island present — navigate (server re-render owns the URL).
      const qs = new URLSearchParams(searchParams.toString());
      qs.set("p", String(d));
      router.replace(`${pathname}?${qs.toString()}`);
    }
    // handled: the island writes the canonical URL on success (A4) — never here.
  }

  return (
    <nav className="adm-window" aria-label="Period">
      {WINDOWS.map((d) => (
        <button
          key={d}
          type="button"
          className={d === period ? "on" : ""}
          aria-current={d === period ? "true" : undefined}
          onClick={() => choose(d)}
        >
          {d}d
        </button>
      ))}
    </nav>
  );
}
