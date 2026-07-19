"use client";

// WP3.7 — day-detail drill modal. A single NY day: visitors (drill to Journey),
// pages viewed, events, and the GSC row if one exists for that stored date.
// Accent = overview. Opened by clicking a day on the Command daily trend.

import { ModalHeader, ModalStatus, ModalWrap } from "./ModalShell";
import { currentPeriod, useDrill } from "./drill-fetch";
import { openDrill, visitorHash } from "./hash-route";
import type { IqDayDetail } from "@/lib/admin/iq/types";

export default function DayModal({ dayKey, onClose }: { dayKey: string; onClose: () => void }) {
  const p = currentPeriod();
  const { data, loading, error } = useDrill<IqDayDetail>(`/admin/api/iq/day?d=${encodeURIComponent(dayKey)}&p=${p}`);
  const titleId = "adm-day-modal-title";

  return (
    <ModalWrap onClose={onClose} labelledBy={titleId} acc="overview">
      <ModalHeader
        micro="Day detail"
        title={dayKey}
        titleId={titleId}
        sub={data ? `${data.visitors} visitor${data.visitors === 1 ? "" : "s"} · ${data.pageviews} pageview${data.pageviews === 1 ? "" : "s"}` : undefined}
        onClose={onClose}
      />
      <ModalStatus loading={loading} error={error} />

      {data && (
        <div className="adm-modal-section">
          <h3 className="adm-modal-subhead">Visitors</h3>
          {data.visitorList.length === 0 ? (
            <p className="adm-empty">🌙 No visitors on this day.</p>
          ) : (
            <ul className="adm-vlog">
              {data.visitorList.map((v) => (
                <li key={v.visitorId}>
                  <button type="button" className="adm-vlog-row" onClick={() => openDrill(visitorHash(v.visitorId))}>
                    <div className="adm-vlog-head">
                      <span className="adm-mono">{v.shortId}</span>
                      <span className="adm-vlog-dim">{v.device ?? "unknown"} · {v.country ?? "unknown"}</span>
                      <span className="adm-vlog-time">{v.views} view{v.views === 1 ? "" : "s"}</span>
                      <span className="adm-go" aria-hidden="true">→</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <h3 className="adm-modal-subhead">Pages viewed</h3>
          {data.pages.length === 0 ? (
            <p className="adm-empty">📭 No pages recorded.</p>
          ) : (
            <ul className="adm-bars">
              {data.pages.map((row) => (
                <li key={row.label}>
                  <span className="adm-bar-label" title={row.label}>{row.label}</span>
                  <span className="adm-bar-track">
                    <span className="adm-bar-fill" style={{ width: `${Math.max(3, (row.n / Math.max(1, data.pages[0].n)) * 100)}%` }} />
                  </span>
                  <span className="adm-bar-n">{row.n}</span>
                </li>
              ))}
            </ul>
          )}

          <h3 className="adm-modal-subhead">Events</h3>
          {data.events.length === 0 ? (
            <p className="adm-empty">📭 No chooser, cta, brief or booking events this day.</p>
          ) : (
            <ul className="adm-daylog">
              {data.events.map((e, i) => (
                <li key={e.at + i} className="adm-daylog-row">
                  <span className="adm-mono adm-daylog-time">{e.at.slice(11, 16)} UTC</span>
                  <span className="adm-daylog-kind">{e.kind.replace(/_/g, " ")}</span>
                  <span className="adm-daylog-path">{e.path ?? "no path"}</span>
                  {e.visitorId && (
                    <button type="button" className="adm-daylog-link" onClick={() => openDrill(visitorHash(e.visitorId!))}>
                      {e.shortId} →
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          <h3 className="adm-modal-subhead">Search Console</h3>
          {data.gsc ? (
            <>
              <div className="adm-modal-summary">
                <div><span className="adm-modal-stat-n">{data.gsc.impressions}</span><span className="adm-modal-stat-l">impressions</span></div>
                <div><span className="adm-modal-stat-n">{data.gsc.clicks}</span><span className="adm-modal-stat-l">clicks</span></div>
              </div>
              {data.gsc.queries.length > 0 && (
                <div className="adm-table-wrap">
                  <table className="adm-table adm-table--stickycol">
                    <thead><tr><th>Query</th><th>Clicks</th><th>Impressions</th><th>Position</th></tr></thead>
                    <tbody>
                      {data.gsc.queries.map((q) => (
                        <tr key={q.query}>
                          <td className="adm-path" title={q.query}>{q.query}</td>
                          <td className="adm-mono">{q.clicks}</td>
                          <td className="adm-mono">{q.impressions}</td>
                          <td className="adm-mono">{q.position.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <p className="adm-empty">🔍 No Search Console row stored for this date. Search Console reports arrive about 2 days behind.</p>
          )}

          {data.truncated && <p className="adm-caption">Some lists were capped for this day; the counts above stay true.</p>}
        </div>
      )}
    </ModalWrap>
  );
}
