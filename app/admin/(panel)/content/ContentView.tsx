"use client";

import { useEffect, useRef, useState } from "react";
import type { IqContent, WindowDays } from "@/lib/admin/iq/types";
import { ENGAGED_MIN_DURATION_S, buildIqQuery } from "@/lib/admin/iq/shared";
import { subscribePeriodRefetch } from "../period-bus";
import SegmentChips, { type ChipGroup } from "../SegmentChips";
import { fmtDay, fmtSeconds } from "../fmt";

/*
 * WP2.5 Content module (client island) — "pages". Pages table (path sticky,
 * views, visitors, avg duration WITH coverage, entrances) + the B13 pillar
 * rollup. Rows are NOT clickable (page drills arrive in Wave 3 — no dead
 * affordances). Module-local chips: device / country only, refetching through
 * GET /admin/api/iq/content without navigation; querystring stays shareable.
 * Duration coloring uses the ONE canonical engagement floor (10s, B2) — no
 * invented ramp values.
 */

interface Cuts {
  device: string | null;
  country: string | null;
}
// Querystring building lives in shared.buildIqQuery (api A5 — one copy).

function durClass(avg: number | null): string {
  if (avg === null) return "";
  return avg >= ENGAGED_MIN_DURATION_S ? " adm-dur-hi" : " adm-dur-lo";
}

export default function ContentView({ initial }: { initial: IqContent }) {
  const [data, setData] = useState<IqContent>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cutsRef = useRef<Cuts>({ device: initial.applied.device, country: initial.applied.country });
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
      const res = await fetch(`/admin/api/iq/content${qs ? `?${qs}` : ""}`, { cache: "no-store" });
      // Expired session (api A1): the middleware 307s to login and fetch
      // follows it — send the tab to login instead of a permanent error.
      if (res.redirected && new URL(res.url).pathname.startsWith("/admin/login")) {
        window.location.assign("/admin/login");
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      const payload = (await res.json()) as IqContent;
      if (id !== seqRef.current) return; // stale response — discard (A3)
      setData(payload);
      // Success-only canonical URL (api A4 single-owner rule).
      window.history.replaceState(null, "", `/admin/content${qs ? `?${qs}` : ""}`);
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
    void refetch();
  }

  const cuts = cutsRef.current;
  const hasCut = Boolean(data.applied.device || data.applied.country);
  const countingSince = data.countingSince ? fmtDay(data.countingSince) : null;
  const insightsSince = data.insightsCountingSince ? fmtDay(data.insightsCountingSince) : null;
  const anyPillarTraffic = data.pillars.some((r) => r.views > 0);
  const chipGroups: ChipGroup[] = [
    { key: "device", label: "Device", options: data.chipOptions.devices, active: cuts.device },
    { key: "country", label: "Country", options: data.chipOptions.countries, active: cuts.country },
  ];

  return (
    <div data-acc="content" aria-busy={loading}>
      <div className="adm-head">
        <h1>✍️ Content</h1>
        <span className="adm-count">
          last {data.window} days · {data.pageviews} pageview{data.pageviews === 1 ? "" : "s"} ·{" "}
          {data.visitors} visitor{data.visitors === 1 ? "" : "s"}
        </span>
      </div>

      {error && <p className="adm-error" role="status">{error}</p>}

      <SegmentChips groups={chipGroups} onToggle={onToggle} disabled={loading} />
      {hasCut && (
        <p className="adm-cut-note" role="status">
          {data.visitors} of {data.visitorsUnfiltered} visitor{data.visitorsUnfiltered === 1 ? "" : "s"} match this cut
        </p>
      )}

      <div className={`adm-surface${loading ? " is-loading" : ""}`}>
        <section className="adm-card adm-card-wide">
          <h2>Pages</h2>
          {data.pages.length === 0 ? (
            <p className="adm-empty">
              📭 No pageviews in this {hasCut ? "cut" : "window"} yet.
              {countingSince ? ` Counting since ${countingSince}.` : " Counting starts with the first pageview."}
            </p>
          ) : (
            <>
              <div className="adm-table-wrap">
                <table className="adm-table adm-table--stickycol">
                  <thead>
                    <tr>
                      <th>Path</th>
                      <th title="Pageviews on this path in the period">Views</th>
                      <th title="Distinct visitors on this path in the period">Visitors</th>
                      <th title={`Average time across views that reported a duration. Colored against the ${ENGAGED_MIN_DURATION_S}s engagement floor.`}>
                        Avg time
                      </th>
                      <th title="Views that reported a duration (coverage for the average)">Reported</th>
                      <th title="First pageview of a visitor-day landing on this path">Entrances</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.pages.map((row) => (
                      <tr key={row.path}>
                        <td className="adm-path" title={row.path}>{row.path}</td>
                        <td className="adm-mono">{row.views}</td>
                        <td className="adm-mono">{row.visitors}</td>
                        <td className={`adm-mono${durClass(row.avgDuration.avgSeconds)}`}>
                          {fmtSeconds(row.avgDuration.avgSeconds)}
                        </td>
                        <td className="adm-mono">
                          {row.avgDuration.reported} of {row.avgDuration.total}
                        </td>
                        <td className="adm-mono">{row.entrances}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="adm-caption">
                Page drill-downs arrive in Wave 3. Avg time counts only views that reported a
                duration; the reported column is that coverage.
              </p>
              {/* Truncation honesty (api A2): capped rows are said, not vanished. */}
              {(data.pagesOmitted ?? 0) > 0 && (
                <p className="adm-caption">
                  {data.pagesOmitted} more page{data.pagesOmitted === 1 ? "" : "s"} beyond the{" "}
                  {data.pages.length}-row cap not shown; totals above count them.
                </p>
              )}
            </>
          )}
        </section>

        <section className="adm-card adm-card-wide">
          <h2>Insights pillars</h2>
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Pillar</th>
                  <th>Views</th>
                  <th>Visitors</th>
                  <th title={`Visitors with ${ENGAGED_MIN_DURATION_S}s+ on a pillar page, 2+ pillar pageviews, or an event there`}>
                    Engaged
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.pillars.map((r) => (
                  <tr key={r.slug}>
                    <td>{r.label}</td>
                    <td className="adm-mono">{r.views}</td>
                    <td className="adm-mono">{r.visitors}</td>
                    <td className="adm-mono">{r.engaged}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="adm-caption">
            {anyPillarTraffic
              ? `Rollup of /insights and its four pillars.${insightsSince ? ` Counting since ${insightsSince}.` : ""}`
              : insightsSince
                ? `No /insights traffic in this window. Counting since ${insightsSince}; zeros are data, not absence.`
                : "No /insights traffic yet. Pillar counts fill from the first article visit; the meter is running."}
          </p>
        </section>
      </div>

      <p className="adm-mono" style={{ display: "block", marginTop: 18 }}>
        {data.meta.metricsVersion} · {data.meta.mode} · {data.meta.internalExcluded} internal{" "}
        {data.meta.internalExcluded === 1 ? "visitor" : "visitors"} excluded
      </p>
    </div>
  );
}
