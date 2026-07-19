"use client";

// WP3.6 — GSC drill modal. ONE component, four kinds (branded / classifiable /
// intent / query) switched off the discriminated `kind` in the payload. Accent
// = search purple. Honest sparse states: full chrome at zero, "meter running /
// data arrives with about 2 days delay", never "broken". Sub-threshold rows are
// counted, never hidden.

import { useMemo, useState } from "react";
import AdmHoverChart, { type ChartSeries } from "./AdmHoverChart";
import { ModalHeader, ModalStatus, ModalTabs, ModalWrap, tabPanelProps } from "./ModalShell";
import { currentPeriod, useDrill } from "./drill-fetch";
import DateRangeControl from "./DateRangeControl";
import type { GscDetailKind, GscQueryRow, IqGscDetail } from "@/lib/admin/iq/types";

type Gran = "daily" | "weekly" | "monthly";

function aggSeries(points: { date: string; value: number }[], g: Gran): { label: string; value: number }[] {
  if (g === "daily") return points.map((p) => ({ label: p.date, value: p.value }));
  if (g === "monthly") {
    const m = new Map<string, number>();
    for (const p of points) m.set(p.date.slice(0, 7), (m.get(p.date.slice(0, 7)) || 0) + p.value);
    return [...m.entries()].map(([label, value]) => ({ label, value }));
  }
  const out: { label: string; value: number }[] = [];
  for (let i = 0; i < points.length; i += 7) {
    const chunk = points.slice(i, i + 7);
    if (chunk.length) out.push({ label: chunk[0].date, value: chunk.reduce((a, p) => a + p.value, 0) });
  }
  return out;
}

function QueryTable({ rows, threshold }: { rows: GscQueryRow[]; threshold: number | null }) {
  if (rows.length === 0 && threshold === null) {
    return <p className="adm-empty">🔍 No queries here yet. The meter is running; Search Console data arrives with about 2 days delay.</p>;
  }
  return (
    <div className="adm-table-wrap">
      <table className="adm-table adm-table--stickycol">
        <thead>
          <tr><th>Query</th><th>Clicks</th><th>Impressions</th><th>Position</th><th>Tags</th></tr>
        </thead>
        <tbody>
          {rows.map((q) => (
            <tr key={q.query}>
              <td className="adm-path" title={q.query}>{q.query}</td>
              <td className="adm-mono">{q.clicks}</td>
              <td className="adm-mono">{q.impressions}</td>
              <td className="adm-mono">{q.position.toFixed(1)}</td>
              <td>
                <span className="adm-qtags">
                  {q.isBranded && <span className="adm-qchip adm-qchip--branded">branded</span>}
                  {q.brandedAmbiguous && <span className="adm-qchip adm-qchip--ambiguous">ambiguous</span>}
                  {q.intentBucket && <span className="adm-qchip">{q.intentBucket}</span>}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GranControl({ p, gran, setGran }: { p: number; gran: Gran; setGran: (g: Gran) => void }) {
  const grans: Gran[] = useMemo(() => {
    const g: Gran[] = ["daily"];
    if (p >= 30) g.push("weekly");
    if (p >= 90) g.push("monthly");
    return g;
  }, [p]);
  if (grans.length <= 1) return null;
  return (
    <div className="adm-modal-tabs" role="group" aria-label="Granularity">
      {grans.map((g) => (
        <button key={g} type="button" className={`adm-modal-tab${gran === g ? " on" : ""}`} onClick={() => setGran(g)}>
          {g[0].toUpperCase() + g.slice(1)}
        </button>
      ))}
    </div>
  );
}

function LagFoot({ through, versions }: { through: string | null; versions: string[] }) {
  return (
    <div className="adm-modal-foot">
      <p className="adm-caption">
        {through ? `Search Console data through ${through}.` : "Search Console has no data yet."} Reports arrive
        with about 2 days delay and are charted by their stored Search Console date.
      </p>
      {versions.length > 0 && (
        <p className="adm-caption">Queries tagged by {versions.join(", ")}.</p>
      )}
    </div>
  );
}

const TITLES: Record<GscDetailKind, string> = {
  branded: "Branded search",
  classifiable: "Classifiable impressions",
  intent: "Search intent",
  query: "Query detail",
};

export default function GscModal({
  gscKind,
  query,
  onClose,
}: {
  gscKind: GscDetailKind;
  query: string | null;
  onClose: () => void;
}) {
  const p = currentPeriod();
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const qParam = gscKind === "query" && query ? `&query=${encodeURIComponent(query)}` : "";
  const rangeParam = range ? `&from=${range.from}&to=${range.to}` : "";
  const { data, loading, error } = useDrill<IqGscDetail>(`/admin/api/iq/gsc?kind=${gscKind}&p=${p}${qParam}${rangeParam}`);
  const [tab, setTab] = useState("trend");
  const [gran, setGran] = useState<Gran>("daily");
  const [bucket, setBucket] = useState<string | null>(null);

  const titleId = "adm-gsc-modal-title";
  const versions = data?.meta.classifierVersions ?? [];

  const brandedView = useMemo(() => {
    if (!data || data.kind !== "branded") return null;
    const b = aggSeries(data.trend.map((t) => ({ date: t.date, value: t.branded })), gran);
    const nb = aggSeries(data.trend.map((t) => ({ date: t.date, value: t.nonBranded })), gran);
    return { labels: b.map((x) => x.label), branded: b.map((x) => x.value), nonBranded: nb.map((x) => x.value) };
  }, [data, gran]);

  return (
    <ModalWrap onClose={onClose} labelledBy={titleId} acc="search">
      <ModalHeader
        micro="Search detail"
        title={gscKind === "query" && query ? query : TITLES[gscKind]}
        titleId={titleId}
        sub={data ? `${data.range ? `${data.range.from} to ${data.range.to}` : `last ${data.window} days`}${data.gscThrough ? ` · Search Console through ${data.gscThrough}` : ""}` : undefined}
        onClose={onClose}
      />
      <ModalStatus loading={loading} error={error} />

      <div className="adm-modal-controls">
        <DateRangeControl range={range} onChange={setRange} />
      </div>

      {data && data.kind === "branded" && brandedView && (
        <>
          <ModalTabs
            tabs={[{ key: "trend", label: "Clicks trend" }, { key: "ambiguous", label: "Ambiguous & collisions" }]}
            active={tab}
            onSelect={setTab}
          />
          {tab === "trend" && (
            <div className="adm-modal-section" {...tabPanelProps("trend")}>
              <div className="adm-modal-controls">
                <GranControl p={p} gran={gran} setGran={setGran} />
              </div>
              <AdmHoverChart
                ariaLabel="Branded and non-branded clicks by Search Console date"
                labels={brandedView.labels}
                series={[
                  { key: "branded", label: "branded", className: "adm-chart-accline", values: brandedView.branded, area: true, areaFill: "admGscBrandedArea", endpointDotClass: "adm-chart-accdot", endpointHaloClass: "adm-chart-acchalo", swatch: "var(--acc)" } as ChartSeries,
                  { key: "nonbranded", label: "non-branded", className: "adm-chart-visitors", values: brandedView.nonBranded, swatch: "var(--blue)" } as ChartSeries,
                ]}
              />
              <div className="adm-modal-summary">
                <div><span className="adm-modal-stat-n">{data.brandedClicks}</span><span className="adm-modal-stat-l">branded clicks</span></div>
                <div><span className="adm-modal-stat-n">{data.nonBrandedClicks}</span><span className="adm-modal-stat-l">non-branded clicks</span></div>
              </div>
              <p className="adm-caption">
                Clicks are the branded headline, never impressions. Zero lines under non-zero property totals mean
                Search Console anonymized the queries, not zero search traffic.
              </p>
            </div>
          )}
          {tab === "ambiguous" && (
            <div className="adm-modal-section" {...tabPanelProps("ambiguous")}>
              <p className="adm-caption">
                Single-token matches and possible other Bradley Griffins. Never counted as branded.
              </p>
              <div className="adm-modal-summary">
                <div><span className="adm-modal-stat-n">{data.brandedAmbiguousClicks}</span><span className="adm-modal-stat-l">ambiguous clicks</span></div>
                <div><span className="adm-modal-stat-n">{data.collisionClicks}</span><span className="adm-modal-stat-l">collision clicks</span></div>
              </div>
              <QueryTable rows={data.ambiguous} threshold={data.ambiguousBelowThreshold ? data.ambiguousBelowThreshold.rows : null} />
              {data.ambiguousBelowThreshold && (
                <p className="adm-caption">
                  {data.ambiguousBelowThreshold.rows} more quer{data.ambiguousBelowThreshold.rows === 1 ? "y" : "ies"} below the reporting threshold:{" "}
                  {data.ambiguousBelowThreshold.impressions} impressions, {data.ambiguousBelowThreshold.clicks} clicks. Counted, not hidden.
                </p>
              )}
            </div>
          )}
          <LagFoot through={data.gscThrough} versions={versions} />
        </>
      )}

      {data && data.kind === "classifiable" && (() => {
        // B3 — the honesty gauge must never exceed 100%. When visible > total
        // (or total 0 with visible > 0), Search Console's daily totals lag the
        // query rows (reachable via the chunked cron's partial commit) — clamp
        // the DISPLAYED share to 100% AND surface it as a caption, never bury it.
        const lagCoverage = data.visibleImpressions > data.totalImpressions;
        const pct =
          data.totalImpressions > 0
            ? Math.min(100, Math.round((data.visibleImpressions / data.totalImpressions) * 100))
            : data.visibleImpressions > 0
            ? 100
            : null;
        const lagDays = data.points.filter((pt) => pt.visible > pt.total).length;
        return (
          <div className="adm-modal-section">
            <AdmHoverChart
              ariaLabel="Visible versus anonymized impressions by Search Console date"
              labels={data.points.map((pt) => pt.date)}
              series={[
                { key: "visible", label: "visible", className: "adm-chart-accline", values: data.points.map((pt) => pt.visible), area: true, areaFill: "admGscVisibleArea", endpointDotClass: "adm-chart-accdot", endpointHaloClass: "adm-chart-acchalo", swatch: "var(--acc)" } as ChartSeries,
                { key: "anon", label: "anonymized", className: "adm-chart-visitors", values: data.points.map((pt) => pt.anonymized), dashed: true, swatch: "var(--text2)" } as ChartSeries,
              ]}
            />
            <div className="adm-modal-summary">
              <div><span className="adm-modal-stat-n">{data.visibleImpressions}</span><span className="adm-modal-stat-l">visible impressions</span></div>
              <div><span className="adm-modal-stat-n">{data.totalImpressions}</span><span className="adm-modal-stat-l">property total</span></div>
              <div>
                <span className="adm-modal-stat-n">{pct === null ? "not yet" : `${pct}%`}</span>
                <span className="adm-modal-stat-l">classifiable</span>
              </div>
            </div>
            {(lagCoverage || (data.totalImpressions === 0 && data.visibleImpressions > 0)) && (
              <p className="adm-caption adm-caption--strong">
                Search Console daily totals lag the query rows for {lagDays || 1} day{(lagDays || 1) === 1 ? "" : "s"};
                this share is capped at 100% until the totals catch up.
              </p>
            )}
            <p className="adm-caption">
              Numerator is the sum of the query impressions Search Console actually shows; the denominator is the
              property total Search Console reports. The gap is what Google anonymizes, not lost traffic. Query-level
              cuts are partial by design.
            </p>
            <LagFoot through={data.gscThrough} versions={versions} />
          </div>
        );
      })()}

      {data && data.kind === "intent" && (
        <div className="adm-modal-section">
          {data.buckets.length === 0 && !data.belowThreshold ? (
            <p className="adm-empty">🔍 No classifiable intent yet. Buckets fill as Search Console releases query rows (about 2 days behind).</p>
          ) : (
            <>
              <ul className="adm-bars">
                {data.buckets.map((b) => {
                  const maxImp = Math.max(1, ...data.buckets.map((x) => x.impressions));
                  return (
                    <li key={b.bucket}>
                      <button
                        type="button"
                        className={`adm-bar-btn${bucket === b.bucket ? " on" : ""}`}
                        onClick={() => setBucket(bucket === b.bucket ? null : b.bucket)}
                        aria-pressed={bucket === b.bucket}
                      >
                        <span className="adm-bar-label" title={b.bucket}>{b.bucket}</span>
                        <span className="adm-bar-track">
                          <span className="adm-bar-fill" style={{ width: `${Math.max(3, (b.impressions / maxImp) * 100)}%` }} />
                        </span>
                        <span className="adm-bar-n">{b.impressions}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {data.buckets.some((b) => b.bucket === "cost") && (
                <p className="adm-caption">Cost-intent queries are showing up here. Worth developing the rates page.</p>
              )}
              {data.belowThreshold && (
                <p className="adm-caption">
                  below threshold ({data.belowThreshold.rows} bucket{data.belowThreshold.rows === 1 ? "" : "s"}):{" "}
                  {data.belowThreshold.impressions} impressions, {data.belowThreshold.clicks} clicks. Counted, not hidden.
                </p>
              )}
              {bucket ? (
                <>
                  <h3 className="adm-modal-subhead">Queries in {bucket}</h3>
                  <QueryTable rows={data.buckets.find((b) => b.bucket === bucket)?.queries ?? []} threshold={null} />
                </>
              ) : (
                <p className="adm-caption">Select a bucket to see the queries behind it.</p>
              )}
            </>
          )}
          <LagFoot through={data.gscThrough} versions={versions} />
        </div>
      )}

      {data && data.kind === "query" && (
        <div className="adm-modal-section">
          <div className="adm-qtags adm-qtags--head">
            {data.isBranded && <span className="adm-qchip adm-qchip--branded">branded</span>}
            {data.brandedAmbiguous && <span className="adm-qchip adm-qchip--ambiguous">ambiguous</span>}
            {data.isCollision && <span className="adm-qchip adm-qchip--ambiguous">collision</span>}
            {data.isGeo && <span className="adm-qchip">geo</span>}
            {data.intentBucket && <span className="adm-qchip">{data.intentBucket}</span>}
          </div>
          <div className="adm-modal-summary">
            <div><span className="adm-modal-stat-n">{data.clicks}</span><span className="adm-modal-stat-l">clicks</span></div>
            <div><span className="adm-modal-stat-n">{data.impressions}</span><span className="adm-modal-stat-l">impressions</span></div>
            <div><span className="adm-modal-stat-n">{data.position.toFixed(1)}</span><span className="adm-modal-stat-l">avg position</span></div>
          </div>
          {data.daily.length > 0 ? (
            <AdmHoverChart
              ariaLabel="Daily clicks and impressions for this query"
              labels={data.daily.map((d) => d.date)}
              series={[
                { key: "impr", label: "impressions", className: "adm-chart-visitors", values: data.daily.map((d) => d.impressions), swatch: "var(--blue)" } as ChartSeries,
                { key: "clicks", label: "clicks", className: "adm-chart-accline", values: data.daily.map((d) => d.clicks), area: true, areaFill: "admGscQueryArea", endpointDotClass: "adm-chart-accdot", endpointHaloClass: "adm-chart-acchalo", swatch: "var(--acc)" } as ChartSeries,
              ]}
            />
          ) : (
            <p className="adm-empty">🔍 No daily rows for this query in the window yet. The meter is running.</p>
          )}
          {data.belowThreshold && (
            <p className="adm-caption">This query is under the reporting threshold; the meter is running.</p>
          )}
          <h3 className="adm-modal-subhead">Pages it lands on</h3>
          {data.pages.length === 0 ? (
            <p className="adm-empty">📭 No landing pages recorded for this query yet.</p>
          ) : (
            <div className="adm-table-wrap">
              <table className="adm-table adm-table--stickycol">
                <thead><tr><th>Page</th><th>Clicks</th><th>Impressions</th><th>Position</th></tr></thead>
                <tbody>
                  {data.pages.map((pg) => (
                    <tr key={pg.path}>
                      <td className="adm-path" title={pg.path}>{pg.path}</td>
                      <td className="adm-mono">{pg.clicks}</td>
                      <td className="adm-mono">{pg.impressions}</td>
                      <td className="adm-mono">{pg.position.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <LagFoot through={data.gscThrough} versions={versions} />
        </div>
      )}
    </ModalWrap>
  );
}
