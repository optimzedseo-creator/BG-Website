"use client";

import { useEffect, useRef, useState } from "react";
import DemoBadge from "../iq/DemoBadge";
import Link from "next/link";
import type {
  IqCommand,
  IqInsightCard,
  PeriodComparison,
  PeriodEcho,
  WindowDays,
} from "@/lib/admin/iq/types";
import { INSIGHTS_MAX_COMMAND, buildIqQuery, rateOrCounts, withPeriod } from "@/lib/admin/iq/shared";
import { fmtDay, priorWindowPredatesData } from "../fmt";
import { subscribePeriodRefetch, type PeriodSignal } from "../period-bus";
import ControlStrip from "./ControlStrip";
import AdmHoverChart from "../iq/AdmHoverChart";
import { dayHash, funnelHash, kpiHash, openDrill } from "../iq/hash-route";

/*
 * WP2.2b Command surface (client island). Everything renders from the ONE
 * aggregated payload (types.ts wire contract — ISO strings, zero PII by
 * construction). Period flips arrive over the period bus: refetch through
 * GET /admin/api/iq without navigation; on SUCCESS this island writes the
 * canonical URL (single-owner rule, api A4 — the switch no longer writes it
 * when an island is present).
 *
 * No dead affordances: KPI tiles, funnel steps, chart days and table rows are
 * Wave-3 drill targets and carry NO hover/click styling yet.
 */

// Per-tile metric accents (DESIGN §1b, extended for the 6-tile strip: Search
// clicks takes purple with the Search module, so Briefs moves to pink —
// flagged for design review in the wave report).
const KPI_ACCENTS: Record<string, string> = {
  visitors: "adm-kpi--blue",
  pageviews: "adm-kpi--cyan",
  "search-clicks": "adm-kpi--purple",
  briefs: "adm-kpi--pink",
  bookings: "adm-kpi--green",
  subscribers: "adm-kpi--amber",
};

const KPI_TOOLTIPS: Record<string, string> = {
  visitors: "Distinct visitor ids with a pageview in the period. Internal traffic excluded.",
  pageviews: "Pageviews in the period. Internal traffic excluded.",
  "search-clicks":
    "Google Search Console property-level clicks, charted by their stored date. The data lags about 2 days.",
  briefs: "Server-recorded contact-form submissions (form_submit). The trusted win.",
  bookings: "Calendly bookings captured in the period, by capture time, not meeting time.",
  subscribers: "New subscriber rows in the period.",
};

const INSIGHT_CLASS_META: Record<IqInsightCard["cls"], { label: string; className: string }> = {
  act: { label: "act", className: "adm-insight--act" },
  signal: { label: "signal", className: "adm-insight--signal" },
  milestone: { label: "milestone", className: "adm-insight--milestone" },
};

/** KPI count-up on first paint only (DESIGN §5.16): 400ms, tabular-nums keeps
 * layout still; skipped when the value is 0 and under reduced motion. Period
 * refetches update instantly — the flourish belongs to the entry moment. */
function CountUp({ n }: { n: number }) {
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

  // Server render + post-animation: the live value. Mid-animation: the tick.
  return <>{done || shown === null ? n : shown}</>;
}

/** The noun a "new"-state card names ("first month with data"). Keyed off the
 * payload's period echo so the words track what the source actually resolved. */
const PERIOD_NOUN: Record<PeriodEcho["kind"], string> = {
  window: "period",
  today: "day",
  week: "week",
  month: "month",
  quarter: "quarter",
  year: "year",
  custom: "period",
};

/**
 * WP2 — the honest four-state comparison row (design delta-line spec). Every
 * string on it comes from the payload (comparison + period echo); the client
 * renders, never re-derives the guard:
 *  - delta : `▲ +5 vs 9 · prior week` — ONLY the glyph+number colored (green
 *            up / red down, goodness respects downIsGood), 500-weight mono for
 *            AA; the earned % rides the title attr, never the card (counts are
 *            the native language, UX §2).
 *  - flat  : `±0 · vs 14 · prior week` — neutral, never colored (§5.17 bans a
 *            bare dash glyph; "±0" names the zero).
 *  - counts: `4 now · 2 before · prior week` — suppressed %, reason in title.
 *  - new   : "first month with data" — muted, no fake delta vs an empty prior.
 *  - n-a   : compare off → the row collapses entirely (no "±0 vs prior" noise).
 * Partial periods append the elapsed caption ("· same 18 days").
 */
function CmpRow({ cmp, echoKind }: { cmp: PeriodComparison; echoKind: PeriodEcho["kind"] }) {
  if (cmp.kind === "n-a") return null;
  if (cmp.kind === "new") {
    return (
      <span className="adm-kpi-delta adm-cmp-new">first {PERIOD_NOUN[echoKind]} with data</span>
    );
  }
  // Factcheck W2: "same N days" only when the slices are GENUINELY equal. When
  // the M1 clamp fired the prior side is the full (shorter) prior unit — name
  // that instead of asserting a false equality.
  const elapsed =
    cmp.partial && cmp.elapsedDays !== null
      ? cmp.clamped
        ? ` · vs full prior ${PERIOD_NOUN[echoKind]} (${cmp.elapsedDays} day${cmp.elapsedDays === 1 ? "" : "s"})`
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

function InsightCard({ card, period }: { card: IqInsightCard; period: WindowDays }) {
  const meta = INSIGHT_CLASS_META[card.cls];
  const body = (
    <>
      <span className="adm-insight-class">{meta.label}</span>
      <span className="adm-insight-copy">{card.copy}</span>
      {card.href && <span className="adm-insight-arrow" aria-hidden="true">→</span>}
    </>
  );
  // Trigger math on hover/expand via title (§6b honesty pattern).
  // withPeriod (U5): deep links carry the active ?p= — never a silent 30d reset.
  if (card.href) {
    return (
      <Link href={withPeriod(card.href, period)} className={`adm-insight ${meta.className}`} title={card.triggerMath}>
        {body}
      </Link>
    );
  }
  // Linkless cards (IR3, IR11 site firsts/records): visually non-interactive.
  return (
    <div className={`adm-insight adm-insight--static ${meta.className}`} title={card.triggerMath}>
      {body}
    </div>
  );
}

export default function CommandView({
  initial,
  initialParams,
}: {
  initial: IqCommand;
  /** The page-parsed period params (WP2) — seeds the control strip so a deep
   * link renders its own state, and the refetch grammar starts from it. */
  initialParams: PeriodSignal;
}) {
  const [data, setData] = useState<IqCommand>(initial);
  const [params, setParams] = useState<PeriodSignal>(initialParams);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Monotonic fetch sequence (api A3): a slow older response must never
  // overwrite a newer one, and must never win the URL.
  const seqRef = useRef(0);

  useEffect(() => {
    // WP2: the bus now carries the FULL period signal (top-bar window flips
    // AND the control strip's calendar/compare picks — one refetch path).
    return subscribePeriodRefetch(async (s: PeriodSignal) => {
      const id = ++seqRef.current;
      setParams(s); // the strip reflects the pick immediately (control state)
      setLoading(true);
      setError(null);
      // ONE canonical querystring for fetch AND replaceState (api A5): what the
      // URL claims is exactly what was fetched. &view= stays reserved/untouched.
      const qs = buildIqQuery(s.window, {}, s);
      try {
        // /admin/api/iq (not /api/admin/iq): the session cookie is path-scoped
        // to /admin, so the handler must live under it — see the route file.
        const res = await fetch(`/admin/api/iq${qs ? `?${qs}` : ""}`, { cache: "no-store" });
        // Expired session (api A1): middleware 307s to the login page, fetch
        // follows it, and the HTML response would render as a permanent
        // generic error. Send the whole tab to login instead.
        if (res.redirected && new URL(res.url).pathname.startsWith("/admin/login")) {
          window.location.assign("/admin/login");
          return;
        }
        if (!res.ok) throw new Error(String(res.status));
        const payload = (await res.json()) as IqCommand;
        if (id !== seqRef.current) return; // stale response — discard (A3)
        setData(payload);
        // Success-only canonical URL (api A4 single-owner rule): the island
        // writes the FULL querystring; failure leaves URL and data both old.
        // Preserve any open modal's deep-link hash (F5).
        window.history.replaceState(null, "", `/admin/overview${qs ? `?${qs}` : ""}${window.location.hash}`);
      } catch {
        if (id !== seqRef.current) return;
        setError("Could not refresh. The numbers below are from the previous selection.");
      } finally {
        if (id === seqRef.current) setLoading(false);
      }
    });
  }, []);

  const shownInsights = data.insights.slice(0, INSIGHTS_MAX_COMMAND);
  const countingSince = data.countingSince ? fmtDay(data.countingSince) : null;
  const totalWins =
    (data.funnel.find((f) => f.key === "form_submit")?.events ?? 0) +
    (data.funnel.find((f) => f.key === "booking")?.events ?? 0);

  // WP2 head sub-line: rendered FROM the payload's period echo — the source's
  // own statement of what it resolved, never a client re-derivation.
  const echo = data.period;
  const headPeriod =
    echo.kind === "window"
      ? `last ${data.window} days`
      : echo.kind === "custom"
        ? `${fmtDay(echo.from)} to ${fmtDay(echo.to)}`
        : echo.kind === "today"
          ? "today"
          : `this ${PERIOD_NOUN[echo.kind]}${echo.partial ? " to date" : ""}`;
  const headCompare = echo.compareLabel ? ` · vs ${echo.compareLabel}` : "";

  return (
    <div data-acc="overview" aria-busy={loading}>
      <div className="adm-head">
        <h1>Command</h1>
        <DemoBadge demo={data.meta.mode === "demo"} />
        <span className="adm-count">
          {headPeriod}
          {headCompare}
          {data.gscThrough ? ` · Search Console through ${data.gscThrough}` : ""}
        </span>
      </div>

      {/* WP2 control strip — the sentence-pill period+compare control. Sits
          between .adm-head and the surface (design .adm-controlbar row). */}
      <ControlStrip params={params} compareLabel={echo.compareLabel} loading={loading} />

      {error && <p className="adm-error" role="status">{error}</p>}

      <div className={`adm-surface${loading ? " is-loading" : ""}`}>
        {/* ---- KPI strip: six tiles, honest four-state comparison rows
                (WP2 — counts are the native language, never % on the card) ---- */}
        <div className="adm-kpis adm-kpis-6">
          {data.kpis.map((k) => {
            // Legacy fallback ONLY when the payload predates the comparison
            // field (old cached shape) — live+demo both emit it since WP1.
            const d = k.n - k.prior;
            const legacyLabel = priorWindowPredatesData(data.since, data.countingSince)
              ? "first period with data"
              : `${d > 0 ? "+" : d < 0 ? "" : "±"}${d} vs prior ${data.window}d`;
            return (
              <button
                key={k.id}
                type="button"
                className={`adm-kpi adm-kpi--drill ${KPI_ACCENTS[k.id] ?? "adm-kpi--blue"}`}
                title={KPI_TOOLTIPS[k.id]}
                onClick={() => openDrill(kpiHash(k.id))}
              >
                <span className="adm-kpi-n"><CountUp n={k.n} /></span>
                <span className="adm-kpi-label">
                  {k.label}
                  {k.id === "search-clicks" && data.gscThrough ? ` · through ${data.gscThrough.slice(5)}` : ""}
                </span>
                {k.comparison ? (
                  <CmpRow cmp={k.comparison} echoKind={echo.kind} />
                ) : (
                  <span className="adm-kpi-delta">{legacyLabel}</span>
                )}
                <span className="adm-go" aria-hidden="true">→</span>
              </button>
            );
          })}
        </div>

        {/* ---- Insights strip (§6b canon — max 3, silent truncation) ---- */}
        <section className="adm-card adm-card-wide">
          <h2>Insights</h2>
          {shownInsights.length === 0 ? (
            <div className="adm-insight adm-insight--static adm-insight--watching">
              <span className="adm-insight-copy">
                Watching. Rules arm as data arrives. {data.ruleCount} active.
              </span>
            </div>
          ) : (
            <div className="adm-insights">
              {shownInsights.map((c, i) => (
                <InsightCard key={`${c.ruleId}-${i}`} card={c} period={data.window} />
              ))}
            </div>
          )}
        </section>

        {/* ---- Daily trend (existing chart, restyled home; day-click deferred) ---- */}
        <section className="adm-card adm-card-wide">
          <h2>
            Daily trend: visitors <span className="adm-key adm-key-visitors" /> · wins{" "}
            <span className="adm-key adm-key-wins" />
          </h2>
          <AdmHoverChart
            ariaLabel="Daily visitors and wins trend"
            labels={data.trend.map((d) => d.key)}
            onPointClick={
              data.window === 90
                ? undefined
                : (i) => {
                    const key = data.trend[i]?.key;
                    if (key && /^\d{4}-\d{2}-\d{2}$/.test(key)) openDrill(dayHash(key));
                  }
            }
            series={[
              {
                key: "visitors",
                label: "visitors",
                className: "adm-chart-visitors",
                values: data.trend.map((d) => d.visitors),
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
                values: data.trend.map((d) => d.wins),
                dotsWhenPositive: true,
                swatch: "var(--green)",
              },
            ]}
          />
          {/* Day-clickable affordance (touch-safe fallback for the chart click):
              a compact row of day labels, each opening the Day modal. Weekly
              (90d) buckets are not single days, so this row shows only for
              7d/30d day buckets. */}
          {data.window !== 90 && (
            <div className="adm-daypick" role="group" aria-label="Open a day">
              {data.trend.map((d) =>
                /^\d{4}-\d{2}-\d{2}$/.test(d.key) ? (
                  <button
                    key={d.key}
                    type="button"
                    className="adm-daypick-btn"
                    title={`Open ${d.key}`}
                    onClick={() => openDrill(dayHash(d.key))}
                  >
                    {d.key.slice(5)}
                  </button>
                ) : null
              )}
            </div>
          )}
          {countingSince && <p className="adm-caption">counting since {countingSince}</p>}
          {/* B6: only promise a day-click when day buckets are actually present
              and clickable (same gate as the .adm-daypick row) — never a
              caption for an affordance that will not respond (90d = weekly). */}
          {data.window !== 90 && data.trend.some((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.key)) && (
            <p className="adm-caption">Click a day to open its visitors, pages, events and Search Console row.</p>
          )}
        </section>

        {/* ---- Wins funnel: visible denominators, fraction under threshold ---- */}
        <section className="adm-card adm-card-wide">
          <h2>Wins funnel</h2>
          <div className="adm-funnel adm-funnel-v2">
            {data.funnel.map((f, i) => {
              const rate = i > 0 ? rateOrCounts(f.visitors, data.funnel[i - 1].visitors) : null;
              return (
                <div key={f.key} className="adm-funnel-cell">
                  {rate && (
                    <button
                      type="button"
                      className="adm-funnel-rate adm-funnel-rate--drill"
                      title={rate.kind === "counts" ? rate.reason : "Open the reached-next cohort"}
                      onClick={() => openDrill(funnelHash(data.funnel[i - 1].key, "people"))}
                    >
                      {rate.kind === "rate" ? (
                        <>
                          <b>{Math.round(rate.value * 100)}%</b> · {rate.numerator} of {rate.denominator}
                        </>
                      ) : (
                        <>
                          <b>{rate.numerator} of {rate.denominator}</b>
                          {/* U8: "0 of 0 · small sample" is noise — the arming
                              caption below already covers the empty state. */}
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
                    onClick={() => openDrill(funnelHash(f.key))}
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

        {/* ---- Three-number scorecard (UX §2.7, §7 meter gates) ---- */}
        <section className="adm-card adm-card-wide">
          <h2>Scorecard</h2>
          <div className="adm-scorecard">
            {data.scorecard.map((s) => (
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
                      {/* D6: at 0 the meter is HOLLOW (width 0), matching the
                          firsts ledger — no 2% sliver implying progress. */}
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

        {/* ---- Firsts ledger (§6b IR11 catalog — one list, two renderings) ---- */}
        <section className="adm-card adm-card-wide">
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
        </section>
      </div>

      {/* §4.5 honesty metadata — the denominator is never silently shrunk. */}
      <p className="adm-mono" style={{ display: "block", marginTop: 18 }}>
        {data.meta.metricsVersion} · {data.meta.mode} · {data.meta.internalExcluded} internal{" "}
        {data.meta.internalExcluded === 1 ? "visitor" : "visitors"} excluded
        {data.meta.classifierVersions.length
          ? ` · search tags ${data.meta.classifierVersions.join(", ")}`
          : ""}
      </p>
    </div>
  );
}
