"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CompareMode, PeriodKind } from "@/lib/admin/iq/types";
import { publishPeriodOrNavigate, type PeriodSignal } from "./period-bus";

/*
 * PERIOD-UI wave — the COMPARE pill (day vs day · week vs week · month vs
 * month · quarter vs quarter · year vs year, driven by the period the top bar
 * owns). ONE compare owner per page: the overview control strip hosts it, and
 * every migrated module page that RENDERS comparisons (Traffic, Content,
 * Search) hosts its own. Pages that compare nothing (Activity log, Leads
 * snapshots) deliberately render none — a compare control over zero compared
 * numbers is a dead affordance.
 *
 * The pill sentence's compare half prefers the PAYLOAD echo (compareLabel) —
 * the server-authoritative name of what was actually compared — falling back
 * to a compare-mode-aware client hint only while a refetch is in flight
 * (factcheck W3: under "year" it must never transiently read "previous X").
 *
 * Publishing rides the same bus as the period switch; on server-rendered
 * pages (Search) the navigation fallback re-renders with the new grammar.
 */

// Content #4: aligned to the SERVER label vocabulary (comparisonLabel emits
// "prior week/month/quarter/year" and "prior period") — the in-flight hint and
// the landed payload label must read as the same words. "yesterday" stays
// (the server says it too).
const PREV_HINT: Record<PeriodKind | "window", string> = {
  today: "yesterday",
  week: "prior week",
  month: "prior month",
  quarter: "prior quarter",
  year: "prior year",
  custom: "prior period",
  window: "prior period",
};

const YEAR_HINT: Record<PeriodKind | "window", string> = {
  today: "same day last year",
  week: "same dates last year",
  month: "same month last year",
  quarter: "same quarter last year",
  year: "prior year",
  custom: "same dates last year",
  window: "same dates last year",
};

export default function CompareControl({
  params,
  compareLabel,
  loading = false,
}: {
  params: PeriodSignal;
  /** The payload's PeriodEcho.compareLabel — what the source actually compared
   * against; null when compare is off. */
  compareLabel: string | null;
  /** A refetch is in flight — the payload echo is stale for the freshly picked
   * params, so the pill falls back to the client hint until it lands. */
  loading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pillRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname() ?? "/admin";
  const searchParams = useSearchParams();
  const router = useRouter();

  // Close + restore focus to the pill (ux #8) — Esc and scrim both land here.
  function close() {
    setOpen(false);
    pillRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function choose(mode: CompareMode) {
    // ux #8: choosing closes the popover and hands focus back to the pill —
    // same exit path as Esc/scrim, even on a no-op re-pick.
    close();
    if (mode === params.compareMode) return;
    publishPeriodOrNavigate(
      { ...params, compareMode: mode },
      {
        pathname,
        search: searchParams.toString(),
        replace: (url) => router.replace(url),
      }
    );
  }

  const hintKind: PeriodKind | "window" = params.period ?? "window";
  const pendingFallback =
    params.compareMode === "year" ? YEAR_HINT[hintKind] : PREV_HINT[hintKind];
  const compareText =
    params.compareMode === "none"
      ? "no compare"
      : `vs ${!loading && compareLabel ? compareLabel : pendingFallback}`;

  const OPTIONS: { mode: CompareMode; label: string; hint: string | null }[] = [
    { mode: "prior", label: "Prior period", hint: PREV_HINT[hintKind] },
    { mode: "year", label: "Same period last year", hint: YEAR_HINT[hintKind] },
    { mode: "none", label: "Off", hint: null },
  ];

  return (
    <div className="adm-timepill-wrap">
      <button
        ref={pillRef}
        type="button"
        className="adm-timepill"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{compareText}</span>
        <span className="adm-timepill-caret" aria-hidden="true">
          ▾
        </span>
      </button>

      {open && (
        <>
          <div className="adm-timepop-scrim" onClick={close} />
          <div className="adm-timepop" role="dialog" aria-label="Comparison">
            <div className="adm-timepop-sec">
              <span className="adm-timepop-title" id="adm-timepop-compare">
                Compare to
              </span>
              <div className="adm-timeopts" role="radiogroup" aria-labelledby="adm-timepop-compare">
                {OPTIONS.map((o) => (
                  <button
                    key={o.mode}
                    type="button"
                    role="radio"
                    aria-checked={params.compareMode === o.mode}
                    className={`adm-timeopt${params.compareMode === o.mode ? " is-on" : ""}`}
                    onClick={() => choose(o.mode)}
                  >
                    <span>{o.label}</span>
                    {o.hint && <span className="adm-timeopt-hint">{o.hint}</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
