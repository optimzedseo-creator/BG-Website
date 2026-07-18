import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { getSource } from "@/lib/admin/iq";
import type { WindowDays } from "@/lib/admin/iq/types";
import { readInternalVisitorIds } from "@/lib/admin/iq/internal";

export const dynamic = "force-dynamic";

// All analytics numbers now come from the shared metrics module
// (lib/admin/iq — WP1.3): getSource("live").summary() computes KPIs, trend
// (bucketKey, America/New_York — the UTC dayKey bug is dead), funnel, and
// breakdowns, with the WP1.5 internal-exclusion list applied to every
// visitor-scoped metric. No direct Prisma analytics queries in this file.
const WINDOWS: readonly WindowDays[] = [7, 30, 90];

type Counted = { label: string; n: number };

/** Inline-SVG daily trend (ADMIN-IQ §5.11 static tier): visitors (blue line +
 *  area fill + endpoint "now" cursor) + wins (green line/dots). Draw-in is
 *  pure CSS via pathLength=1 (600ms, killed under reduced motion). */
function TrendChart({ days }: { days: { key: string; visitors: number; wins: number }[] }) {
  const W = 720;
  const H = 150;
  const PAD = { l: 30, r: 8, t: 10, b: 22 };
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const max = Math.max(1, ...days.map((d) => Math.max(d.visitors, d.wins)));
  const x = (i: number) => PAD.l + (days.length < 2 ? iw / 2 : (i / (days.length - 1)) * iw);
  const y = (v: number) => PAD.t + ih - (v / max) * ih;
  const line = (get: (d: (typeof days)[number]) => number) =>
    days.map((d, i) => `${x(i).toFixed(1)},${y(get(d)).toFixed(1)}`).join(" ");
  const labelEvery = Math.max(1, Math.ceil(days.length / 9));

  // Area under the visitors line: line points + the two baseline corners.
  const baseY = (PAD.t + ih).toFixed(1);
  const visitorsPoints = line((d) => d.visitors);
  const areaPoints = `${visitorsPoints} ${x(days.length - 1).toFixed(1)},${baseY} ${x(0).toFixed(1)},${baseY}`;
  const last = days[days.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="adm-chart" role="img" aria-label="Daily visitors and wins trend">
      <defs>
        <linearGradient id="admAreaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--blue)" stopOpacity="0.22" />
          <stop offset="1" stopColor="var(--blue)" stopOpacity="0" />
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
      <polygon points={areaPoints} className="adm-chart-area adm-chart-late" stroke="none" />
      <polyline points={visitorsPoints} className="adm-chart-visitors adm-chart-draw" fill="none" pathLength={1} />
      <polyline points={line((d) => d.wins)} className="adm-chart-wins adm-chart-draw" fill="none" pathLength={1} />
      {days.map((d, i) =>
        d.wins > 0 ? <circle key={d.key} cx={x(i)} cy={y(d.wins)} r={3} className="adm-chart-windot adm-chart-late" /> : null
      )}
      {last && (
        <g className="adm-chart-late">
          <circle cx={x(days.length - 1)} cy={y(last.visitors)} r={10} className="adm-chart-endhalo" />
          <circle cx={x(days.length - 1)} cy={y(last.visitors)} r={4} className="adm-chart-enddot" />
        </g>
      )}
      {days.map((d, i) =>
        i % labelEvery === 0 ? (
          <text key={d.key} x={x(i)} y={H - 6} textAnchor="middle" className="adm-chart-tick">
            {d.key.slice(5)}
          </text>
        ) : null
      )}
    </svg>
  );
}

function BreakdownCard({ title, rows, total }: { title: string; rows: Counted[]; total: number }) {
  return (
    <section className="adm-card">
      <h2>{title}</h2>
      {rows.length === 0 ? (
        <p className="adm-empty">📭 No data in this window.</p>
      ) : (
        <ul className="adm-bars">
          {rows.map((r) => (
            <li key={r.label}>
              <span className="adm-bar-label" title={r.label}>{r.label}</span>
              <span className="adm-bar-track">
                <span className="adm-bar-fill" style={{ width: `${Math.max(3, (r.n / Math.max(1, total)) * 100)}%` }} />
              </span>
              <span className="adm-bar-n">{r.n}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ w?: string }>;
}) {
  if (!(await requireAdmin())) redirect("/admin/login");

  const { w } = await searchParams;
  const windowDays = WINDOWS.find((d) => String(d) === w) ?? 30;

  // WP1.5: the exclusion list rides into the source so every visitor-scoped
  // number excludes internal traffic BY DEFINITION (DATA-SPEC §5.3), and the
  // payload's internalExcluded count renders in the footer below.
  const internalVisitorIds = await readInternalVisitorIds();
  const summary = await getSource("live").summary({ window: windowDays }, { internalVisitorIds });

  const days = summary.trend;
  const funnel = summary.funnel;
  const leadCounts: Counted[] = summary.leadsByStatus.map((s) => ({
    label: s.status.replace("_", " "),
    n: s.n,
  }));

  // Per-tile metric accents (DESIGN-SPEC §1b): Visitors=blue, Pageviews=cyan,
  // Briefs=purple, Bookings=green.
  const KPI_ACCENTS: Record<string, string> = {
    Visitors: "adm-kpi--blue",
    Pageviews: "adm-kpi--cyan",
    Briefs: "adm-kpi--purple",
    Bookings: "adm-kpi--green",
  };
  const kpis = summary.kpis.map((k) => ({ ...k, acc: KPI_ACCENTS[k.label] ?? "adm-kpi--blue" }));

  return (
    <div data-acc="overview">
      <div className="adm-head">
        <h1>Dashboard</h1>
        <nav className="adm-window" aria-label="Time window">
          {WINDOWS.map((d) => (
            <Link key={d} href={`/admin?w=${d}`} className={d === windowDays ? "on" : ""} aria-current={d === windowDays ? "page" : undefined}>
              {d}d
            </Link>
          ))}
        </nav>
      </div>

      <div className="adm-kpis">
        {kpis.map((k) => (
          <div key={k.label} className={`adm-kpi ${k.acc}`}>
            <span className="adm-kpi-n">{k.n}</span>
            <span className="adm-kpi-label">{k.label}</span>
          </div>
        ))}
      </div>

      <section className="adm-card adm-card-wide">
        <h2>Daily trend — visitors <span className="adm-key adm-key-visitors" /> · wins <span className="adm-key adm-key-wins" /></h2>
        <TrendChart days={days} />
      </section>

      <section className="adm-card adm-card-wide">
        <h2>Wins funnel</h2>
        <div className="adm-funnel">
          {funnel.map((f, i) => (
            <div key={f.label} className="adm-funnel-step">
              <span className="adm-funnel-n">{f.n}</span>
              <span className="adm-funnel-label">{f.label}</span>
              {i < funnel.length - 1 && <span className="adm-funnel-arrow" aria-hidden="true">→</span>}
            </div>
          ))}
        </div>
      </section>

      <div className="adm-grid">
        <BreakdownCard title="Top pages" rows={summary.breakdowns.topPages} total={summary.pageviews} />
        <BreakdownCard title="Top referrers" rows={summary.breakdowns.topReferrers} total={summary.pageviews} />
        <BreakdownCard title="Devices" rows={summary.breakdowns.devices} total={summary.pageviews} />
        <BreakdownCard title="Countries" rows={summary.breakdowns.countries} total={summary.pageviews} />
        <BreakdownCard title="Leads by status (all-time)" rows={leadCounts} total={leadCounts.reduce((a, b) => a + b.n, 0)} />
      </div>

      {/* §4.5 honesty metadata — the denominator is never silently shrunk. */}
      <p className="adm-mono" style={{ display: "block", marginTop: 18 }}>
        {summary.meta.metricsVersion} · {summary.meta.mode} · {summary.meta.internalExcluded}{" "}
        internal {summary.meta.internalExcluded === 1 ? "visitor" : "visitors"} excluded
      </p>
    </div>
  );
}
