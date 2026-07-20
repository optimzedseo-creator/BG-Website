"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { PeriodKind } from "@/lib/admin/iq/types";
import { parsePeriodParam } from "@/lib/admin/iq/shared";
import {
  parseWindowParam,
  publishPeriodOrNavigate,
  watchPeriod,
  type PeriodSignal,
} from "./period-bus";
import DateRangeControl from "./iq/DateRangeControl";

/*
 * PERIOD-UI wave — the global top-bar period switch, Brad's exact vocabulary:
 * Today · WTD · MTD · QTD · YTD · Custom (replaces the retired 7d/30d/90d
 * window switch). Segmented control, D2 ink-on-accent active fill, scrollable
 * with a JS-measured .is-scrollable edge-fade ≤640 (the house pattern — no
 * phantom fade when it fits).
 *
 * Publishing: every pick publishes the FULL period params on the bus. Island
 * pages refetch without navigation and write the canonical URL themselves on
 * success (api A4 single-owner rule — this switch writes NOTHING there).
 * Server-rendered pages navigate via publishPeriodOrNavigate's fallback,
 * rewriting the grammar keys wholesale (stale ?p= dropped — the dormant
 * fallback never re-enters a URL).
 *
 * Custom opens a small dropdown panel hosting the shared DateRangeControl
 * (bottom sheet ≤640 via the .adm-timepop rules). Compare lives on the
 * per-page compare pill (CompareControl) — ONE owner per concern.
 */

const SEGMENTS: { kind: PeriodKind; label: string; title: string }[] = [
  { kind: "today", label: "Today", title: "Today so far (Eastern time)" },
  { kind: "week", label: "WTD", title: "Week to date. Weeks start Sunday." },
  { kind: "month", label: "MTD", title: "Month to date. The default view." },
  { kind: "quarter", label: "QTD", title: "Quarter to date" },
  { kind: "year", label: "YTD", title: "Year to date" },
];

export default function PeriodSwitch() {
  const pathname = usePathname() ?? "/admin";
  const searchParams = useSearchParams();
  const router = useRouter();

  // Seeded from the URL grammar (deep links); parsePeriodParam resolves the
  // MTD default when no period params are present — the switch always shows a
  // true active segment.
  const urlSignal: PeriodSignal = {
    window: parseWindowParam(searchParams.get("p")),
    ...parsePeriodParam({
      period: searchParams.get("period"),
      compare: searchParams.get("compare"),
      from: searchParams.get("from"),
      to: searchParams.get("to"),
      cmpFrom: searchParams.get("cmpFrom"),
      cmpTo: searchParams.get("cmpTo"),
    }),
  };
  const [sig, setSig] = useState<PeriodSignal>(urlSignal);
  const [customOpen, setCustomOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const customBtnRef = useRef<HTMLButtonElement>(null);
  const [scrollable, setScrollable] = useState(false);

  // Real navigations (rail clicks, deep links) win over stale local state;
  // replaceState island flips + compare-pill publishes arrive over the bus.
  const urlKey = JSON.stringify(urlSignal);
  useEffect(() => {
    setSig(urlSignal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlKey]);
  useEffect(() => watchPeriod((s) => setSig(s)), []);

  // .is-scrollable edge-fade (house pattern): JS-measured overflow only.
  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const measure = () => setScrollable(el.scrollWidth > el.clientWidth + 1);
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  // ux #5: on mount and on every period change, keep the ACTIVE segment
  // visible inside the scrollable rail (a deep link to YTD at 375px must not
  // greet the user with an off-screen active state).
  useEffect(() => {
    const el = navRef.current?.querySelector("button.on");
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [sig.period]);

  // Close + restore focus to the Custom button (ux #17, CompareControl's
  // pattern) — Esc and the scrim both land here.
  function closeCustom() {
    setCustomOpen(false);
    customBtnRef.current?.focus();
  }

  // Escape closes the custom panel (listener only while open).
  useEffect(() => {
    if (!customOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCustom();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customOpen]);

  function publish(next: PeriodSignal) {
    setSig(next);
    publishPeriodOrNavigate(next, {
      pathname,
      search: searchParams.toString(),
      replace: (url) => router.replace(url),
    });
  }

  function choose(kind: PeriodKind) {
    setCustomOpen(false);
    if (kind === sig.period) return;
    // A preset pick clears any custom range; compareMode is PRESERVED (the
    // compare pill owns it, and every calendar kind carries a year anchor).
    publish({
      window: sig.window,
      period: kind,
      compareMode: sig.compareMode,
      from: null,
      to: null,
      cmpFrom: null,
      cmpTo: null,
    });
  }

  function applyCustom(range: { from: string; to: string } | null) {
    setCustomOpen(false);
    if (!range) {
      // ux #6 ruling (GscModal's Clear semantics): Clear while a custom range
      // IS applied returns to the MTD default; Clear before anything was
      // applied stays a pure cancel — the applied period stands.
      if (sig.period === "custom") {
        publish({
          window: sig.window,
          period: "month",
          compareMode: sig.compareMode,
          from: null,
          to: null,
          cmpFrom: null,
          cmpTo: null,
        });
      }
      return;
    }
    publish({
      window: sig.window,
      period: "custom",
      compareMode: sig.compareMode,
      from: range.from,
      to: range.to,
      cmpFrom: null,
      cmpTo: null,
    });
  }

  const isOn = (k: PeriodKind) => sig.period === k;
  const customTitle =
    sig.period === "custom" && sig.from && sig.to
      ? `Custom range: ${sig.from} to ${sig.to}`
      : "Pick a custom date range";

  return (
    <div className="adm-window-wrap">
      <nav
        className={`adm-window${scrollable ? " is-scrollable" : ""}`}
        aria-label="Period"
        ref={navRef}
      >
        {SEGMENTS.map((s) => (
          <button
            key={s.kind}
            type="button"
            title={s.title}
            className={isOn(s.kind) ? "on" : ""}
            aria-current={isOn(s.kind) ? "true" : undefined}
            onClick={() => choose(s.kind)}
          >
            {s.label}
          </button>
        ))}
        <button
          ref={customBtnRef}
          type="button"
          title={customTitle}
          className={isOn("custom") ? "on" : ""}
          aria-current={isOn("custom") ? "true" : undefined}
          aria-haspopup="dialog"
          aria-expanded={customOpen}
          onClick={() => setCustomOpen((o) => !o)}
        >
          Custom
        </button>
      </nav>

      {customOpen && (
        <>
          <div className="adm-timepop-scrim" onClick={closeCustom} />
          <div className="adm-timepop adm-periodpop" role="dialog" aria-label="Custom date range">
            <div className="adm-timepop-sec">
              <span className="adm-timepop-title">Custom range</span>
              <DateRangeControl
                defaultOpen
                range={
                  sig.period === "custom" && sig.from && sig.to
                    ? { from: sig.from, to: sig.to }
                    : null
                }
                onChange={applyCustom}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
