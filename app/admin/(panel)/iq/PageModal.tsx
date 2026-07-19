"use client";

// WP3.3 — Page detail modal. Tabs: Overview / Sources / Visitors / Search.
// Fetches /admin/api/iq/page. Visitor rows drill to the Journey modal via the
// hash router (#/visitor/<id>). Accent = content pink.

import { useState } from "react";
import AdmHoverChart from "./AdmHoverChart";
import { ModalHeader, ModalStatus, ModalTabs, ModalWrap, tabPanelProps } from "./ModalShell";
import { currentPeriod, useDrill } from "./drill-fetch";
import { openDrill, visitorHash } from "./hash-route";
import { fmtDay, fmtSeconds } from "../fmt";
import { RATE_MIN_DENOM, rateOrCounts } from "@/lib/admin/iq/shared";
import type { BreakdownRow, IqPageDetail } from "@/lib/admin/iq/types";

function MiniBars({ rows, total }: { rows: BreakdownRow[]; total: number }) {
  if (rows.length === 0) return <p className="adm-empty">📭 Nothing here yet.</p>;
  return (
    <ul className="adm-bars">
      {rows.map((r) => {
        const share = rateOrCounts(r.n, total);
        return (
          <li key={r.label}>
            <span className="adm-bar-label" title={r.label}>{r.label}</span>
            <span className="adm-bar-track">
              <span className="adm-bar-fill" style={{ width: `${Math.max(3, (r.n / Math.max(1, total)) * 100)}%` }} />
            </span>
            <span className="adm-bar-n">
              {r.n}
              {share.kind === "rate" ? <span className="adm-bar-share"> · {Math.round(share.value * 100)}%</span> : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default function PageModal({ path, onClose }: { path: string; onClose: () => void }) {
  const p = currentPeriod();
  const { data, loading, error } = useDrill<IqPageDetail>(
    `/admin/api/iq/page?path=${encodeURIComponent(path)}&p=${p}`
  );
  const [tab, setTab] = useState("overview");
  const titleId = "adm-page-modal-title";

  return (
    <ModalWrap onClose={onClose} labelledBy={titleId} acc="content">
      <ModalHeader
        micro="Page detail"
        title={path}
        titleId={titleId}
        sub={data ? `last ${data.window} days · ${data.views} view${data.views === 1 ? "" : "s"} · ${data.visitors} visitor${data.visitors === 1 ? "" : "s"}` : undefined}
        onClose={onClose}
      />
      <ModalStatus loading={loading} error={error} />

      {data && (
        <>
          <ModalTabs
            tabs={[
              { key: "overview", label: "Overview" },
              { key: "sources", label: "Sources" },
              { key: "visitors", label: "Visitors" },
              { key: "search", label: "Search" },
            ]}
            active={tab}
            onSelect={setTab}
          />

          {tab === "overview" && (
            <div className="adm-modal-section" {...tabPanelProps("overview")}>
              <div className="adm-kpis">
                <div className="adm-kpi"><span className="adm-kpi-n">{data.views}</span><span className="adm-kpi-label">Views</span></div>
                <div className="adm-kpi"><span className="adm-kpi-n">{data.visitors}</span><span className="adm-kpi-label">Visitors</span></div>
                <div className="adm-kpi"><span className="adm-kpi-n">{fmtSeconds(data.avgDuration.avgSeconds)}</span><span className="adm-kpi-label">Avg time</span><span className="adm-kpi-delta">avg of {data.avgDuration.reported} of {data.avgDuration.total} views that reported</span></div>
                <div className="adm-kpi"><span className="adm-kpi-n">{data.entrances}</span><span className="adm-kpi-label">Entrances</span></div>
              </div>
              <AdmHoverChart
                ariaLabel="Daily visitors on this page"
                labels={data.trend.map((t) => t.key)}
                series={[{ key: "v", label: "visitors", className: "adm-chart-accline", values: data.trend.map((t) => t.n), area: true, areaFill: "admPageArea", endpointDotClass: "adm-chart-accdot", endpointHaloClass: "adm-chart-acchalo", swatch: "var(--acc)" }]}
              />
              <div className="adm-grid">
                <section className="adm-card"><h2>Devices</h2><MiniBars rows={data.devices} total={data.views} /></section>
                <section className="adm-card"><h2>Countries</h2><MiniBars rows={data.countries} total={data.views} /></section>
              </div>
              <p className="adm-caption">
                Max single view {data.maxDurationSeconds !== null ? fmtSeconds(data.maxDurationSeconds) : "not reported"} (per-view time capped at 30 min).
                {data.countingSince ? ` Counting since ${fmtDay(data.countingSince)}.` : ""}
                {data.views < RATE_MIN_DENOM ? ` Shares appear at ${RATE_MIN_DENOM}+ views.` : ""}
              </p>
            </div>
          )}

          {tab === "sources" && (
            <div className="adm-modal-section" {...tabPanelProps("sources")}>
              {data.sources.length === 0 ? (
                <p className="adm-empty">📭 No external referrers to this page yet. Internal navigation is excluded.</p>
              ) : (
                <ul className="adm-bars">
                  {data.sources.map((s) => (
                    <li key={s.host}>
                      <span className="adm-bar-label" title={s.sampleReferrer ?? s.host}>{s.host}</span>
                      <span className="adm-bar-track">
                        <span className="adm-bar-fill" style={{ width: `${Math.max(3, (s.n / Math.max(1, data.sources[0].n)) * 100)}%` }} />
                      </span>
                      <span className="adm-bar-n">{s.n}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="adm-caption">Referrer hosts that sent traffic to this page. Internal navigation excluded; the full referrer is in each row&apos;s tooltip.</p>
            </div>
          )}

          {tab === "visitors" && (
            <div className="adm-modal-section" {...tabPanelProps("visitors")}>
              {data.visitorLog.length === 0 ? (
                <p className="adm-empty">📭 No visitor journeys touched this page in the window yet.</p>
              ) : (
                <ul className="adm-vlog">
                  {data.visitorLog.map((r) => (
                    <li key={r.visitorId}>
                      <button type="button" className="adm-vlog-row" onClick={() => openDrill(visitorHash(r.visitorId))}>
                        <div className="adm-vlog-head">
                          <span className="adm-mono">{r.shortId}</span>
                          <span className="adm-vlog-dim">{r.device ?? "unknown"} · {r.country ?? "unknown"}</span>
                          <span className="adm-vlog-time">
                            {r.reported > 0 ? fmtSeconds(r.totalSeconds) : "no time reported"}
                          </span>
                          <span className="adm-go" aria-hidden="true">→</span>
                        </div>
                        <div className="adm-vlog-paths">
                          {r.paths.map((pp, i) => (
                            <span key={`${pp}-${i}`} className={`adm-pathchip${pp === path ? " on" : ""}`}>{pp}</span>
                          ))}
                          {r.morePaths > 0 && <span className="adm-vlog-more">+{r.morePaths} more</span>}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="adm-caption">Last {data.visitorLog.length} journeys touching this page. This page is highlighted in each path sequence. Click a row to open the full journey.</p>
            </div>
          )}

          {tab === "search" && (
            <div className="adm-modal-section" {...tabPanelProps("search")}>
              {data.search.length === 0 && !data.searchBelowThreshold ? (
                <p className="adm-empty">
                  🔍 No Search Console queries for this page yet.
                  {data.gscThrough ? ` Search Console data through ${data.gscThrough}.` : " Search Console connects with about a 2-day lag."}
                </p>
              ) : (
                <div className="adm-table-wrap">
                  <table className="adm-table">
                    <thead>
                      <tr><th>Query</th><th>Clicks</th><th>Impr.</th><th>Pos.</th></tr>
                    </thead>
                    <tbody>
                      {data.search.map((q) => (
                        <tr key={q.query}>
                          <td>
                            {q.query}
                            <span className="adm-qtags">
                              {q.isBranded && <span className="adm-qchip adm-qchip--branded">branded</span>}
                              {q.brandedAmbiguous && <span className="adm-qchip adm-qchip--ambiguous">ambiguous</span>}
                              {q.intentBucket && <span className="adm-qchip">{q.intentBucket}</span>}
                            </span>
                          </td>
                          <td className="adm-mono">{q.clicks}</td>
                          <td className="adm-mono">{q.impressions}</td>
                          <td className="adm-mono">{q.position.toFixed(1)}</td>
                        </tr>
                      ))}
                      {data.searchBelowThreshold && (
                        <tr className="adm-row-rollup">
                          <td>{data.searchBelowThreshold.rows} quer{data.searchBelowThreshold.rows === 1 ? "y" : "ies"} below the reporting threshold (counted)</td>
                          <td className="adm-mono">{data.searchBelowThreshold.clicks}</td>
                          <td className="adm-mono">{data.searchBelowThreshold.impressions}</td>
                          <td className="adm-mono">not applicable</td>
                        </tr>
                      )}
                      {data.searchBeyondThreshold && (
                        <tr className="adm-row-rollup">
                          <td>{data.searchBeyondThreshold.rows} more quer{data.searchBeyondThreshold.rows === 1 ? "y" : "ies"} beyond this list (counted)</td>
                          <td className="adm-mono">{data.searchBeyondThreshold.clicks}</td>
                          <td className="adm-mono">{data.searchBeyondThreshold.impressions}</td>
                          <td className="adm-mono">not applicable</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
              {data.gscThrough && <p className="adm-caption">Search Console data through {data.gscThrough}.</p>}
            </div>
          )}
        </>
      )}
    </ModalWrap>
  );
}
