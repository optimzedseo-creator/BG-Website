import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { getSource } from "@/lib/admin/iq";
import { getCrmSource } from "@/lib/admin/crm";
import { readMode } from "@/lib/admin/iq/mode";
import {
  DAY_MS,
  buildIqQuery,
  parsePeriodParam,
  RULE_LEAD_SLA_DAYS,
  withPeriodGrammar,
} from "@/lib/admin/iq/shared";
import StatusSelect from "./StatusSelect";
import LeadDonuts from "./LeadDonuts";
import DemoBadge from "../iq/DemoBadge";

export const dynamic = "force-dynamic";

function fmt(d: Date): string {
  return d.toISOString().slice(0, 16).replace("T", " ");
}

// Fixed status vocabulary (Phase-3 contract) — anything else clears the filter.
const STATUSES = new Set(["new", "contacted", "call_booked", "qualified", "won", "lost"]);

// WP3.5 sortable headers. Each key maps to ONE Prisma orderBy; unknown/absent
// sort falls back to the default (most recently touched). Sorting only reorders
// PII the CRM page already shows — no new data crosses any boundary.
type SortKey = "name" | "company" | "type" | "status" | "created";
const SORT_KEYS = new Set<SortKey>(["name", "company", "type", "status", "created"]);

// SLA threshold is interpolated from the ONE constant (factcheck/content: no
// hardcoded "3" that silently drifts if RULE_LEAD_SLA_DAYS changes).
const HEAD_TITLES: Record<string, string> = {
  name: "Contact name. Click a row to open the full lead.",
  company: "Company from the contact form, if provided.",
  type: "Inquiry type chosen on the contact form.",
  status: `Pipeline stage. A lead left in 'new' past ${RULE_LEAD_SLA_DAYS} days turns amber.`,
  created: "When the contact form was submitted (UTC).",
  activity: "Most recent logged activity on this lead.",
};

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    p?: string;
    period?: string;
    compare?: string;
    from?: string;
    to?: string;
    cmpFrom?: string;
    cmpTo?: string;
    sort?: string;
    dir?: string;
  }>;
}) {
  if (!(await requireAdmin())) redirect("/admin/login");

  // PERIOD-UI wave: the period grammar doesn't cut this page (the list and
  // BOTH donuts are all-time snapshots — standing data-analyst rule: NO period
  // delta on leadsByStatus) but is parsed tolerantly and carried through every
  // outbound link so the global period never silently resets (ux U5). No
  // compare control here either — nothing on this page compares anything.
  const sp = await searchParams;
  const { status: rawStatus, sort: rawSort, dir: rawDir } = sp;
  const status = rawStatus && STATUSES.has(rawStatus) ? rawStatus : null;
  const pp = parsePeriodParam(sp);
  // Grammar fragment every link on this page carries (defaults omitted;
  // window forced to 30 so a dormant legacy ?p= never re-enters a URL).
  const grammarQs = buildIqQuery(30, {}, pp);

  const sort = rawSort && SORT_KEYS.has(rawSort as SortKey) ? (rawSort as SortKey) : null;
  const dir: "asc" | "desc" = rawDir === "asc" ? "asc" : rawDir === "desc" ? "desc" : sort === "name" ? "asc" : "desc";

  // Wave 4 Stage B: the leads list rides the CRM lane (live = the exact same
  // Prisma queries, lift-and-shifted; demo = the synthetic leads). Donut counts
  // stay on the PII-free analytics source. Both honor the session mode.
  const mode = await readMode();
  const iq = getSource(mode);
  const crm = getCrmSource(mode);
  const [leads, byInquiryType, byStatus] = await Promise.all([
    crm.leadList({ status, sort, dir }),
    iq.leadsByInquiryType(),
    iq.leadsByStatus(),
  ]);

  // Sortable-header link: preserves ?status= and the period grammar, toggles
  // direction when the column is already active, stays keyboard-reachable.
  function sortHref(key: SortKey): string {
    const nextDir = sort === key && dir === "asc" ? "desc" : "asc";
    const q = new URLSearchParams(grammarQs);
    if (status) q.set("status", status);
    q.set("sort", key);
    q.set("dir", nextDir);
    return `/admin/leads?${q.toString()}`;
  }
  function ariaSort(key: SortKey): "ascending" | "descending" | "none" {
    if (sort !== key) return "none";
    return dir === "asc" ? "ascending" : "descending";
  }
  function SortHead({ label, sortKey }: { label: string; sortKey: SortKey }) {
    const active = sort === sortKey;
    return (
      <th aria-sort={ariaSort(sortKey)} title={`${HEAD_TITLES[sortKey]} Click to sort.`}>
        <Link href={sortHref(sortKey)} className={`adm-th-sort${active ? " on" : ""}`}>
          {label}
          {/* Every sortable header carries a glyph: a dimmed ↕ advertises
              sortability, brightening to ↑/↓ on the active column (ux: obvious
              over subtle). */}
          <span className={`adm-th-arrow${active ? "" : " idle"}`} aria-hidden="true">
            {active ? (dir === "asc" ? "↑" : "↓") : "↕"}
          </span>
        </Link>
      </th>
    );
  }

  const now = Date.now();
  const slaMs = RULE_LEAD_SLA_DAYS * DAY_MS;

  return (
    <div data-acc="leads">
      <div className="adm-head">
        <h1>🤝 Leads</h1>
        <DemoBadge demo={mode === "demo"} />
        <span className="adm-count">
          {status ? (
            <>
              {leads.length} in {status.replace("_", " ")} ·{" "}
              <Link href={withPeriodGrammar("/admin/leads", pp)} className="adm-back">show all</Link>
            </>
          ) : (
            `${leads.length} total · all time`
          )}
        </span>
      </div>

      {/* UX §8 — leads module demo affordance: name the data plainly. */}
      {mode === "demo" && (
        <p className="adm-demo-note" role="note">
          ◐ All names, emails, companies, and messages below are synthetic demo data. Not real people.
        </p>
      )}

      <LeadDonuts byInquiryType={byInquiryType} byStatus={byStatus} />

      {leads.length === 0 ? (
        <section className="adm-card adm-card-wide">
          <p className="adm-empty">
            {status
              ? `📭 No leads in "${status.replace("_", " ")}" right now. Statuses update from the list or the lead page.`
              : "📭 No leads yet. Contact-form submissions land here automatically."}
          </p>
        </section>
      ) : (
        <section className="adm-card adm-card-wide">
          {/* Scroll container INSIDE the card so the 3px accent keyline
              (card ::before) stays fixed while the table pans at 375. */}
          <div className="adm-table-wrap">
          <table className="adm-table adm-table--stickycol">
            <thead>
              <tr>
                <SortHead label="Name" sortKey="name" />
                <SortHead label="Company" sortKey="company" />
                <SortHead label="Type" sortKey="type" />
                <SortHead label="Status" sortKey="status" />
                <SortHead label="Created" sortKey="created" />
                <th title={HEAD_TITLES.activity}>Last activity</th>
                <th aria-hidden="true" />
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => {
                const overdue = lead.status === "new" && now - lead.createdAt.getTime() > slaMs;
                const ageDays = Math.floor((now - lead.createdAt.getTime()) / DAY_MS);
                return (
                  <tr key={lead.id} className={overdue ? "adm-lead-row--sla" : undefined}>
                    <td>
                      <Link href={`/admin/leads/${lead.id}`} className="adm-lead-link">
                        {lead.name}
                      </Link>
                      <span className="adm-sub">{lead.email}</span>
                      {/* SLA signal ALSO in the sticky name cell so it survives
                          the horizontal scroll at 375, where Created scrolls
                          off (ux). Text + amber, never color-only. */}
                      {overdue ? (
                        <span
                          className="adm-sla-tag"
                          title={`In 'new' for ${ageDays} days (threshold ${RULE_LEAD_SLA_DAYS}). Follow up.`}
                        >
                          aging · {ageDays}d
                        </span>
                      ) : null}
                    </td>
                    <td>{lead.company || <span className="adm-unset">not provided</span>}</td>
                    <td>{lead.inquiryType}</td>
                    <td>
                      <StatusSelect leadId={lead.id} status={lead.status} />
                    </td>
                    <td
                      className={`adm-mono${overdue ? " adm-sla-cell" : ""}`}
                      title={overdue ? `In 'new' for ${ageDays} days (threshold ${RULE_LEAD_SLA_DAYS}). Follow up.` : undefined}
                    >
                      {fmt(lead.createdAt)}
                      {overdue ? <span className="adm-sla-flag"> · {ageDays}d</span> : null}
                    </td>
                    <td className="adm-mono">
                      {lead.lastActivity
                        ? `${fmt(lead.lastActivity.createdAt)} (${lead.lastActivity.type})`
                        : <span className="adm-unset">none yet</span>}
                    </td>
                    {/* Full-row click restored under the sticky first column:
                        the overlay lives on THIS non-sticky trailing cell, so
                        its inset:0 anchors to the position:relative <tr> (not
                        the sticky name cell). The name link stays the real
                        keyboard/SR target; this overlay is mouse-only. */}
                    <td className="adm-rowgo" aria-hidden="true">
                      <Link
                        href={`/admin/leads/${lead.id}`}
                        className="adm-row-open"
                        tabIndex={-1}
                        aria-hidden="true"
                      >
                        →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </section>
      )}
    </div>
  );
}
