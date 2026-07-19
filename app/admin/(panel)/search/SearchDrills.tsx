"use client";

// WP3.6 — thin client affordance layer over the server-rendered Search page.
// The page stays a server component (honest empty states rendered there); ONLY
// the drill affordances are client: the Branded / Classifiable KPI tiles become
// buttons, and the intent-bucket rows + query-table rows open GSC drills via the
// shared hash router. Accent stays purple (the page sets data-acc="search").

import { openDrill, gscHash } from "../iq/hash-route";
import { GSC_MIN_IMPRESSIONS } from "@/lib/admin/iq/shared";
import type { BelowThresholdRollup, GscDetailKind, GscQueryRow, IntentBucketRow } from "@/lib/admin/iq/types";

/** A drillable KPI tile (Branded / Classifiable) — same markup as the static
 * tiles, wrapped in a button that opens the matching GSC modal. */
export function GscTileButton({
  kind,
  n,
  label,
  delta,
  title,
}: {
  kind: GscDetailKind;
  n: string | number;
  label: string;
  delta?: string;
  title: string;
}) {
  return (
    <button type="button" className="adm-kpi adm-kpi--drill adm-kpi--purple" title={title} onClick={() => openDrill(gscHash(kind))}>
      <span className="adm-kpi-n">{n}</span>
      <span className="adm-kpi-label">{label}</span>
      {delta && <span className="adm-kpi-delta">{delta}</span>}
      <span className="adm-go" aria-hidden="true">→</span>
    </button>
  );
}

/** Intent bars — each bucket row opens the intent modal (which carries in-modal
 * bucket selection). Denominator visible; sub-threshold rollup counted. */
export function IntentBars({
  rows,
  denom,
  below,
}: {
  rows: IntentBucketRow[];
  denom: number;
  below: BelowThresholdRollup | null;
}) {
  return (
    <>
      <ul className="adm-bars">
        {rows.map((r) => (
          <li key={r.bucket}>
            <button type="button" className="adm-bar-btn" onClick={() => openDrill(gscHash("intent"))} title={`Open ${r.bucket} queries`}>
              <span className="adm-bar-label">{r.bucket}</span>
              <span className="adm-bar-track">
                <span className="adm-bar-fill" style={{ width: `${Math.max(3, (r.impressions / Math.max(1, denom)) * 100)}%` }} />
              </span>
              <span className="adm-bar-n">{r.impressions}</span>
              <span className="adm-go" aria-hidden="true">→</span>
            </button>
          </li>
        ))}
      </ul>
      {below && (
        <p className="adm-caption">
          below threshold ({below.rows} bucket{below.rows === 1 ? "" : "s"} under {GSC_MIN_IMPRESSIONS} impressions):{" "}
          {below.impressions} impressions, {below.clicks} clicks. Counted in totals, not hidden.
        </p>
      )}
    </>
  );
}

/** Queries table — each above-threshold row opens the query-row modal. Below and
 * beyond-cap rollups are counted, never hidden. */
export function QueriesTable({
  rows,
  below,
  beyond,
}: {
  rows: GscQueryRow[];
  below: BelowThresholdRollup | null;
  beyond: BelowThresholdRollup | null;
}) {
  return (
    <div className="adm-table-wrap">
      <table className="adm-table adm-table--stickycol">
        <thead>
          <tr>
            <th>Query</th>
            <th title="Clicks in the window">Clicks</th>
            <th title="Impressions in the window">Impressions</th>
            <th title="Impression-weighted average position (lower is better)">Position</th>
            <th>Tags</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.query} className="adm-row-drill" onClick={() => openDrill(gscHash("query", row.query))} tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDrill(gscHash("query", row.query)); } }}>
              <td className="adm-path" title={row.query}>{row.query}</td>
              <td className="adm-mono">{row.clicks}</td>
              <td className="adm-mono">{row.impressions}</td>
              <td className="adm-mono">{row.position.toFixed(1)}</td>
              <td>
                <span className="adm-qtags">
                  {row.isBranded && <span className="adm-qchip adm-qchip--branded">branded</span>}
                  {row.brandedAmbiguous && <span className="adm-qchip adm-qchip--ambiguous">ambiguous</span>}
                  {row.intentBucket && <span className="adm-qchip">{row.intentBucket}</span>}
                </span>
              </td>
            </tr>
          ))}
          {below && (
            <tr className="adm-row-rollup">
              <td>below threshold ({below.rows} quer{below.rows === 1 ? "y" : "ies"} under {GSC_MIN_IMPRESSIONS} impressions)</td>
              <td className="adm-mono">{below.clicks}</td>
              <td className="adm-mono">{below.impressions}</td>
              <td className="adm-mono">not applicable</td>
              <td />
            </tr>
          )}
          {beyond && (
            <tr className="adm-row-rollup">
              <td>beyond the row cap ({beyond.rows} more quer{beyond.rows === 1 ? "y" : "ies"} over {GSC_MIN_IMPRESSIONS} impressions)</td>
              <td className="adm-mono">{beyond.clicks}</td>
              <td className="adm-mono">{beyond.impressions}</td>
              <td className="adm-mono">not applicable</td>
              <td />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
