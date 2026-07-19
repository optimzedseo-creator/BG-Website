"use client";

import { useEffect, useRef, useState } from "react";
import type { CompareMode, PeriodKind } from "@/lib/admin/iq/types";
import { buildIqQuery } from "@/lib/admin/iq/shared";
import { publishPeriod, type PeriodSignal } from "../period-bus";
import { fmtDay } from "../fmt";
import DateRangeControl from "../iq/DateRangeControl";

/*
 * Dashboard Wave WP2 — the overview control strip (.adm-controlbar): ONE
 * sentence-pill ("This month · vs prior month ▾") opening ONE popover with two
 * stacked radio sections (Period / Compare to). UX spec: period changes apply
 * immediately on selection (the popover stays open so "this quarter vs last
 * quarter" is two clicks); Custom applies on the DateRangeControl's own Apply.
 * At ≤640px the popover renders as a bottom sheet (CSS — same DOM).
 *
 * State ownership: this strip renders FROM props (CommandView's params state)
 * and publishes changes onto the period bus — the same single path the top-bar
 * PeriodSwitch uses, so CommandView has exactly one refetch entry point and
 * the URL keeps its single owner (island success-path replaceState). The pill
 * sentence's compare half prefers the PAYLOAD echo (compareLabel) — the
 * server-authoritative name of what is actually being compared — over any
 * client-side re-derivation.
 *
 * SCOPE (WP2): overview/Command only. Other modules stay on ?p= — their
 * migration is a later WP. The top bar is deliberately untouched; its 7/30/90
 * switch doubles as the "back to window mode" control.
 */

const PERIOD_OPTIONS: { kind: PeriodKind; label: string }[] = [
  { kind: "today", label: "Today" },
  { kind: "week", label: "This week" },
  { kind: "month", label: "This month" },
  { kind: "quarter", label: "This quarter" },
  { kind: "year", label: "This year" },
  { kind: "custom", label: "Custom range…" },
];

/** Pill sentence, period half. Window mode names the fallback plainly. Custom
 * uses the same fmtDay + " to " idiom as the head sub-line (design N1 — no raw
 * en-dash range). */
function periodLabel(s: PeriodSignal): string {
  if (!s.period) return `Last ${s.window} days`;
  if (s.period === "custom")
    return s.from && s.to ? `${fmtDay(s.from)} to ${fmtDay(s.to)}` : "Custom range";
  return PERIOD_OPTIONS.find((o) => o.kind === s.period)?.label ?? s.period;
}

/** Period-aware hint for the "Previous period" radio (ux: the pre-selected
 * default reads as "previous quarter" under "This quarter"). UI affordance
 * only — the card rows and the pill's applied sentence use the payload echo. */
const PREV_HINT: Record<PeriodKind | "window", string> = {
  today: "yesterday",
  week: "previous week",
  month: "previous month",
  quarter: "previous quarter",
  year: "previous year",
  custom: "previous period",
  window: "previous period",
};

export default function ControlStrip({
  params,
  compareLabel,
  loading,
  viewSlot,
}: {
  params: PeriodSignal;
  /** The payload's PeriodEcho.compareLabel — what the source actually compared
   * against ("prior month", "same dates last year"); null when compare is off. */
  compareLabel: string | null;
  /** A refetch is in flight (ux #11): the payload echo is STALE for the freshly
   * picked params, so the pill's compare half falls back to the client hint
   * until the new payload lands. */
  loading: boolean;
  /** Ph2-WP2: extra strip controls (view selector + edit entry) rendered after
   * the pill inside the SAME .adm-controlbar row. Additive — omitted, the
   * strip is byte-identical to Phase 1. */
  viewSlot?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  // "Custom range…" radio selected but no range applied yet (the reveal state).
  const [pendingCustom, setPendingCustom] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLButtonElement>(null);

  // External period changes (top-bar window flip) cancel a half-done custom pick.
  useEffect(() => {
    if (params.period !== "custom") setPendingCustom(false);
  }, [params.period]);

  // Close + restore focus to the pill (ux #8) — Esc and scrim both land here.
  function close() {
    setOpen(false);
    pillRef.current?.focus();
  }

  // Escape closes (listener only while open).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function publish(next: PeriodSignal) {
    const handled = publishPeriod(next);
    if (!handled) {
      // No island subscribed (should not happen on overview) — hard-navigate so
      // the selection is never silently dropped.
      const qs = buildIqQuery(next.window, {}, next);
      window.location.assign(`/admin/overview${qs ? `?${qs}` : ""}`);
    }
  }

  function choosePeriod(kind: PeriodKind) {
    if (kind === "custom") {
      // Reveal the range fields; nothing applies until their Apply (ux spec).
      setPendingCustom(true);
      return;
    }
    setPendingCustom(false);
    if (kind === params.period) return;
    publish({
      window: params.window,
      period: kind,
      compareMode: params.compareMode,
      from: null,
      to: null,
      cmpFrom: null,
      cmpTo: null,
    });
  }

  function applyCustom(range: { from: string; to: string } | null) {
    if (!range) {
      // Clear during a PENDING pick (nothing custom applied yet) is a cancel
      // gesture, not a state change — it must NOT knock an applied preset
      // ("This month") back to window mode (ux P2-2). Collapse the reveal only.
      if (params.period !== "custom") {
        setPendingCustom(false);
        return;
      }
      // Clear AFTER apply → back to the window fallback. compareMode "year"
      // cannot survive into window mode (api N1 — no year anchor there).
      setPendingCustom(false);
      publish({
        window: params.window,
        period: null,
        compareMode: params.compareMode === "year" ? "prior" : params.compareMode,
        from: null,
        to: null,
        cmpFrom: null,
        cmpTo: null,
      });
      return;
    }
    setPendingCustom(false);
    publish({
      window: params.window,
      period: "custom",
      compareMode: params.compareMode,
      from: range.from,
      to: range.to,
      cmpFrom: null,
      cmpTo: null,
    });
  }

  function chooseCompare(mode: CompareMode) {
    if (mode === params.compareMode) return;
    publish({ ...params, compareMode: mode });
  }

  const customOn = pendingCustom || params.period === "custom";
  const hintKind: PeriodKind | "window" = customOn ? "custom" : (params.period ?? "window");
  // Compare half of the sentence: the payload echo is authoritative once a
  // fetch lands — but while one is IN FLIGHT the echo describes the previous
  // pick (ux #11 / data-analyst N2), so fall back to a client hint until the
  // fresh payload arrives. Factcheck W3: the fallback is compare-mode-aware —
  // under "year" it must never transiently read "vs previous quarter".
  const pendingFallback =
    params.compareMode === "year" ? "same period last year" : PREV_HINT[hintKind];
  const compareText =
    params.compareMode === "none"
      ? "no compare"
      : `vs ${!loading && compareLabel ? compareLabel : pendingFallback}`;
  // "Same period last year" needs a calendar anchor — under the window fallback
  // the data layer would silently compute plain prior-period, so the option is
  // disabled (with the reason) rather than mislabeled (honesty contract).
  const yearDisabled = !params.period;

  return (
    <div className="adm-controlbar">
      <div className="adm-timepill-wrap" ref={wrapRef}>
        <button
          ref={pillRef}
          type="button"
          className="adm-timepill"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <span>
            {periodLabel(params)} · {compareText}
          </span>
          <span className="adm-timepill-caret" aria-hidden="true">
            ▾
          </span>
        </button>

        {open && (
          <>
            <div className="adm-timepop-scrim" onClick={close} />
            <div className="adm-timepop" role="dialog" aria-label="Period and comparison">
              <div className="adm-timepop-sec">
                <span className="adm-timepop-title" id="adm-timepop-period">
                  Period
                </span>
                <div className="adm-timeopts" role="radiogroup" aria-labelledby="adm-timepop-period">
                  {PERIOD_OPTIONS.map((o) => {
                    const on = o.kind === "custom" ? customOn : !customOn && params.period === o.kind;
                    return (
                      <button
                        key={o.kind}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        className={`adm-timeopt${on ? " is-on" : ""}`}
                        onClick={() => choosePeriod(o.kind)}
                      >
                        {o.label}
                      </button>
                    );
                  })}
                </div>
                {customOn && (
                  <div className="adm-timepop-custom">
                    <DateRangeControl
                      defaultOpen
                      range={params.period === "custom" && params.from && params.to ? { from: params.from, to: params.to } : null}
                      onChange={applyCustom}
                    />
                  </div>
                )}
              </div>

              <div className="adm-timepop-sec">
                <span className="adm-timepop-title" id="adm-timepop-compare">
                  Compare to
                </span>
                <div className="adm-timeopts" role="radiogroup" aria-labelledby="adm-timepop-compare">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={params.compareMode === "prior"}
                    className={`adm-timeopt${params.compareMode === "prior" ? " is-on" : ""}`}
                    onClick={() => chooseCompare("prior")}
                  >
                    <span>Previous period</span>
                    <span className="adm-timeopt-hint">{PREV_HINT[hintKind]}</span>
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={params.compareMode === "year"}
                    aria-disabled={yearDisabled}
                    className={`adm-timeopt${params.compareMode === "year" ? " is-on" : ""}`}
                    onClick={() => {
                      if (!yearDisabled) chooseCompare("year");
                    }}
                  >
                    <span>Same period last year</span>
                    {/* ux P2-1: the WHY must be visible, not title-only — touch
                        users get no hover, and a silent dead control reads as
                        broken. Same muted hint slot as the Previous option. */}
                    {yearDisabled && (
                      <span className="adm-timeopt-hint">pick a calendar period first</span>
                    )}
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={params.compareMode === "none"}
                    className={`adm-timeopt${params.compareMode === "none" ? " is-on" : ""}`}
                    onClick={() => chooseCompare("none")}
                  >
                    Off
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      {viewSlot}
    </div>
  );
}
