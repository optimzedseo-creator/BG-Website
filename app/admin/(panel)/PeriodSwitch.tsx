"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { WindowDays } from "@/lib/admin/iq/types";
import { parsePeriodParam } from "@/lib/admin/iq/shared";
import { parseWindowParam, publishPeriod, watchPeriod, windowSignal } from "./period-bus";

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
  // WP2 fix (ux P2-3): while a CALENDAR period is active ("This quarter" on
  // the overview strip) the ?p= window is only the dormant fallback — claiming
  // "30d" active would be a false state claim. Seeded from the URL grammar
  // (deep links), kept live via the period bus (replaceState flips don't
  // update useSearchParams).
  const urlCalendar =
    parsePeriodParam({
      period: searchParams.get("period"),
      compare: searchParams.get("compare"),
      from: searchParams.get("from"),
      to: searchParams.get("to"),
      cmpFrom: searchParams.get("cmpFrom"),
      cmpTo: searchParams.get("cmpTo"),
    }).period !== null;
  const [calendarActive, setCalendarActive] = useState(urlCalendar);

  // Real navigations (rail clicks, deep links) win over stale local state.
  useEffect(() => {
    setPeriod(urlPeriod);
  }, [urlPeriod]);
  useEffect(() => {
    setCalendarActive(urlCalendar);
  }, [urlCalendar]);
  useEffect(
    () =>
      watchPeriod((s) => {
        setPeriod(s.window);
        setCalendarActive(s.period !== null);
      }),
    []
  );

  function choose(d: WindowDays) {
    // Same window but a calendar period active → still a real reset to window
    // mode (without this, "This quarter" + click "30d" would be a dead click).
    if (d === period && !calendarActive) return;
    setPeriod(d);
    setCalendarActive(false);
    // A window flip is an explicit RESET to window mode (WP2): any calendar
    // preset/custom range on the overview strip clears, compare returns to the
    // historical "prior" default. windowSignal encodes exactly that.
    const handled = publishPeriod(windowSignal(d));
    if (!handled) {
      // No island present — navigate (server re-render owns the URL). The
      // period grammar is stripped: this navigation IS the window-mode reset,
      // and a lingering ?period= would win server-side over the ?p= just set.
      const qs = new URLSearchParams(searchParams.toString());
      qs.set("p", String(d));
      for (const k of ["period", "compare", "from", "to", "cmpFrom", "cmpTo"]) qs.delete(k);
      router.replace(`${pathname}?${qs.toString()}`);
    }
    // handled: the island writes the canonical URL on success (A4) — never here.
  }

  const showActive = (d: WindowDays) => d === period && !calendarActive;

  return (
    <nav className="adm-window" aria-label="Period">
      {WINDOWS.map((d) => (
        <button
          key={d}
          type="button"
          className={showActive(d) ? "on" : ""}
          aria-current={showActive(d) ? "true" : undefined}
          onClick={() => choose(d)}
        >
          {d}d
        </button>
      ))}
    </nav>
  );
}
