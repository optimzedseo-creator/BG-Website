"use client";

// WP3.7 — funnel-step drill modal. Tabs: Events / Trend / People. Opened from a
// funnel-step cell AND from a rate card (both land here; the People tab carries
// the reached-next cohort). Accent = overview green (the wins entity). Every
// visitor row drills to the Journey modal.

import { useState } from "react";
import AdmHoverChart, { type ChartSeries } from "./AdmHoverChart";
import { ModalHeader, ModalStatus, ModalTabs, ModalWrap, tabPanelProps } from "./ModalShell";
import { currentPeriod, useDrill } from "./drill-fetch";
import { openDrill, visitorHash } from "./hash-route";
import type { IqFunnelStep } from "@/lib/admin/iq/types";

export default function FunnelStepModal({
  stepKey,
  initialTab,
  onClose,
}: {
  stepKey: string;
  /** Rate-card opens land on People (the reached-next cohort); cells on Events. */
  initialTab?: string;
  onClose: () => void;
}) {
  const p = currentPeriod();
  const { data, loading, error } = useDrill<IqFunnelStep>(`/admin/api/iq/funnel?step=${encodeURIComponent(stepKey)}&p=${p}`);
  const [tab, setTab] = useState(initialTab ?? "events");
  const [compare, setCompare] = useState(false);
  const titleId = "adm-funnel-modal-title";

  return (
    <ModalWrap onClose={onClose} labelledBy={titleId} acc="leads">
      <ModalHeader
        micro="Funnel step"
        title={data?.label ?? "Funnel step"}
        titleId={titleId}
        sub={data ? `last ${data.window} days · ${data.visitors} visitor${data.visitors === 1 ? "" : "s"} · ${data.events} event${data.events === 1 ? "" : "s"}` : undefined}
        onClose={onClose}
      />
      <ModalStatus loading={loading} error={error} />

      {data && (
        <>
          <ModalTabs
            tabs={[{ key: "events", label: "Events" }, { key: "trend", label: "Trend" }, { key: "people", label: "People" }]}
            active={tab}
            onSelect={setTab}
          />

          {tab === "events" && (
            <div className="adm-modal-section" {...tabPanelProps("events")}>
              {data.eventsList.length === 0 ? (
                <p className="adm-empty">📭 No {data.label.toLowerCase()} events in this period yet.</p>
              ) : (
                <ul className="adm-vlog">
                  {data.eventsList.map((e, i) => (
                    <li key={e.at + i}>
                      {e.visitorId ? (
                        <button type="button" className="adm-vlog-row" onClick={() => openDrill(visitorHash(e.visitorId!))}>
                          <div className="adm-vlog-head">
                            <span className="adm-mono">{e.shortId}</span>
                            <span className="adm-vlog-dim">{e.path ?? "no path"}</span>
                            <span className="adm-vlog-time">{e.at.slice(0, 10)} {e.at.slice(11, 16)} UTC</span>
                            <span className="adm-go" aria-hidden="true">→</span>
                          </div>
                          {e.metaChips.length > 0 && (
                            <div className="adm-j2-chips">
                              {e.metaChips.map((c, ci) => <span key={ci} className="adm-qchip">{c}</span>)}
                            </div>
                          )}
                        </button>
                      ) : (
                        <div className="adm-vlog-row adm-vlog-row--static">
                          <div className="adm-vlog-head">
                            <span className="adm-mono">no cookie</span>
                            <span className="adm-vlog-dim">{e.path ?? "no path"}</span>
                            <span className="adm-vlog-time">{e.at.slice(0, 10)} {e.at.slice(11, 16)} UTC</span>
                          </div>
                          {e.metaChips.length > 0 && (
                            <div className="adm-j2-chips">
                              {e.metaChips.map((c, ci) => <span key={ci} className="adm-qchip">{c}</span>)}
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {data.eventsTruncated && <p className="adm-caption">Showing the most recent events. Older rows exist beyond this list.</p>}
            </div>
          )}

          {tab === "trend" && (
            <div className="adm-modal-section" {...tabPanelProps("trend")}>
              <div className="adm-modal-controls">
                <label className="adm-modal-compare">
                  <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} />
                  Compare previous
                </label>
              </div>
              <AdmHoverChart
                ariaLabel={`Daily ${data.label.toLowerCase()} trend`}
                labels={data.trend.map((t) => t.key)}
                series={[
                  ...(compare
                    ? [{ key: "prior", label: "prior", className: "adm-chart-accline", values: data.trend.map((_, i) => data.priorTrend[i]?.n ?? 0), dashed: true, swatch: "var(--text2)" } as ChartSeries]
                    : []),
                  { key: "cur", label: data.label.toLowerCase(), className: "adm-chart-accline", values: data.trend.map((t) => t.n), area: true, areaFill: "admFunnelArea", endpointDotClass: "adm-chart-accdot", endpointHaloClass: "adm-chart-acchalo", swatch: "var(--acc)" } as ChartSeries,
                ]}
              />
              <p className="adm-caption">Daily count of this step in the period. Deltas are counts, never rates.</p>
            </div>
          )}

          {tab === "people" && (
            <div className="adm-modal-section" {...tabPanelProps("people")}>
              {data.nextKey && (
                <p className="adm-caption adm-caption--strong">
                  {data.nextLabel} also seen for {data.reachedNext} of {data.visitors} visitor{data.visitors === 1 ? "" : "s"}.
                </p>
              )}
              {data.people.length === 0 ? (
                <p className="adm-empty">📭 No identified visitors for this step yet.</p>
              ) : (
                <ul className="adm-vlog">
                  {data.people.map((person) => (
                    <li key={person.visitorId}>
                      <button type="button" className="adm-vlog-row" onClick={() => openDrill(visitorHash(person.visitorId))}>
                        <div className="adm-vlog-head">
                          <span className="adm-mono">{person.shortId}</span>
                          <span className="adm-vlog-dim">{person.count} event{person.count === 1 ? "" : "s"}</span>
                          {data.nextKey !== null && (
                            <span className={`adm-reach-chip${person.reachedNext ? " on" : ""}`}>
                              {person.reachedNext ? `also ${data.nextLabel}` : "not yet"}
                            </span>
                          )}
                          <span className="adm-go" aria-hidden="true">→</span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {data.peopleTruncated && <p className="adm-caption">Showing the top visitors by event count. More exist beyond this list.</p>}
              <p className="adm-caption">
                Person by person is the only honest framing at this scale, not a rate and not an ordered cohort. Each
                chip asks whether that same visitor id also did the next step in this period.
              </p>
            </div>
          )}
        </>
      )}
    </ModalWrap>
  );
}
