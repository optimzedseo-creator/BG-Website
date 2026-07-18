import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/auth";
import StatusSelect from "./StatusSelect";

export const dynamic = "force-dynamic";

function fmt(d: Date): string {
  return d.toISOString().slice(0, 16).replace("T", " ");
}

export default async function AdminLeadsPage() {
  if (!(await requireAdmin())) redirect("/admin/login");

  const leads = await prisma.lead.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      activities: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true, type: true } },
    },
  });

  return (
    <div data-acc="leads">
      <div className="adm-head">
        <h1>Leads</h1>
        <span className="adm-count">{leads.length} total</span>
      </div>

      {leads.length === 0 ? (
        <section className="adm-card adm-card-wide">
          <p className="adm-empty">📭 No leads yet. Contact-form submissions land here automatically.</p>
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
