"use client";

// WP3.2 — KPI drill modal (all six Command tiles open it). Granularity segmented
// control appears only for spans the data supports (Daily always; Weekly at
// 30d+; Monthly at 90d) — never a greyed dead control. Compare-previous overlay
// (muted, dashed, counts in the tooltip). Summary avg/max/min/total as COUNTS,
// a records line, and a "what counts here" footer with the data-start date.

import { useMemo, useState } from "react";
import AdmHoverChart, { type ChartSeries } from "./AdmHoverChart";
import { ModalHeader, ModalStatus, ModalWrap } from "./ModalShell";
import { currentPeriod, useDrill } from "./drill-fetch";
import { fmtDay } from "../fmt";
import type { IqKpiDetail } from "@/lib/admin/iq/types";

const KPI_ACC: Record<string, string> = {
  visitors: "overview",
  pageviews: "traffic",
  "search-clicks": "search",
  briefs: "content",
  bookings: "leads",
  subscribers: "security",
};

type Gran = "daily" | "weekly" | "monthly";

interface Bucket {
  label: string;
  n: number;
}

function aggregate(series: { date: string; n: number }[], g: Gran): Bucket[] {
  if (g === "daily") return series.map((p) => ({ label: p.date, n: p.n }));
  if (g === "monthly") {
    const m = new Map<string, number>();
    for (const p of series) {
      const key = p.date.slice(0, 7);
      m.set(key, (m.get(key) || 0) + p.n);
    }
    return [...m.entries()].map(([label, n]) => ({ label, n }));
  }
  const out: Bucket[] = [];
  for (let i = 0; i < series.length; i += 7) {
    const chunk = series.slice(i, i + 7);
    if (chunk.length) out.push({ label: chunk[0].date, n: chunk.reduce((a, p) => a + p.n, 0) });
  }
  return out;
}

export default function KpiModal({ kpiId, onClose }: { kpiId: string; onClose: () => void }) {
  const p = currentPeriod();
  const { data, loading, error } = useDrill<IqKpiDetail>(
    `/admin/api/iq/kpi?id=${encodeURIComponent(kpiId)}&p=${p}`
  );
  const [gran, setGran] = useState<Gran>("daily");
  const [compare, setCompare] = useState(false);

  const titleId = "adm-kpi-modal-title";
  const acc = KPI_ACC[kpiId] ?? "overview";

  // Available granularities by span (no false affordances).
  const grans: Gran[] = useMemo(() => {
    const g: Gran[] = ["daily"];
    if (p >= 30) g.push("weekly");
    if (p >= 90) g.push("monthly");
    return g;
  }, [p]);

  const view = useMemo(() => {
    if (!data) return null;
    const cur = aggregate(data.series, grans.includes(gran) ? gran : "daily");
    const prior = aggregate(data.priorSeries, grans.includes(gran) ? gran : "daily");
    const values = cur.map((b) => b.n);
    const total = values.reduce((a, v) => a + v, 0);
    const maxV = values.length ? Math.max(...values) : 0;
    const minV = values.length ? Math.min(...values) : 0;
    const avg = values.length ? total / values.length : 0;
    // Records read off the DAILY series regardless of the chosen bucket.
    let bestN = -1;
    let bestDate: string | null = null;
    for (const pt of data.series) {
      if (pt.n > bestN) {
        bestN = pt.n;
        bestDate = pt.date;
      }
    }
    const priorAligned = cur.map((_, i) => prior[i]?.n ?? 0);
    return { cur, values, total, maxV, minV, avg, bestN, bestDate, priorAligned };
  }, [data, gran, grans]);

  return (
    <ModalWrap onClose={onClose} labelledBy={titleId} acc={acc}>
      <ModalHeader
        micro="Metric detail"
        title={data?.label ?? "Metric"}
        titleId={titleId}
        sub={data ? `last ${data.window} days${data.dataStart ? ` · counting since ${fmtDay(data.dataStart)}` : ""}` : undefined}
        onClose={onClose}
      />
      <ModalStatus loading={loading} error={error} />

      {data && view && (
        <>
          <div className="adm-modal-controls">
            {grans.length > 1 && (
              <div className="adm-modal-tabs" role="group" aria-label="Granularity">
                {grans.map((g) => (
                  <button
                    key={g}
                    type="button"
                    className={`adm-modal-tab${gran === g ? " on" : ""}`}
                    onClick={() => setGran(g)}
                  >
                    {g[0].toUpperCase() + g.slice(1)}
                  </button>
                ))}
              </div>
            )}
            <label className="adm-modal-compare">
              <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} />
              Compare previous
            </label>
          </div>

          <AdmHoverChart
            ariaLabel={`${data.label} trend`}
            labels={view.cur.map((b) => b.label)}
            series={[
              ...(compare
                ? [
                    {
                      key: "prior",
                      label: "prior",
                      className: "adm-chart-accline",
                      values: view.priorAligned,
                      dashed: true,
                      swatch: "var(--text2)",
                    } as ChartSeries,
                  ]
                : []),
              {
                key: "cur",
                label: data.label.toLowerCase(),
                className: "adm-chart-accline",
                values: view.values,
                area: true,
                areaFill: "admKpiArea",
                endpointDotClass: "adm-chart-accdot",
                endpointHaloClass: "adm-chart-acchalo",
                swatch: "var(--acc)",
              },
            ]}
          />

          <div className="adm-modal-summary">
            <div><span className="adm-modal-stat-n">{view.total}</span><span className="adm-modal-stat-l">total</span></div>
            <div><span className="adm-modal-stat-n">{view.avg.toFixed(1)}</span><span className="adm-modal-stat-l">avg / {gran === "daily" ? "day" : gran === "weekly" ? "week" : "month"}</span></div>
            <div><span className="adm-modal-stat-n">{view.maxV}</span><span className="adm-modal-stat-l">max</span></div>
            <div><span className="adm-modal-stat-n">{view.minV}</span><span className="adm-modal-stat-l">min</span></div>
          </div>

          <p className="adm-caption">
            {view.bestN > 0 && view.bestDate
              ? `Best day: ${view.bestN} ${data.label.toLowerCase()} · ${view.bestDate}`
              : `No ${data.label.toLowerCase()} recorded yet. The meter is running.`}
          </p>
          {kpiId === "visitors" && (
            <p className="adm-caption">
              Total sums each day&apos;s distinct visitors, so a returning visitor counts on each day.
            </p>
          )}

          <div className="adm-modal-foot">
            <span className="adm-modal-foot-h">What counts here</span>
            <p>{data.definition}</p>
            {data.gscThrough && <p className="adm-caption">Search Console data through {data.gscThrough}.</p>}
            {data.dataStart && <p className="adm-caption">Counting since {fmtDay(data.dataStart)}.</p>}
          </div>
        </>
      )}
    </ModalWrap>
  );
}
