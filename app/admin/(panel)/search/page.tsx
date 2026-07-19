import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { getSource } from "@/lib/admin/iq";
import { readMode } from "@/lib/admin/iq/mode";
import { GSC_MIN_IMPRESSIONS, parseWindowParam } from "@/lib/admin/iq/shared";
import { readInternalVisitorIds } from "@/lib/admin/iq/internal";
import type { GscTrendPoint, IqSearch } from "@/lib/admin/iq/types";
import { GscTileButton, IntentBars, QueriesTable } from "./SearchDrills";
import DemoBadge from "../iq/DemoBadge";

export const dynamic = "force-dynamic";

/*
 * Search (GSC) module (WP2.6) — server-rendered; period flips navigate (no
 * island needed: no module-local chips here in Wave 2). Everything is charted
 * by GSC's STORED date (gscDateKey) — never re-bucketed — and the GSC
 * population never mixes with site metrics (DATA §2).
 *
 * Honesty surface: the ~2-day lag notice is prominent, % classifiable (B9) is
 * ALWAYS shown, brandedAmbiguous is reported separately (never folded into
 * branded), and sub-threshold queries roll into one counted line. The current
 * live shape (GscDaily totals present, GscQuery empty in-window) renders as an
 * honest partial-data state, not an error.
 */

/** Two-line branded vs non-branded CLICKS trend (B8 — clicks, never impressions). */
function GscTrendChart({ points }: { points: GscTrendPoint[] }) {
  const W = 720;
  const H = 150;
  const PAD = { l: 30, r: 8, t: 10, b: 22 };
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const max = Math.max(1, ...points.map((d) => Math.max(d.branded, d.nonBranded)));
  const x = (i: number) => PAD.l + (points.length < 2 ? iw / 2 : (i / (points.length - 1)) * iw);
  const y = (v: number) => PAD.t + ih - (v / max) * ih;
  const line = (get: (d: GscTrendPoint) => number) =>
    points.map((d, i) => `${x(i).toFixed(1)},${y(get(d)).toFixed(1)}`).join(" ");
  const labelEvery = Math.max(1, Math.ceil(points.length / 9));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="adm-chart"
      role="img"
      aria-label="Branded and non-branded search clicks by Search Console date"
    >
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(max * f)} y2={y(max * f)} className="adm-chart-grid" />
          <text x={PAD.l - 6} y={y(max * f) + 3.5} textAnchor="end" className="adm-chart-tick">
            {Math.round(max * f)}
          </text>
        </g>
      ))}
      <polyline points={line((d) => d.branded)} className="adm-chart-accline adm-chart-draw" fill="none" pathLength={1} />
      <polyline points={line((d) => d.nonBranded)} className="adm-chart-visitors adm-chart-draw" fill="none" pathLength={1} />
      {points.map((d, i) =>
        i % labelEvery === 0 ? (
          <text key={d.date} x={x(i)} y={H - 6} textAnchor="middle" className="adm-chart-tick">
            {d.date.slice(5)}
          </text>
        ) : null
      )}
    </svg>
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  if (!(await requireAdmin())) redirect("/admin/login");

  const { p } = await searchParams;
  const internalVisitorIds = await readInternalVisitorIds();
  const mode = await readMode();
  const s = await getSource(mode).search({ window: parseWindowParam(p) }, { internalVisitorIds });

  const classifiablePct = s.impressions > 0 ? Math.round((s.visibleImpressions / s.impressions) * 100) : null;
  const hasGsc = s.gscThrough !== null;
  const hasWindowData = s.trend.length > 0 || s.impressions > 0;

  return (
    <div data-acc="search">
      <div className="adm-head">
        <h1>🔍 Search</h1>
        <DemoBadge demo={mode === "demo"} />
        <span className="adm-count">
          {hasGsc ? `data through ${s.gscThrough}` : "no Search Console data yet"} · last {s.window} days
        </span>
      </div>

      {/* Prominent lag notice (UX §7): never blame-less blankness. */}
      <p className="adm-lag" role="note">
        {hasGsc
          ? `Search Console data from ${s.gscSince}, through ${s.gscThrough}. Search Console reports arrive with about 2 days of delay and are charted by their stored Search Console date.`
          : "Search Console connected; the daily pull fills this module as Search Console releases data, with about 2 days of delay."}
      </p>

      <div className="adm-kpis">
        <div className="adm-kpi" title="Property-level impressions from Search Console daily totals, the honest denominator.">
          <span className="adm-kpi-n">{s.impressions}</span>
          <span className="adm-kpi-label">Impressions</span>
        </div>
        <div className="adm-kpi" title="Property-level clicks from Search Console daily totals.">
          <span className="adm-kpi-n">{s.clicks}</span>
          <span className="adm-kpi-label">Clicks</span>
        </div>
        <GscTileButton
          kind="branded"
          n={s.brandedClicks}
          label="Branded clicks"
          title="Clicks on queries matching the two-token branded rule (both name tokens). Clicks are the branded headline; impressions may include wrong-entity searches. Ambiguous single-token matches are reported separately, never counted here. Open for the trend and the ambiguous/collision tab."
        />
        <GscTileButton
          kind="classifiable"
          n={classifiablePct === null ? "not yet" : `${classifiablePct}%`}
          label="Classifiable"
          delta={`${s.visibleImpressions} of ${s.impressions} impressions have visible queries`}
          title="Share of property impressions whose query Search Console actually shows. The rest are anonymized by Google; query-level cuts are partial by design. Open for the per-day visible-vs-anonymized breakdown."
        />
      </div>
      <p className="adm-caption">
        {s.brandedAmbiguousClicks} ambiguous-branded click{s.brandedAmbiguousClicks === 1 ? "" : "s"} (single-token
        matches, possibly other Bradleys or other Griffins) reported separately, never folded into branded.
      </p>

      <section className="adm-card adm-card-wide">
        <h2>
          Branded <span className="adm-key adm-key-acc" /> vs non-branded{" "}
          <span className="adm-key adm-key-visitors" /> clicks
        </h2>
        {s.trend.length === 0 ? (
          <p className="adm-empty">
            📭 No Search Console days in this window yet. The two lines draw as daily reports arrive
            (about 2 days behind){s.gscSince ? `; Search Console has been counting since ${s.gscSince}` : ""}.
          </p>
        ) : (
          <>
            <GscTrendChart points={s.trend} />
            <p className="adm-caption">
              Lines cover only the queries Search Console shows us
              {classifiablePct !== null
                ? `; in this window that is ${s.visibleImpressions} of ${s.impressions} impressions (${classifiablePct}%)`
                : ""}
              . Zero lines under non-zero totals mean anonymized queries, not zero search traffic.
              Ambiguous-branded clicks sit on neither line.
            </p>
          </>
        )}
      </section>

      <div className="adm-grid">
        <section className="adm-card">
          <h2>Intent buckets</h2>
          {s.intents.length === 0 && !s.intentsBelowThreshold ? (
            <p className="adm-empty">
              📭 No classifiable queries in this window. Buckets fill as Search Console releases query rows
              {s.gscSince ? ` (counting since ${s.gscSince})` : ""}.
            </p>
          ) : (
            <IntentBars rows={s.intents} denom={s.visibleImpressions} below={s.intentsBelowThreshold} />
          )}
        </section>

        <section className="adm-card">
          <h2>Countries</h2>
          {s.countries.length === 0 ? (
            <p className="adm-empty">
              📭 No country rows in this window. Search Console reports its own country dimension as data arrives.
            </p>
          ) : (
            <>
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>Country</th>
                      <th>Impressions</th>
                      <th>Clicks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.countries.map((r) => (
                      <tr key={r.country}>
                        <td className="adm-mono">{r.country.toUpperCase()}</td>
                        <td className="adm-mono">{r.impressions}</td>
                        <td className="adm-mono">{r.clicks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="adm-caption">
                Search Console&apos;s own country dimension, never applied to site analytics (different populations).
              </p>
              {/* Truncation honesty (api A2): country rows past the cap roll
                  up into one counted line — hittable today at 12 rows. */}
              {s.countriesBeyondCap && (
                <p className="adm-caption">
                  {s.countriesBeyondCap.rows} more countr
                  {s.countriesBeyondCap.rows === 1 ? "y" : "ies"} beyond this list:{" "}
                  {s.countriesBeyondCap.impressions} impressions, {s.countriesBeyondCap.clicks}{" "}
                  clicks. Counted in totals, not hidden.
                </p>
              )}
            </>
          )}
        </section>
      </div>

      <section className="adm-card adm-card-wide" style={{ marginTop: 16 }}>
        <h2>Queries</h2>
        {s.queries.length === 0 && !s.queriesBelowThreshold ? (
          <p className="adm-empty">
            📭 Query rows appear here as Search Console shares them; rows under {GSC_MIN_IMPRESSIONS} impressions roll into
            one counted line. Search Console has shared no query rows in this window
            {s.gscSince ? ` (listening since ${s.gscSince})` : ""}. The totals above still count every
            impression, including the anonymized ones.
          </p>
        ) : (
          <>
            <QueriesTable rows={s.queries} below={s.queriesBelowThreshold} beyond={s.queriesBeyondCap} />
            <p className="adm-caption">
              Sub-threshold rows are counted in every total above, rolled up, never hidden. Click a query row to open its
              daily trend, landing pages and tags.
            </p>
          </>
        )}
      </section>

      {!hasWindowData && hasGsc && (
        <p className="adm-caption">
          Search Console has data through {s.gscThrough}, but none of it falls inside the last {s.window} days.
        </p>
      )}

      <p className="adm-mono" style={{ display: "block", marginTop: 18 }}>
        {s.meta.metricsVersion} · {s.meta.mode} · {s.meta.internalExcluded} internal{" "}
        {s.meta.internalExcluded === 1 ? "visitor" : "visitors"} excluded
        {s.meta.classifierVersions.length ? ` · search tags ${s.meta.classifierVersions.join(", ")}` : ""}
      </p>
    </div>
  );
}
