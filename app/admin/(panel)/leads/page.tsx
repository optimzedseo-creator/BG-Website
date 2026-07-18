import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/auth";
import { getSource } from "@/lib/admin/iq";
import { parseWindowParam, withPeriod } from "@/lib/admin/iq/shared";
import StatusSelect from "./StatusSelect";
import LeadDonuts from "./LeadDonuts";

export const dynamic = "force-dynamic";

function fmt(d: Date): string {
  return d.toISOString().slice(0, 16).replace("T", " ");
}

// Fixed status vocabulary (Phase-3 contract) — anything else clears the filter.
const STATUSES = new Set(["new", "contacted", "call_booked", "qualified", "won", "lost"]);

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; p?: string }>;
}) {
  if (!(await requireAdmin())) redirect("/admin/login");

  // WP2.1 Brad addendum (Builder Prime pattern): the rail's status sub-items
  // link here with ?status=X and the table filters accordingly; "All leads"
  // clears it. Unknown values fall back to unfiltered — tolerant parsing.
  // ?p= doesn't cut this list (leads are all-time) but is carried through
  // outbound links so the global period never silently resets (ux U5).
  const { status: rawStatus, p } = await searchParams;
  const status = rawStatus && STATUSES.has(rawStatus) ? rawStatus : null;
  const period = parseWindowParam(p);

  // Donut data rides the PII-free analytics lane (counts only). The donuts
  // always show ALL leads — filtering them by the ?status= list filter would
  // be circular (they ARE the status overview).
  const iq = getSource("live");
  const [leads, byInquiryType, byStatus] = await Promise.all([
    prisma.lead.findMany({
      where: status ? { status } : undefined,
      orderBy: { updatedAt: "desc" },
      include: {
        activities: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true, type: true } },
      },
    }),
    iq.leadsByInquiryType(),
    iq.leadsByStatus(),
  ]);

  return (
    <div data-acc="leads">
      <div className="adm-head">
        <h1>🤝 Leads</h1>
        <span className="adm-count">
          {status ? (
            <>
              {leads.length} in {status.replace("_", " ")} ·{" "}
              <Link href={withPeriod("/admin/leads", period)} className="adm-back">show all</Link>
            </>
          ) : (
            `${leads.length} total`
          )}
        </span>
      </div>

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
          <table className="adm-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Company</th>
                <th>Type</th>
                <th>Status</th>
                <th>Created</th>
                <th>Last activity</th>
                <th aria-hidden="true" />
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td>
                    <Link href={`/admin/leads/${lead.id}`} className="adm-lead-link">
                      {lead.name}
                    </Link>
                    <span className="adm-sub">{lead.email}</span>
                  </td>
                  <td>{lead.company || "—"}</td>
                  <td>{lead.inquiryType}</td>
                  <td>
                    <StatusSelect leadId={lead.id} status={lead.status} />
                  </td>
                  <td className="adm-mono">{fmt(lead.createdAt)}</td>
                  <td className="adm-mono">
                    {lead.activities[0] ? `${fmt(lead.activities[0].createdAt)} (${lead.activities[0].type})` : "—"}
                  </td>
                  <td className="adm-go" aria-hidden="true">→</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </section>
      )}
    </div>
  );
}
