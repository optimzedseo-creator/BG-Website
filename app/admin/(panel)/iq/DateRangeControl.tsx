"use client";

// WP3.8 — compact custom date-range control (markpulse DateRangeModal port,
// inlined as a control to avoid nested-modal focus fights). Two native date
// inputs (from / to) + Apply / Clear. Emits a normalized { from, to } (or null
// on clear). The source resolves the concrete since/until from these via
// shared.resolvePeriod; `window` stays the fallback when no range is applied.
//
// SCOPE (WP3.8): this control is wired LIVE on the GSC drill surface, whose
// handler + source honor ?from=&to= end-to-end. The GLOBAL PeriodSwitch "Custom"
// option and the module islands (Command/Traffic/Content) are reported as
// scoped-out (they need the period-bus signal to carry a Period, not a
// WindowDays) — see the wave report.

import { useState } from "react";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function DateRangeControl({
  range,
  onChange,
}: {
  range: { from: string; to: string } | null;
  onChange: (range: { from: string; to: string } | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(range?.from ?? "");
  const [to, setTo] = useState(range?.to ?? "");

  const valid = /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to) && from <= to;

  if (!open) {
    return (
      <button type="button" className="adm-daterange-toggle" onClick={() => setOpen(true)}>
        {range ? `Range: ${range.from} to ${range.to}` : "Custom range"}
      </button>
    );
  }

  return (
    <div className="adm-daterange" role="group" aria-label="Custom date range">
      <label className="adm-daterange-field">
        <span>From</span>
        <input type="date" value={from} max={to || todayIso()} onChange={(e) => setFrom(e.target.value)} />
      </label>
      <label className="adm-daterange-field">
        <span>To</span>
        <input type="date" value={to} min={from} max={todayIso()} onChange={(e) => setTo(e.target.value)} />
      </label>
      <button
        type="button"
        className="adm-btn-ghost"
        disabled={!valid}
        onClick={() => {
          if (!valid) return;
          onChange({ from, to });
          setOpen(false);
        }}
      >
        Apply
      </button>
      <button
        type="button"
        className="adm-daterange-clear"
        onClick={() => {
          setFrom("");
          setTo("");
          onChange(null);
          setOpen(false);
        }}
      >
        Clear
      </button>
      {!valid && (from || to) && (
        <span className="adm-daterange-hint">to must be on or after from</span>
      )}
    </div>
  );
}
