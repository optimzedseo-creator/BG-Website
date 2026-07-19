import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { getSource } from "@/lib/admin/iq";
import { getCrmSource } from "@/lib/admin/crm";
import { readMode } from "@/lib/admin/iq/mode";
import { classifySource, DAY_MS, nyDateParts } from "@/lib/admin/iq/shared";
import type { SourceClass } from "@/lib/admin/iq/types";
import StatusSelect from "../StatusSelect";
import DemoBadge from "../../iq/DemoBadge";
import JourneyTimeline from "../../iq/JourneyTimeline";
import LeadDetailTabs from "./LeadDetailTabs";

export const dynamic = "force-dynamic";

function fmt(d: Date): string {
  return d.toISOString().slice(0, 16).replace("T", " ") + " UTC";
}

const SOURCE_CLASS_LABEL: Record<SourceClass, string> = {
  direct: "direct or internal",
  search: "search",
  social: "social",
  "ai-referrer": "AI referrer",
  other: "other site",
};

/** NY calendar-day key for counting distinct visit-days before contact. */
function nyDayKey(d: Date): string {
  const { y, m, d: day } = nyDateParts(d);
  return `${y}-${m}-${day}`;
}

interface SourceFacts {
  firstTouchPath: string;
  firstTouchClass: SourceClass;
  lastTouchPath: string | null;
  lastTouchClass: SourceClass | null;
  daysToDecision: number;
  hoursToDecision: number;
  visitDaysBeforeContact: number;
  viewsBeforeContact: number;
}

export default async function AdminLeadDetail({ params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) redirect("/admin/login");

  const { id } = await params;
  if (!/^[a-z0-9]{20,40}$/i.test(id)) notFound();

  // Mode resolved AFTER the gate (mode.ts invariant). Both lanes honor it: the
  // CRM lane serves the lead (PII) and its source pageviews; the analytics lane
  // serves the journey. In demo mode all three come from the synthetic dataset,
  // so this page never renders real lead PII behind a demo presentation.
  const mode = await readMode();
  const iq = getSource(mode);
  const crm = getCrmSource(mode);

  const lead = await crm.leadDetail(id);
  if (!lead) notFound();

  // Journey (WP3.4 shared component) + B4/B5 source facts. Both ride
  // Lead.visitorId, the CRM<->analytics bridge. The journey drill is a targeted
  // admin lookup, so it does NOT apply internal exclusion (Wave-3a manager
  // ratification) — pass an empty list. Source facts come from the CRM lane's
  // leadSourceViews (analytics fields path/referrer/createdAt only, no PII), so
  // this page imports neither Prisma nor the demo dataset directly; referrer /
  // path strings are rendered as TEXT ONLY, never HTML.
  const [journey, sourceViews] = await Promise.all([
    lead.visitorId
      ? iq.visitorJourney(lead.visitorId, { internalVisitorIds: [] })
      : Promise.resolve(null),
    lead.visitorId
      ? crm.leadSourceViews(lead.visitorId)
      : Promise.resolve([]),
  ]);

  // Only render Source facts when there is at least one pageview at or before
  // first contact (factcheck/database/data-analyst edge case): a visitor whose
  // views ALL postdate the brief has no honest "first touch before contact" to
  // show. When `before` is non-empty, before[0] is also the earliest pageview
  // overall (B4 first touch), so both stay correct.
  let source: SourceFacts | null = null;
  const before = sourceViews.filter((v) => v.createdAt <= lead.createdAt);
  if (before.length > 0) {
    const first = before[0];
    const last = before[before.length - 1];
    const ms = lead.createdAt.getTime() - first.createdAt.getTime();
    source = {
      firstTouchPath: first.path,
      firstTouchClass: classifySource(first.referrer),
      lastTouchPath: last.path,
      lastTouchClass: classifySource(last.referrer),
      daysToDecision: Math.max(0, Math.floor(ms / DAY_MS)),
      hoursToDecision: Math.max(0, Math.floor(ms / (60 * 60 * 1000))),
      visitDaysBeforeContact: new Set(before.map((v) => nyDayKey(v.createdAt))).size,
      viewsBeforeContact: before.length,
    };
  }

  const overview = (
    <div className="adm-grid adm-grid-detail">
      <section className="adm-card">
        <h2>Contact</h2>
        <dl className="adm-dl">
          <dt>Email</dt>
          <dd><a href={`mailto:${lead.email}`}>{lead.email}</a></dd>
          <dt>Phone</dt>
          <dd>{lead.phone || <span className="adm-unset">not provided</span>}</dd>
          <dt>Company</dt>
          <dd>{lead.company || <span className="adm-unset">not provided</span>}</dd>
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
    </div>
  );

  const journeyPanel = !lead.visitorId ? (
    <section className="adm-card adm-card-wide">
      <p className="adm-empty">
        📭 No visitor id on this lead (the form was submitted without an analytics cookie). The
        journey is unavailable.
      </p>
    </section>
  ) : journey ? (
    <section className="adm-card adm-card-wide">
      {/* On the lead's OWN page, JourneyTimeline's "became: a lead" link would
          point back to this same record — suppress it (ux P3). */}
      <JourneyTimeline data={journey} hideLeadLink />
    </section>
  ) : (
    <section className="adm-card adm-card-wide">
      <p className="adm-empty">🌙 No recorded pageviews or events for this visitor yet.</p>
    </section>
  );

  const activity = (
    <div className="adm-grid adm-grid-detail">
      <section className="adm-card">
        <h2>Timeline</h2>
        {lead.activities.length === 0 ? (
          <p className="adm-empty">🌙 No activity yet.</p>
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
          <p className="adm-empty">📭 No linked bookings yet.</p>
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
    </div>
  );

  const sourcePanel = (
    <section className="adm-card adm-card-wide">
      <h2>Source and time to decision</h2>
      {!lead.visitorId ? (
        <p className="adm-empty">
          📭 No analytics cookie on this lead, so first touch and time to decision are unavailable.
        </p>
      ) : !source ? (
        <p className="adm-empty">
          🌙 Stitched to a visitor id, but no pageviews at or before first contact.
        </p>
      ) : (
        <>
          <dl className="adm-dl adm-source-dl">
            <dt title="The earliest page this visitor landed on, and how they arrived.">
              First touch
            </dt>
            <dd>
              <span className="adm-mono">{source.firstTouchPath}</span>
              <span className="adm-source-via"> via {SOURCE_CLASS_LABEL[source.firstTouchClass]}</span>
            </dd>
            <dt title="The last page they read at or before they contacted you.">
              Last touch before contact
            </dt>
            <dd>
              <span className="adm-mono">{source.lastTouchPath}</span>
              <span className="adm-source-via"> via {SOURCE_CLASS_LABEL[source.lastTouchClass ?? "direct"]}</span>
            </dd>
            <dt title="Time from the first recorded visit to first contact. A single-lead value, not an average.">
              Time to first contact
            </dt>
            <dd className="adm-mono">
              {source.daysToDecision >= 1
                ? `${source.daysToDecision} day${source.daysToDecision === 1 ? "" : "s"} from first visit to contact`
                : `${source.hoursToDecision} hour${source.hoursToDecision === 1 ? "" : "s"} from first visit to contact`}
            </dd>
            <dt title="Distinct calendar days (America/New_York) with a pageview at or before first contact.">
              Visit days before contact
            </dt>
            <dd className="adm-mono">
              {source.visitDaysBeforeContact} day{source.visitDaysBeforeContact === 1 ? "" : "s"} ·{" "}
              {source.viewsBeforeContact} pageview{source.viewsBeforeContact === 1 ? "" : "s"}
            </dd>
          </dl>
          <p className="adm-caption">
            First and last touch come from this visitor&apos;s own pageviews (the analytics cookie
            stitched to this lead). Counts only, no rates, for one lead.
          </p>
        </>
      )}
    </section>
  );

  return (
    <div data-acc="leads">
      <div className="adm-head">
        <h1>{lead.name}</h1>
        <DemoBadge demo={mode === "demo"} />
        <Link href="/admin/leads" className="adm-back">← All leads</Link>
      </div>

      <LeadDetailTabs
        overview={overview}
        journey={journeyPanel}
        activity={activity}
        source={sourcePanel}
      />
    </div>
  );
}
