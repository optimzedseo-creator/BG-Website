"use client";

import { useEffect, useRef, useState } from "react";
import DemoBadge from "../iq/DemoBadge";
import type { BreakdownRow, IqTraffic, SeriesPoint, SourceClass, WindowDays } from "@/lib/admin/iq/types";
import { RATE_MIN_DENOM, buildIqQuery, rateOrCounts } from "@/lib/admin/iq/shared";
import { subscribePeriodRefetch } from "../period-bus";
import SegmentChips, { type ChipGroup } from "../SegmentChips";
import { fmtDay, fmtSeconds } from "../fmt";
import { openDrill, visitorHash } from "../iq/hash-route";

/*
 * WP2.4 Traffic module (client island) — "people". Everything renders from the
 * ONE typed payload (PII-free by construction). Two no-navigation triggers:
 *  - period flips arrive over the period bus (the switch syncs ?p= itself,
 *    then this island re-syncs the FULL querystring after the refetch so chip
 *    state stays shareable);
 *  - module-local segment chips (device / country / sourceClass) refetch
 *    through GET /admin/api/iq/traffic and sync the querystring.
 * Visitor-log rows and KPI tiles carry NO click affordance — journeys drill in
 * Wave 3 (no dead affordances).
 */

interface Cuts {
  device: string | null;
  country: string | null;
  source: SourceClass | null;
}
// Querystring building lives in shared.buildIqQuery (api A5 — one copy).

/** Single-series visitors line, module-accent colored (§5.11 static tier). */
function VisitorsChart({ points }: { points: SeriesPoint[] }) {
  const W = 720;
  const H = 150;
  const PAD = { l: 30, r: 8, t: 10, b: 22 };
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const max = Math.max(1, ...points.map((d) => d.n));
  const x = (i: number) => PAD.l + (points.length < 2 ? iw / 2 : (i / (points.length - 1)) * iw);
  const y = (v: number) => PAD.t + ih - (v / max) * ih;
  const linePoints = points.map((d, i) => `${x(i).toFixed(1)},${y(d.n).toFixed(1)}`).join(" ");
  const baseY = (PAD.t + ih).toFixed(1);
  const areaPoints = `${linePoints} ${x(points.length - 1).toFixed(1)},${baseY} ${x(0).toFixed(1)},${baseY}`;
  const labelEvery = Math.max(1, Math.ceil(points.length / 9));
  const last = points[points.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="adm-chart" role="img" aria-label="Visitors trend">
      <defs>
        <linearGradient id="admTrafficArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--acc)" stopOpacity="0.22" />
          <stop offset="1" stopColor="var(--acc)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(max * f)} y2={y(max * f)} className="adm-chart-grid" />
          <text x={PAD.l - 6} y={y(max * f) + 3.5} textAnchor="end" className="adm-chart-tick">
            {Math.round(max * f)}
          </text>
        </g>
      ))}
      <polygon points={areaPoints} fill="url(#admTrafficArea)" className="adm-chart-late" stroke="none" />
      <polyline points={linePoints} className="adm-chart-accline adm-chart-draw" fill="none" pathLength={1} />
      {last && (
        <g className="adm-chart-late">
          <circle cx={x(points.length - 1)} cy={y(last.n)} r={10} className="adm-chart-acchalo" />
          <circle cx={x(points.length - 1)} cy={y(last.n)} r={4} className="adm-chart-accdot" />
        </g>
      )}
      {points.map((d, i) =>
        i % labelEvery === 0 ? (
          <text key={d.key} x={x(i)} y={H - 6} textAnchor="middle" className="adm-chart-tick">
            {d.key.slice(5)}
          </text>
        ) : null
      )}
    </svg>
  );
}

/** Breakdown card: counts always; a % share ONLY when rateOrCounts allows. */
function MixCard({ title, rows, total }: { title: string; rows: BreakdownRow[]; total: number }) {
  return (
    <section className="adm-card">
      <h2>{title}</h2>
      {rows.length === 0 ? (
        <p className="adm-empty">📭 Nothing in this cut yet. Counting continues.</p>
      ) : (
        <>
          <ul className="adm-bars">
            {rows.map((r) => {
              const share = rateOrCounts(r.n, total);
              return (
                <li key={r.label}>
                  <span className="adm-bar-label" title={r.label}>{r.label}</span>
                  <span className="adm-bar-track">
                    <span
                      className="adm-bar-fill"
                      style={{ width: `${Math.max(3, (r.n / Math.max(1, total)) * 100)}%` }}
                    />
                  </span>
                  <span className="adm-bar-n">
                    {r.n}
                    {share.kind === "rate" ? (
                      <span className="adm-bar-share"> · {Math.round(share.value * 100)}%</span>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="adm-caption">
            of {total} pageview{total === 1 ? "" : "s"}
            {total < RATE_MIN_DENOM ? ` · counts only, shares appear at ${RATE_MIN_DENOM}+ pageviews` : ""}
          </p>
        </>
      )}
    </section>
  );
}

export default function TrafficView({ initial }: { initial: IqTraffic }) {
  const [data, setData] = useState<IqTraffic>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cutsRef = useRef<Cuts>({
    device: initial.applied.device,
    country: initial.applied.country,
    source: initial.applied.sourceClass,
  });
  const periodRef = useRef<WindowDays>(initial.window);
  // Monotonic fetch sequence (api A3): a slow older response must never
  // overwrite a newer one, and must never win the URL.
  const seqRef = useRef(0);

  async function refetch() {
    const id = ++seqRef.current;
    setLoading(true);
    setError(null);
    const qs = buildIqQuery(periodRef.current, cutsRef.current);
    try {
      const res = await fetch(`/admin/api/iq/traffic${qs ? `?${qs}` : ""}`, { cache: "no-store" });
      // Expired session (api A1): the middleware 307s to login and fetch
      // follows it — send the tab to login instead of a permanent error.
      if (res.redirected && new URL(res.url).pathname.startsWith("/admin/login")) {
        window.location.assign("/admin/login");
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      const payload = (await res.json()) as IqTraffic;
      if (id !== seqRef.current) return; // stale response — discard (A3)
      setData(payload);
      // Success-only canonical URL (api A4 single-owner rule): this island is
      // the ONE writer; failure leaves URL and data both old.
      // Preserve any open modal's deep-link hash (F5): an in-flight refetch must
      // not clobber #/visitor|#/page|#/kpi that the drill host is showing.
      window.history.replaceState(null, "", `/admin/traffic${qs ? `?${qs}` : ""}${window.location.hash}`);
    } catch {
      if (id !== seqRef.current) return;
      setError("Could not refresh. The numbers below are from the previous selection.");
    } finally {
      if (id === seqRef.current) setLoading(false);
    }
  }

  useEffect(() => {
    return subscribePeriodRefetch((p: WindowDays) => {
      periodRef.current = p;
      void refetch();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onToggle(key: ChipGroup["key"], value: string | null) {
    if (key === "device") cutsRef.current.device = value;
    if (key === "country") cutsRef.current.country = value;
    if (key === "source") cutsRef.current.source = value as SourceClass | null;
    void refetch();
  }

  const cuts = cutsRef.current;
  const hasCut = Boolean(data.applied.device || data.applied.country || data.applied.sourceClass);
  const countingSince = data.countingSince ? fmtDay(data.countingSince) : null;
  const chipGroups: ChipGroup[] = [
    { key: "device", label: "Device", options: data.chipOptions.devices, active: cuts.device },
    { key: "country", label: "Country", options: data.chipOptions.countries, active: cuts.country },
    { key: "source", label: "Source", options: data.chipOptions.sources, active: cuts.source },
  ];

  return (
    <div data-acc="traffic" aria-busy={loading}>
      <div className="adm-head">
        <h1>📈 Traffic</h1>
        <DemoBadge demo={data.meta.mode === "demo"} />
        <span className="adm-count">last {data.window} days</span>
      </div>

      {error && <p className="adm-error" role="status">{error}</p>}

      <SegmentChips groups={chipGroups} onToggle={onToggle} disabled={loading} />
      {hasCut && (
        <p className="adm-cut-note" role="status">
          {data.visitors} of {data.visitorsUnfiltered} visitor{data.visitorsUnfiltered === 1 ? "" : "s"} match this cut
        </p>
      )}

      <div className={`adm-surface${loading ? " is-loading" : ""}`}>
        <div className="adm-kpis">
          <div className="adm-kpi" title="Distinct visitor ids with a pageview in the period. Internal traffic excluded.">
            <span className="adm-kpi-n">{data.visitors}</span>
            <span className="adm-kpi-label">Visitors</span>
          </div>
          <div className="adm-kpi" title="Pageviews in the period. Internal traffic excluded.">
            <span className="adm-kpi-n">{data.pageviews}</span>
            <span className="adm-kpi-label">Pageviews</span>
          </div>
          <div
            className="adm-kpi"
            title="Average time on page across views that reported a duration. Some views never get to report one (a closed tab can't), so the coverage denominator is shown. Per-view time capped at 30 min."
          >
            <span className="adm-kpi-n">{fmtSeconds(data.avgDuration.avgSeconds)}</span>
            <span className="adm-kpi-label">Avg time on page</span>
            <span className="adm-kpi-delta">
              avg of {data.avgDuration.reported} of {data.avgDuration.total} views that reported
              duration · per-view time capped at 30 min
            </span>
          </div>
          <div className="adm-kpi" title="Visitors with pageviews on 2 or more distinct days in the period.">
            <span className="adm-kpi-n">{data.returnVisitors}</span>
            <span className="adm-kpi-label">Return visitors</span>
          </div>
        </div>

        <section className="adm-card adm-card-wide">
          <h2>Visitors trend</h2>
          <VisitorsChart points={data.trend} />
          {countingSince && <p className="adm-caption">counting since {countingSince}</p>}
        </section>

        <div className="adm-grid">
          <MixCard title="Devices" rows={data.devices} total={data.pageviews} />
          <MixCard title="Countries" rows={data.countries} total={data.pageviews} />
          <MixCard title="Referrers" rows={data.referrers} total={data.pageviews} />
        </div>

        <section className="adm-card adm-card-wide" style={{ marginTop: 16 }}>
          <h2>Recent visitors</h2>
          {data.visitorLog.length === 0 ? (
            <p className="adm-empty">
              📭 No visitor journeys in this {hasCut ? "cut" : "window"} yet.
              {countingSince ? ` Counting since ${countingSince}.` : " Counting starts with the first pageview."}
            </p>
          ) : (
            <>
              <ul className="adm-vlog">
                {data.visitorLog.map((r) => (
                  <li key={r.visitorId}>
                    <button type="button" className="adm-vlog-row" onClick={() => openDrill(visitorHash(r.visitorId))}>
                      <div className="adm-vlog-head">
                        <span className="adm-mono">{r.shortId}</span>
                        <span className="adm-vlog-dim">
                          {r.device ?? "unknown"} · {r.country ?? "unknown"}
                        </span>
                        <span className="adm-vlog-time">
                          {r.reported > 0 ? fmtSeconds(r.totalSeconds) : "no time reported"}
                          {r.reported > 0 && r.reported < r.views
                            ? ` (${r.reported} of ${r.views} views reported)`
                            : ""}
                        </span>
                        <span className="adm-go" aria-hidden="true">→</span>
                      </div>
                      <div className="adm-vlog-paths">
                        {r.paths.map((p, i) => (
                          <span key={`${p}-${i}`} className="adm-pathchip">{p}</span>
                        ))}
                        {r.morePaths > 0 && (
                          <span className="adm-vlog-more">
                            +{r.morePaths} more page{r.morePaths === 1 ? "" : "s"}
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="adm-caption">
                Last {data.visitorLog.length} visitor journeys, newest first. Click a row to open the full journey.
              </p>
            </>
          )}
        </section>
      </div>

      <p className="adm-mono" style={{ display: "block", marginTop: 18 }}>
        {data.meta.metricsVersion} · {data.meta.mode} · {data.meta.internalExcluded} internal{" "}
        {data.meta.internalExcluded === 1 ? "visitor" : "visitors"} excluded
      </p>
    </div>
  );
}
