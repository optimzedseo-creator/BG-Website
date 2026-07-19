import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { readMode } from "@/lib/admin/iq/mode";
import DemoBadge from "../iq/DemoBadge";

export const dynamic = "force-dynamic";

/*
 * WP3.10 Reports catalog (Brad-requested) — a grouped index over surfaces that
 * already ship this wave. Pure navigation: NO new metrics, NO new queries. Rows
 * whose target isn't shipped this increment simply do not render (no dead
 * affordances). Wave 3b surfaces (lead attribution restructure, GSC intent
 * drills) are intentionally omitted until they land.
 */

interface Report {
  label: string;
  blurb: string;
  href: string;
}

const GROUPS: { group: string; reports: Report[] }[] = [
  {
    group: "Acquisition",
    reports: [
      { label: "Leads", blurb: "The CRM pipeline by status.", href: "/admin/leads" },
      {
        label: "Form submissions",
        blurb: "Every brief in the activity log, newest first.",
        href: "/admin/activity?kind=form_submit",
      },
      {
        label: "Bookings",
        blurb: "Calendly captures in the activity log.",
        href: "/admin/activity?kind=booking",
      },
    ],
  },
  {
    group: "Behavior",
    reports: [
      { label: "Visits by day", blurb: "Visitors and pageviews over time.", href: "/admin/traffic" },
      { label: "Pages", blurb: "Every path, with drill-down to its detail.", href: "/admin/content" },
      {
        label: "Key terms spotted",
        blurb: "Search Console queries and intent buckets.",
        href: "/admin/search",
      },
      { label: "Search performance", blurb: "Impressions, clicks, branded split.", href: "/admin/search" },
    ],
  },
];

export default async function ReportsPage() {
  if (!(await requireAdmin())) redirect("/admin/login");
  const mode = await readMode();

  return (
    <div data-acc="overview">
      <div className="adm-head">
        <h1>📁 Reports</h1>
        <DemoBadge demo={mode === "demo"} />
        <span className="adm-count">jump into a saved view</span>
      </div>

      <div className="adm-reports">
        {GROUPS.map((g) => (
          <section key={g.group} className="adm-card adm-card-wide">
            <h2>{g.group}</h2>
            <ul className="adm-report-list">
              {g.reports.map((r) => (
                <li key={r.label}>
                  <Link href={r.href} className="adm-report-row">
                    <span className="adm-report-label">{r.label}</span>
                    <span className="adm-report-blurb">{r.blurb}</span>
                    <span className="adm-go" aria-hidden="true">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="adm-caption">
        Each report opens a live surface built this wave. More reports arrive as their surfaces ship.
      </p>
    </div>
  );
}
