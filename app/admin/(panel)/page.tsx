import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOWS = [7, 30, 90] as const;

type Counted = { label: string; n: number };

function topCounts(values: (string | null | undefined)[], fallback: string, top = 8): Counted[] {
  const counts = new Map<string, number>();
  for (const v of values) {
    const key = v && v.trim() ? v.trim() : fallback;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, n]) => ({ label, n }))
    .sort((a, b) => b.n - a.n)
    .slice(0, top);
}

function referrerHost(ref: string | null): string | null {
  if (!ref) return null;
  try {
    const host = new URL(ref).hostname.replace(/^www\./, "");
    return host === "bradleygriffin.us" ? null : host; // internal nav isn't a source
  } catch {
    return ref.slice(0, 60);
  }
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Inline-SVG daily trend: visitors (navy line) + wins (gold dots/line). */
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

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="adm-chart" role="img" aria-label="Daily visitors and wins trend">
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(max * f)} y2={y(max * f)} className="adm-chart-grid" />
          <text x={PAD.l - 6} y={y(max * f) + 3.5} textAnchor="end" className="adm-chart-tick">
            {Math.round(max * f)}
          </text>
        </g>
      ))}
      <polyline points={line((d) => d.visitors)} className="adm-chart-visitors" fill="none" />
      <polyline points={line((d) => d.wins)} className="adm-chart-wins" fill="none" />
      {days.map((d, i) =>
        d.wins > 0 ? <circle key={d.key} cx={x(i)} cy={y(d.wins)} r={3} className="adm-chart-windot" /> : null
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
        <p className="adm-empty">No data in this window.</p>
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
  const since = new Date(Date.now() - windowDays * DAY_MS);

  const [views, events, bookings, leadsByStatus] = await Promise.all([
    prisma.pageView.findMany({
      where: { createdAt: { gte: since } },
      select: { path: true, visitorId: true, referrer: true, device: true, country: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.event.findMany({
      where: { createdAt: { gte: since } },
      select: { name: true, createdAt: true },
    }),
    prisma.booking.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    prisma.lead.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const visitors = new Set(views.map((v) => v.visitorId)).size;
  const eventCount = (name: string) => events.filter((e) => e.name === name).length;
  const briefs = eventCount("form_submit");

  // Daily trend: distinct visitors + wins (form submits + captured bookings).
  const days: { key: string; visitors: number; wins: number }[] = [];
  const visitorsByDay = new Map<string, Set<string>>();
  for (const v of views) {
    const k = dayKey(v.createdAt);
    if (!visitorsByDay.has(k)) visitorsByDay.set(k, new Set());
    visitorsByDay.get(k)!.add(v.visitorId);
  }
  const winsByDay = new Map<string, number>();
  for (const e of events) {
    if (e.name !== "form_submit") continue;
    const k = dayKey(e.createdAt);
    winsByDay.set(k, (winsByDay.get(k) || 0) + 1);
  }
  for (const b of bookings) {
    const k = dayKey(b.createdAt);
    winsByDay.set(k, (winsByDay.get(k) || 0) + 1);
  }
  for (let i = windowDays - 1; i >= 0; i--) {
    const k = dayKey(new Date(Date.now() - i * DAY_MS));
    days.push({ key: k, visitors: visitorsByDay.get(k)?.size || 0, wins: winsByDay.get(k) || 0 });
  }

  const funnel = [
    { label: "Chooser click", n: eventCount("chooser_click") },
    { label: "CTA click", n: eventCount("cta_click") },
    { label: "Brief (form)", n: briefs },
    { label: "Booking", n: bookings.length },
  ];

  const statusOrder = ["new", "contacted", "call_booked", "qualified", "won", "lost"];
  const leadCounts = statusOrder.map((s) => ({
    label: s.replace("_", " "),
    n: leadsByStatus.find((r) => r.status === s)?._count._all || 0,
  }));

  const kpis = [
    { label: "Visitors", n: visitors },
    { label: "Pageviews", n: views.length },
    { label: "Briefs", n: briefs },
    { label: "Bookings", n: bookings.length },
  ];

  return (
    <>
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
          <div key={k.label} className="adm-kpi">
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
        <BreakdownCard title="Top pages" rows={topCounts(views.map((v) => v.path), "(unknown)")} total={views.length} />
        <BreakdownCard
          title="Top referrers"
          rows={topCounts(views.map((v) => referrerHost(v.referrer)), "(direct)")}
          total={views.length}
        />
        <BreakdownCard title="Devices" rows={topCounts(views.map((v) => v.device), "(unknown)")} total={views.length} />
        <BreakdownCard title="Countries" rows={topCounts(views.map((v) => v.country), "(unknown)")} total={views.length} />
        <BreakdownCard title="Leads by status (all-time)" rows={leadCounts} total={leadCounts.reduce((a, b) => a + b.n, 0)} />
      </div>
    </>
  );
}
