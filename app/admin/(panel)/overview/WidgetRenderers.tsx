"use client";

// Dashboard Wave PHASE 2 · WP2 — per-kind widget renderers. These are the
// EXACT sections the pre-canvas CommandView rendered (KPI tile, Insights,
// Daily trend, Wins funnel, Scorecard, Firsts), lifted whole so the built-in
// Command layout reproduces today's surface unchanged. Each renderer takes its
// registry SLICE (WidgetDataMap[kind] — condition 3: shapes come from
// lib/admin/iq/widgets, never re-declared) plus the shared WidgetCtx.
//
// Honesty rules carried over verbatim: CmpRow renders ONLY payload strings
// (four states, §5.17 no bare dash, counts never %), the trend day affordances
// self-gate on day-shaped bucket keys, meters stay hollow at zero (D6).

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type {
  BreakdownRow,
  CommandKpi,
  FirstEntry,
  FunnelStepV2,
  IqInsightCard,
  PeriodComparison,
  PeriodEcho,
  ScorecardSlot,
  TrendBucket,
  WindowDays,
} from "@/lib/admin/iq/types";
import type {
  ActivityRecentSlice,
  GscQueriesSlice,
  LeadsDonutSlice,
  SourcesSlice,
  TopPagesSlice,
} from "@/lib/admin/iq/widgets";
import {
  GSC_MIN_IMPRESSIONS,
  INSIGHTS_MAX_COMMAND,
  RATE_MIN_DENOM,
  rateOrCounts,
  withPeriodGrammar,
  type PeriodParams,
} from "@/lib/admin/iq/shared";
import { bucketTickLabel, fmtDay } from "../fmt";
import AdmHoverChart from "../iq/AdmHoverChart";
import { dayHash, funnelHash, kpiHash, openDrill, pageHash, visitorHash } from "../iq/hash-route";
import { Donut, INQUIRY_COLORS, STATUS_COLORS, type DonutSlice } from "../leads/LeadDonuts";
import { QueriesTable } from "../search/SearchDrills";
import { KIND_LABEL, fmtWhen } from "../activity/ActivityView";
import { KPI_ACCENTS, KPI_TOOLTIPS } from "./canvas-lib";

/** Shared render context: period-independent payload facts captured once by
 * the island (countingSince/gscThrough never move with the period) plus the
 * live window + period echo kind. `interactive` is false in edit mode — the
 * canvas also sets `inert` on the content, this only suppresses the styling
 * affordances (no dead affordances, ux rule). */
export interface WidgetCtx {
  window: WindowDays;
  /** PERIOD-UI wave: the island's live period params — insight-card hrefs
   * carry the full grammar so a click never silently resets to the MTD
   * default (ux U5, upgraded from the retired ?p=-only withPeriod). */
  pp: PeriodParams;
  echoKind: PeriodEcho["kind"];
  /** Trend-axis bucket size from the payload echo — the heading adjective
   * tracks what the buckets actually are (content F1). */
  granularity: PeriodEcho["granularity"];
  countingSince: string | null;
  gscThrough: string | null;
  interactive: boolean;
}

const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Heading adjective per trend-axis granularity (content F1 — a quarter's
 * weekly buckets must not sit under a "Daily trend" heading). */
const TREND_ADJ: Record<PeriodEcho["granularity"], string> = {
  hour: "Hourly",
  day: "Daily",
  week: "Weekly",
  month: "Monthly",
};

/** KPI count-up on first paint only (DESIGN §5.16) — unchanged. */
export function CountUp({ n }: { n: number }) {
  const [shown, setShown] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (n === 0 || reduce) {
      setDone(true);
      return;
    }
    const start = performance.now();
    const DURATION = 400;
    let raf = 0;
    const tick = (t: number) => {
      const f = Math.min(1, (t - start) / DURATION);
      setShown(Math.round(n * (1 - Math.pow(1 - f, 3))));
      if (f < 1) raf = requestAnimationFrame(tick);
      else setDone(true);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{done || shown === null ? n : shown}</>;
}

/** The noun a "new"-state card names ("first month with data"). */
export const PERIOD_NOUN: Record<PeriodEcho["kind"], string> = {
  window: "period",
  today: "day",
  week: "week",
  month: "month",
  quarter: "quarter",
  year: "year",
  custom: "period",
};

/** The honest four-state comparison row (WP2 Phase 1, unchanged). */
export function CmpRow({ cmp, echoKind }: { cmp: PeriodComparison; echoKind: PeriodEcho["kind"] }) {
  if (cmp.kind === "n-a") return null;
  if (cmp.kind === "new") {
    return (
      <span className="adm-kpi-delta adm-cmp-new">first {PERIOD_NOUN[echoKind]} with data</span>
    );
  }
  // Factcheck #16: under a YEAR comparison the clamped caption must not name
  // the unit ("same month last year · vs full prior month" contradicts
  // itself) — the year-ness is read off the payload's own priorLabel (the one
  // producer suffixes every year-mode label with "last year"), so caption and
  // label can never disagree.
  const yearClamp = cmp.priorLabel.endsWith("last year");
  const elapsed =
    cmp.partial && cmp.elapsedDays !== null
      ? cmp.clamped
        ? yearClamp
          ? ` · vs the full prior period (${cmp.elapsedDays} day${cmp.elapsedDays === 1 ? "" : "s"})`
          : ` · vs full prior ${PERIOD_NOUN[echoKind]} (${cmp.elapsedDays} day${cmp.elapsedDays === 1 ? "" : "s"})`
        : ` · same ${cmp.elapsedDays} day${cmp.elapsedDays === 1 ? "" : "s"}`
      : "";
  if (cmp.kind === "counts") {
    return (
      <span className="adm-kpi-delta" title={cmp.reason}>
        {cmp.current} now · {cmp.prior} before · {cmp.priorLabel}
        {elapsed}
      </span>
    );
  }
  // kind === "delta"
  if (cmp.absolute === 0) {
    return (
      <span className="adm-kpi-delta">
        ±0 · vs {cmp.prior} · {cmp.priorLabel}
        {elapsed}
      </span>
    );
  }
  const up = cmp.absolute > 0;
  const good = up !== cmp.downIsGood;
  return (
    <span
      className="adm-kpi-delta"
      title={`${cmp.pct > 0 ? "+" : ""}${Math.round(cmp.pct)}% vs ${cmp.priorLabel}`}
    >
      <span className={good ? "adm-cmp-good" : "adm-cmp-bad"}>
        {up ? "▲" : "▼"} {up ? "+" : ""}
        {cmp.absolute}
      </span>{" "}
      vs {cmp.prior} · {cmp.priorLabel}
      {elapsed}
    </span>
  );
}

/** One KPI tile (kpi widget + the favorites strip). Two DISTINCT quiet states
 * (factcheck fix 1 — an in-flight tile must never claim the data is absent):
 *  - undefined → the slice has not arrived yet ("waiting for data");
 *  - null      → the payload genuinely has no such KPI ("not in the current
 *                data" — selector miss or malformed slice). */
export function KpiTile({ k, ctx }: { k: CommandKpi | null | undefined; ctx: WidgetCtx }) {
  if (k === undefined) {
    return (
      <div className="adm-kpi adm-widget-nodata">
        <span className="adm-kpi-label">KPI tile</span>
        <span className="adm-kpi-delta">waiting for data</span>
      </div>
    );
  }
  if (k === null) {
    return (
      <div className="adm-kpi adm-widget-nodata">
        <span className="adm-kpi-label">KPI unavailable</span>
        <span className="adm-kpi-delta">not in the current data</span>
      </div>
    );
  }
  return (
    <button
      type="button"
      className={`adm-kpi adm-kpi--drill ${KPI_ACCENTS[k.id] ?? "adm-kpi--blue"}`}
      title={KPI_TOOLTIPS[k.id]}
      onClick={ctx.interactive ? () => openDrill(kpiHash(k.id)) : undefined}
    >
      <span className="adm-kpi-n"><CountUp n={k.n} /></span>
      <span className="adm-kpi-label">
        {k.label}
        {k.id === "search-clicks" && ctx.gscThrough ? ` · through ${ctx.gscThrough.slice(5)}` : ""}
      </span>
      {k.comparison && <CmpRow cmp={k.comparison} echoKind={ctx.echoKind} />}
      <span className="adm-go" aria-hidden="true">→</span>
    </button>
  );
}

const INSIGHT_CLASS_META: Record<IqInsightCard["cls"], { label: string; className: string }> = {
  act: { label: "act", className: "adm-insight--act" },
  signal: { label: "signal", className: "adm-insight--signal" },
  milestone: { label: "milestone", className: "adm-insight--milestone" },
};

function InsightCard({ card, pp }: { card: IqInsightCard; pp: PeriodParams }) {
  const meta = INSIGHT_CLASS_META[card.cls];
  const body = (
    <>
      <span className="adm-insight-class">{meta.label}</span>
      <span className="adm-insight-copy">{card.copy}</span>
      {card.href && <span className="adm-insight-arrow" aria-hidden="true">→</span>}
    </>
  );
  if (card.href) {
    return (
      <Link href={withPeriodGrammar(card.href, pp)} className={`adm-insight ${meta.className}`} title={card.triggerMath}>
        {body}
      </Link>
    );
  }
  return (
    <div className={`adm-insight adm-insight--static ${meta.className}`} title={card.triggerMath}>
      {body}
    </div>
  );
}

export function InsightsWidget({
  data,
  ctx,
}: {
  data: { insights: IqInsightCard[]; ruleCount: number };
  ctx: WidgetCtx;
}) {
  const shown = data.insights.slice(0, INSIGHTS_MAX_COMMAND);
  return (
    <section className="adm-card">
      <h2>Insights</h2>
      {shown.length === 0 ? (
        <div className="adm-insight adm-insight--static adm-insight--watching">
          <span className="adm-insight-copy">
            Watching. Rules arm as data arrives. {data.ruleCount} active.
          </span>
        </div>
      ) : (
        <div className="adm-insights">
          {shown.map((c, i) => (
            <InsightCard key={`${c.ruleId}-${i}`} card={c} pp={ctx.pp} />
          ))}
        </div>
      )}
    </section>
  );
}

export function TrendWidget({ data, ctx }: { data: TrendBucket[]; ctx: WidgetCtx }) {
  // Day affordances self-gate on day-shaped bucket keys (B6): calendar
  // quarter/year buckets are weeks/months ("wk-"/"YYYY-MM") and today's are
  // hours — none match, so the daypick row and its caption suppress themselves.
  const hasDayKeys = data.some((d) => DAY_KEY_RE.test(d.key));
  const countingSince = ctx.countingSince ? fmtDay(ctx.countingSince) : null;
  const adj = TREND_ADJ[ctx.granularity];
  return (
    <section className="adm-card">
      <h2>
        {adj} trend: visitors <span className="adm-key adm-key-visitors" /> · wins{" "}
        <span className="adm-key adm-key-wins" />
      </h2>
      <AdmHoverChart
        ariaLabel={`${adj} visitors and wins trend`}
        // Factcheck #3: ticks via the ONE shared bucket formatter — the chart's
        // legacy slice(5) fallback garbles wk-/hour/month keys. bucketTickLabel
        // outputs are all <=5 chars, so the chart passes them through intact.
        labels={data.map((d) => bucketTickLabel(d.key))}
        onPointClick={
          !hasDayKeys || !ctx.interactive
            ? undefined
            : (i) => {
                const key = data[i]?.key;
                if (key && DAY_KEY_RE.test(key)) openDrill(dayHash(key));
              }
        }
        series={[
          {
            key: "visitors",
            label: "visitors",
            className: "adm-chart-visitors",
            values: data.map((d) => d.visitors),
            area: true,
            areaFill: "admAreaFill",
            endpointDotClass: "adm-chart-enddot",
            endpointHaloClass: "adm-chart-endhalo",
            swatch: "var(--blue)",
          },
          {
            key: "wins",
            label: "wins",
            className: "adm-chart-wins",
            values: data.map((d) => d.wins),
            dotsWhenPositive: true,
            swatch: "var(--green)",
          },
        ]}
      />
      {hasDayKeys && (
        <div className="adm-daypick" role="group" aria-label="Open a day">
          {data.map((d) =>
            DAY_KEY_RE.test(d.key) ? (
              <button
                key={d.key}
                type="button"
                className="adm-daypick-btn"
                title={`Open ${d.key}`}
                onClick={ctx.interactive ? () => openDrill(dayHash(d.key)) : undefined}
              >
                {d.key.slice(5)}
              </button>
            ) : null
          )}
        </div>
      )}
      {countingSince && <p className="adm-caption">counting since {countingSince}</p>}
      {hasDayKeys && (
        <p className="adm-caption">Click a day to open its visitors, pages, events and Search Console row.</p>
      )}
    </section>
  );
}

export function FunnelWidget({ data, ctx }: { data: FunnelStepV2[]; ctx: WidgetCtx }) {
  const totalWins =
    (data.find((f) => f.key === "form_submit")?.events ?? 0) +
    (data.find((f) => f.key === "booking")?.events ?? 0);
  return (
    <section className="adm-card">
      <h2>Wins funnel</h2>
      <div className="adm-funnel adm-funnel-v2">
        {data.map((f, i) => {
          const rate = i > 0 ? rateOrCounts(f.visitors, data[i - 1].visitors) : null;
          return (
            <div key={f.key} className="adm-funnel-cell">
              {rate && (
                <button
                  type="button"
                  className="adm-funnel-rate adm-funnel-rate--drill"
                  title={rate.kind === "counts" ? rate.reason : "Open the reached-next cohort"}
                  onClick={ctx.interactive ? () => openDrill(funnelHash(data[i - 1].key, "people")) : undefined}
                >
                  {rate.kind === "rate" ? (
                    <>
                      <b>{Math.round(rate.value * 100)}%</b> · {rate.numerator} of {rate.denominator}
                    </>
                  ) : (
                    <>
                      <b>{rate.numerator} of {rate.denominator}</b>
                      {rate.denominator > 0 && (
                        <span className="adm-funnel-small"> · small sample</span>
                      )}
                    </>
                  )}
                </button>
              )}
              <button
                type="button"
                className="adm-funnel-step adm-funnel-step--drill"
                onClick={ctx.interactive ? () => openDrill(funnelHash(f.key)) : undefined}
              >
                <span className="adm-funnel-n">{f.visitors}</span>
                <span className="adm-funnel-label">{f.label}</span>
                <span className="adm-funnel-events">
                  {f.key === "visitors"
                    ? `${f.events} pageview${f.events === 1 ? "" : "s"}`
                    : `${f.events} event${f.events === 1 ? "" : "s"}`}
                </span>
                <span className="adm-go" aria-hidden="true">→</span>
              </button>
            </div>
          );
        })}
      </div>
      <p className="adm-caption">
        {totalWins === 0
          ? "No wins this period. The funnel arms at the first chooser click. "
          : ""}
        Steps count distinct visitors with each step&apos;s event in the period, not an
        ordered cohort.
      </p>
    </section>
  );
}

export function ScorecardWidget({ data }: { data: ScorecardSlot[] }) {
  return (
    <section className="adm-card">
      <h2>Scorecard</h2>
      <div className="adm-scorecard">
        {data.map((s) => (
          <div key={s.id} className="adm-score-slot">
            <span className="adm-score-label">{s.label}</span>
            <span className="adm-score-note">{s.note}</span>
            {s.unlocked && s.mix ? (
              <div className="adm-score-mix">
                {s.mix.map((row) => (
                  <div key={row.label} className="adm-score-mix-row">
                    <span className="adm-bar-label">{row.label}</span>
                    <span className="adm-bar-track">
                      <span
                        className="adm-bar-fill"
                        style={{
                          width: `${Math.max(4, (row.n / Math.max(1, s.mixDenominator ?? 1)) * 100)}%`,
                        }}
                      />
                    </span>
                    <span className="adm-bar-n">{row.n}</span>
                  </div>
                ))}
                <span className="adm-score-denom">of {s.mixDenominator} attributed lead{(s.mixDenominator ?? 0) === 1 ? "" : "s"}</span>
              </div>
            ) : s.unlocked ? (
              <span className="adm-score-n">{s.n}</span>
            ) : (
              <div className="adm-score-gate">
                <span className="adm-bar-track adm-score-meter">
                  <span
                    className="adm-bar-fill"
                    style={{
                      width:
                        (s.progress ?? 0) === 0
                          ? 0
                          : `${Math.min(100, Math.max(2, ((s.progress ?? 0) / Math.max(1, s.target ?? 1)) * 100))}%`,
                    }}
                  />
                </span>
                <span className="adm-score-gatecopy">{s.gateCopy}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export function FirstsWidget({
  data,
}: {
  data: { firsts: FirstEntry[]; countingSince: string | null };
}) {
  return (
    <section className="adm-card">
      <h2>Firsts</h2>
      <ul className="adm-firsts">
        {data.firsts.map((f) => (
          <li key={f.id} className={f.achievedAt ? "done" : "pending"}>
            <span className="adm-first-mark" aria-hidden="true">{f.achievedAt ? "●" : "○"}</span>
            <span className="adm-first-label">{f.label}</span>
            <span className="adm-first-detail">
              {f.achievedAt ? (
                <>
                  {f.detail ? `${f.detail} · ` : ""}
                  {fmtDay(f.achievedAt)}
                </>
              ) : (
                "not yet · watching"
              )}
            </span>
          </li>
        ))}
      </ul>
      {/* Factcheck fix 2 (option A — render, not reword): the slice carries
          countingSince, and the gallery promises "with its counting-since
          caption"; now the widget keeps that promise standalone (the trend
          widget also shows it, matching the pre-canvas surface). */}
      {data.countingSince && (
        <p className="adm-caption">counting since {fmtDay(data.countingSince)}</p>
      )}
    </section>
  );
}

// ============================================================================
// Widget-library wave — module-fed widgets. Every renderer LIFTS the existing
// view's render block (LeadDonuts' Donut, TrafficView's MixCard bars, the
// ContentView pages table, SearchDrills' QueriesTable, ActivityView's rows) —
// nothing here re-draws a chart the app already has.
// ============================================================================

/** Lead donut — the pie chart Brad asked for, rendered by the SAME Donut
 * component the Leads page uses. ALL-TIME snapshot: the dashboard period does
 * not cut it, no comparison row renders, and Donut's own caption says
 * "all leads, all time" (data-analyst standing rule). */
export function LeadsDonutWidget({ data }: { data: LeadsDonutSlice }) {
  const slices: DonutSlice[] =
    data.by === "status"
      ? data.rows.map((r) => ({
          label: r.label.replace("_", " "),
          n: r.n,
          color: STATUS_COLORS[r.label] ?? "var(--text2)",
        }))
      : data.rows.map((r) => ({
          label: r.label,
          n: r.n,
          color: INQUIRY_COLORS[r.label] ?? "var(--text2)",
        }));
  return (
    <Donut
      title={data.by === "status" ? "Leads by status" : "Leads by inquiry type"}
      slices={slices}
      emptyCopy={
        data.by === "status"
          ? "No leads yet. Statuses fill as the pipeline moves; counts only, never percentages."
          : "No leads yet. Slices fill as briefs arrive; counts only, never percentages."
      }
    />
  );
}

/** Top pages — the ContentView pages table, trimmed to the widget columns.
 * Rows drill to the page modal; trimmed rows are counted in the caption. */
export function TopPagesWidget({ data, ctx }: { data: TopPagesSlice; ctx: WidgetCtx }) {
  const countingSince = data.countingSince ? fmtDay(data.countingSince) : null;
  return (
    <section className="adm-card">
      <h2>Top pages</h2>
      {data.pages.length === 0 ? (
        <p className="adm-empty">
          📭 No pageviews in this period yet.
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
                  <th title="First pageview of a visitor-day landing on this path">Entrances</th>
                  <th aria-label="Open"></th>
                </tr>
              </thead>
              <tbody>
                {data.pages.map((row) => (
                  <tr
                    key={row.path}
                    className="adm-tr-drill"
                    tabIndex={0}
                    role="button"
                    aria-label={`Open ${row.path} detail`}
                    onClick={ctx.interactive ? () => openDrill(pageHash(row.path)) : undefined}
                    onKeyDown={
                      ctx.interactive
                        ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              openDrill(pageHash(row.path));
                            }
                          }
                        : undefined
                    }
                  >
                    <td className="adm-path" title={row.path}>{row.path}</td>
                    <td className="adm-mono">{row.views}</td>
                    <td className="adm-mono">{row.visitors}</td>
                    <td className="adm-mono">{row.entrances}</td>
                    <td className="adm-go" aria-hidden="true">→</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.omitted > 0 && (
            <p className="adm-caption">
              {data.omitted} more page{data.omitted === 1 ? "" : "s"} in this period not shown.
              More on the Content module.
            </p>
          )}
        </>
      )}
    </section>
  );
}

/** One bar list — lifted from TrafficView's MixCard (same adm-bars markup and
 * the same N-guard: counts always, % share only when rateOrCounts allows),
 * with the denominator NOUN parameterized so source classes can honestly say
 * "visitors" where referrers say "pageviews". */
function BarList({ rows, total, noun }: { rows: BreakdownRow[]; total: number; noun: string }) {
  if (rows.length === 0) return <p className="adm-empty">📭 Nothing in this period yet.</p>;
  return (
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
        of {total} {noun}
        {total === 1 ? "" : "s"}
        {total < RATE_MIN_DENOM ? ` · counts only, shares appear at ${RATE_MIN_DENOM}+ ${noun}s` : ""}
      </p>
    </>
  );
}

/** Traffic sources — first-touch source classes (per visitor) + referrers
 * (per pageview), both straight off the traffic payload. */
export function SourcesWidget({ data }: { data: SourcesSlice }) {
  return (
    <section className="adm-card">
      <h2>Sources</h2>
      <h3 className="adm-widget-subhead">First-touch source class</h3>
      <BarList rows={data.sourceClasses} total={data.visitors} noun="visitor" />
      <h3 className="adm-widget-subhead">Referrers</h3>
      <BarList rows={data.referrers} total={data.pageviews} noun="pageview" />
      {data.referrersOmitted > 0 && (
        <p className="adm-caption">
          {data.referrersOmitted} more referrer{data.referrersOmitted === 1 ? "" : "s"} not shown.
          More on the Traffic module.
        </p>
      )}
    </section>
  );
}

/** Top search queries — SearchDrills' QueriesTable over the search payload's
 * query rows. Honest empty state below GSC's privacy threshold; the caption
 * carries the GSC lag. */
export function GscQueriesWidget({ data }: { data: GscQueriesSlice }) {
  const empty = data.queries.length === 0 && !data.below && !data.beyondCap;
  return (
    <section className="adm-card">
      <h2>Top search queries</h2>
      {empty ? (
        <p className="adm-empty">
          📭 No query rows for this period yet. Search Console shows query text only above
          about {GSC_MIN_IMPRESSIONS} impressions; totals on the Search module still count
          the anonymized remainder.
        </p>
      ) : (
        <QueriesTable rows={data.queries} below={data.below} beyond={data.beyondCap} />
      )}
      <p className="adm-caption">
        {data.gscThrough
          ? `Search Console data through ${data.gscThrough} · the data lags about 2 days.`
          : "No Search Console data ingested yet."}
      </p>
    </section>
  );
}

/** Recent activity — the newest rows of the unified log, compact (When / Kind /
 * Path / Visitor). Rows with a visitor id drill to the Journey modal. */
export function ActivityRecentWidget({
  data,
  ctx,
}: {
  data: ActivityRecentSlice;
  ctx: WidgetCtx;
}) {
  const countingSince = data.countingSince ? fmtDay(data.countingSince) : null;
  return (
    <section className="adm-card">
      <h2>Recent activity</h2>
      {data.rows.length === 0 ? (
        <p className="adm-empty">
          📭 No activity in this period yet.
          {countingSince ? ` Counting since ${countingSince}.` : " Counting starts with the first pageview."}
        </p>
      ) : (
        <>
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Kind</th>
                  <th>Path</th>
                  <th>Visitor</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => {
                  const drillable = ctx.interactive && r.visitorId !== null;
                  return (
                    <tr
                      key={r.key}
                      className={drillable ? "adm-tr-drill" : undefined}
                      tabIndex={drillable ? 0 : undefined}
                      role={drillable ? "button" : undefined}
                      aria-label={drillable ? "Open visitor journey" : undefined}
                      onClick={drillable ? () => openDrill(visitorHash(r.visitorId!)) : undefined}
                      onKeyDown={
                        drillable
                          ? (e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                openDrill(visitorHash(r.visitorId!));
                              }
                            }
                          : undefined
                      }
                    >
                      <td className="adm-mono">{fmtWhen(r.at)}</td>
                      <td>
                        <span className={`adm-qchip adm-act-${r.kind}`}>{KIND_LABEL[r.kind]}</span>
                      </td>
                      <td className="adm-path">{r.path ?? <span className="adm-unset">no path</span>}</td>
                      <td className="adm-mono">
                        {r.shortId ?? <span className="adm-unset">no cookie</span>}
                        {r.visitorId !== null && <span className="adm-go" aria-hidden="true"> →</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="adm-caption">
            Newest {data.rows.length} row{data.rows.length === 1 ? "" : "s"}.
            {data.capped ? " More matched this period." : ""}{" "}
            <Link href={withPeriodGrammar("/admin/activity", ctx.pp)}>All activity →</Link>
          </p>
        </>
      )}
    </section>
  );
}
