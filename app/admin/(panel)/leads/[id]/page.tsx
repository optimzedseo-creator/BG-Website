import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/auth";
import StatusSelect from "../StatusSelect";

export const dynamic = "force-dynamic";

function fmt(d: Date): string {
  return d.toISOString().slice(0, 16).replace("T", " ") + " UTC";
}

function durationLabel(s: number | null): string {
  if (!s) return "";
  return s >= 60 ? ` · ${Math.floor(s / 60)}m ${s % 60}s` : ` · ${s}s`;
}

function refHost(ref: string | null): string | null {
  if (!ref) return null;
  try {
    const host = new URL(ref).hostname.replace(/^www\./, "");
    return host === "bradleygriffin.us" ? null : host;
  } catch {
    return ref.slice(0, 60);
  }
}

type JourneyItem = { at: Date; kind: "view" | "event"; label: string; detail: string };

export default async function AdminLeadDetail({ params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) redirect("/admin/login");

  const { id } = await params;
  if (!/^[a-z0-9]{20,40}$/i.test(id)) notFound();

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      activities: { orderBy: { createdAt: "desc" } },
      bookings: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!lead) notFound();

  // Visitor journey — "what they read before reaching out" (Lead.visitorId is
  // the CRM–analytics bridge, BACKEND-PLAN.md §3). Rendered as TEXT ONLY:
  // referrer/path strings are attacker-supplied and must never become HTML.
  let journey: JourneyItem[] = [];
  if (lead.visitorId) {
    const [views, events] = await Promise.all([
      prisma.pageView.findMany({
        where: { visitorId: lead.visitorId },
        orderBy: { createdAt: "asc" },
        select: { path: true, referrer: true, duration: true, device: true, country: true, createdAt: true },
      }),
      prisma.event.findMany({
        where: { visitorId: lead.visitorId },
        orderBy: { createdAt: "asc" },
        select: { name: true, path: true, meta: true, createdAt: true },
      }),
    ]);
    journey = [
      ...views.map((v): JourneyItem => {
        const from = refHost(v.referrer);
        return {
          at: v.createdAt,
          kind: "view",
          label: `Read ${v.path}`,
          detail: `${from ? `via ${from}` : "direct/internal"}${durationLabel(v.duration)}${v.device ? ` · ${v.device}` : ""}${v.country ? ` · ${v.country}` : ""}`,
        };
      }),
      ...events.map((e): JourneyItem => {
        const meta =
          e.meta && typeof e.meta === "object" && !Array.isArray(e.meta)
            ? Object.entries(e.meta as Record<string, unknown>)
                .map(([k, v]) => `${k}: ${String(v)}`)
                .join(", ")
            : "";
        return { at: e.createdAt, kind: "event", label: e.name, detail: `${e.path}${meta ? ` · ${meta}` : ""}` };
      }),
    ].sort((a, b) => a.at.getTime() - b.at.getTime());
  }

  return (
    <>
      <div className="adm-head">
        <h1>{lead.name}</h1>
        <Link href="/admin/leads" className="adm-back">← All leads</Link>
      </div>

      <div className="adm-grid adm-grid-detail">
        <section className="adm-card">
          <h2>Contact</h2>
          <dl className="adm-dl">
            <dt>Email</dt>
            <dd><a href={`mailto:${lead.email}`}>{lead.email}</a></dd>
            <dt>Phone</dt>
            <dd>{lead.phone || "—"}</dd>
            <dt>Company</dt>
            <dd>{lead.company || "—"}</dd>
            <dt>Inquiry</dt>
            <dd>{lead.inquiryType}</dd>
            <dt>Status</dt>
            <dd><StatusSelect leadId={lead.id} status={lead.status} /></dd>
            <dt>Source</dt>
            <dd>{lead.source}</dd>
            <dt>First contact</dt>
            <dd className="adm-mono">{fmt(lead.createdAt)}</dd>
          </dl>
        </section>

        <section className="adm-card">
          <h2>Latest message</h2>
          <p className="adm-message">{lead.message}</p>
        </section>

        <section className="adm-card">
          <h2>Timeline</h2>
          {lead.activities.length === 0 ? (
            <p className="adm-empty">No activity yet.</p>
          ) : (
            <ol className="adm-timeline">
              {lead.activities.map((a) => (
                <li key={a.id} className={`adm-tl-${a.type}`}>
                  <span className="adm-tl-type">{a.type}</span>
                  <span className="adm-tl-body">{a.body}</span>
                  <span className="adm-mono adm-tl-at">{fmt(a.createdAt)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="adm-card">
          <h2>Bookings</h2>
          {lead.bookings.length === 0 ? (
            <p className="adm-empty">No linked bookings.</p>
          ) : (
            <ul className="adm-list">
              {lead.bookings.map((b) => (
                <li key={b.id}>
                  <span>Calendly booking captured</span>
                  <span className="adm-mono">{fmt(b.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="adm-card adm-card-wide">
          <h2>Visitor journey</h2>
          {!lead.visitorId ? (
            <p className="adm-empty">No visitor id on this lead (form was submitted without an analytics cookie).</p>
          ) : journey.length === 0 ? (
            <p className="adm-empty">No recorded pageviews or events for this visitor.</p>
          ) : (
            <ol className="adm-journey">
              {journey.map((j, i) => (
                <li key={i} className={`adm-j-${j.kind}`}>
                  <span className="adm-mono adm-j-at">{fmt(j.at)}</span>
                  <span className="adm-j-label">{j.label}</span>
                  <span className="adm-j-detail">{j.detail}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </>
  );
}
