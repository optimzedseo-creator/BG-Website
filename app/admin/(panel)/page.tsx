import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { getSource } from "@/lib/admin/iq";
import { readMode } from "@/lib/admin/iq/mode";
import { parseWindowParam } from "@/lib/admin/iq/shared";
import type { ModuleTeaser } from "@/lib/admin/iq/types";
import { readInternalVisitorIds } from "@/lib/admin/iq/internal";
import DemoBadge from "./iq/DemoBadge";

export const dynamic = "force-dynamic";

/*
 * WP2.2a — MODULE-ENTRY LANDING at /admin (Brad-directed routing ruling: the
 * dashboard/Command lives at /admin/overview; old /admin bookmarks land here
 * by design, no redirect). Time-of-day greeting computed in America/New_York;
 * module cards use getSource(mode).landing() (honors the LIVE/DEMO cookie) — name,
 * headline count for the current period, 14-day micro-sparkline, one-line
 * latest fact, accent keyline, whole card links to the module (DESIGN §5.14).
 */

const NY = "America/New_York";

const MODULE_META: Record<
  ModuleTeaser["module"],
  { href: string; title: string; emoji: string }
> = {
  overview: { href: "/admin/overview", title: "Command", emoji: "📊" },
  traffic: { href: "/admin/traffic", title: "Traffic", emoji: "📈" },
  search: { href: "/admin/search", title: "Search", emoji: "🔍" },
  leads: { href: "/admin/leads", title: "Leads", emoji: "🤝" },
  content: { href: "/admin/content", title: "Content", emoji: "✍️" },
  security: { href: "/admin/security", title: "Security", emoji: "🛡️" },
};

function greetingFor(now: Date): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: NY, hour: "numeric", hour12: false }).format(now)
  );
  if (hour >= 5 && hour < 12) return "Good morning.";
  if (hour >= 12 && hour < 18) return "Good afternoon.";
  return "Good evening.";
}

/** 14-day micro-sparkline. Zeros are drawn — a flat line at 0 IS data (UX §7). */
function Sparkline({ values }: { values: number[] }) {
  if (!values.length) return null;
  const W = 120;
  const H = 26;
  const max = Math.max(1, ...values);
  const x = (i: number) => (values.length < 2 ? W / 2 : (i / (values.length - 1)) * W);
  const y = (v: number) => H - 2 - (v / max) * (H - 4);
  const points = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="adm-spark" aria-hidden="true">
      <polyline points={points} fill="none" />
    </svg>
  );
}

export default async function AdminLanding({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  if (!(await requireAdmin())) redirect("/admin/login");

  const { p } = await searchParams;
  const windowDays = parseWindowParam(p);
  const internalVisitorIds = await readInternalVisitorIds();
  const mode = await readMode();
  const landing = await getSource(mode).landing({ window: windowDays }, { internalVisitorIds });

  const now = new Date();
  const micro = new Intl.DateTimeFormat("en-US", {
    timeZone: NY,
    weekday: "long",
    month: "short",
    day: "numeric",
  })
    .format(now)
    .toUpperCase();
  const dateLine = new Intl.DateTimeFormat("en-US", {
    timeZone: NY,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(now);
  const suffix = windowDays === 30 ? "" : `?p=${windowDays}`;

  return (
    <div data-acc="overview" className="adm-landing">
      <p className="adm-landing-micro">
        OPS CONSOLE · {micro} <DemoBadge demo={mode === "demo"} />
      </p>
      <h1 className="adm-landing-greeting">{greetingFor(now)}</h1>
      <p className="adm-landing-sub">
        {/* FC1: every number in this sentence is WINDOWED — it says "last N
            days", so an all-time leads count here would be false. */}
        {dateLine} · counting <b>{landing.visitors}</b> visitor{landing.visitors === 1 ? "" : "s"},{" "}
        <b>{landing.pageviews}</b> pageview{landing.pageviews === 1 ? "" : "s"} and{" "}
        <b>{landing.leadsWindow}</b> lead{landing.leadsWindow === 1 ? "" : "s"} · last {windowDays} days
      </p>

      <div className="adm-landing-grid">
        {landing.teasers.map((t) => {
          const meta = MODULE_META[t.module];
          return (
            <Link
              key={t.module}
              href={`${meta.href}${suffix}`}
              className="adm-mod-card"
              data-acc={t.module}
            >
              <span className="adm-mod-emoji" aria-hidden="true">{meta.emoji}</span>
              <span className="adm-mod-title">{meta.title}</span>
              {/* Demo teaser stat lines carry a leading ◐ so a cropped module
                  card still reads as demo (UX §8). */}
              <span className="adm-mod-stat">{mode === "demo" ? `◐ ${t.stat}` : t.stat}</span>
              {t.spark.length > 0 && <Sparkline values={t.spark} />}
              {t.latest && <span className="adm-mod-latest">{t.latest}</span>}
              <span className="adm-mod-arrow" aria-hidden="true">→</span>
            </Link>
          );
        })}
      </div>

      <p className="adm-mono adm-landing-foot">
        {landing.meta.metricsVersion} · {landing.meta.mode} · {landing.meta.internalExcluded}{" "}
        internal {landing.meta.internalExcluded === 1 ? "visitor" : "visitors"} excluded
      </p>
    </div>
  );
}
