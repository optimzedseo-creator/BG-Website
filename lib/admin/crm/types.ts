// ADMIN-CRM — the PII lane's type contract (Wave 4 Stage A).
//
// This is the DELIBERATE home of lead PII (name / email / phone / company /
// message). It is SEPARATE from lib/admin/iq/* by design: keeping the CRM
// surface out of the analytics module is what makes the PII firewall STRUCTURAL
// (DATA-SPEC §4.4 / §7.1) — an AdminIqSource return type can never carry a PII
// field because these types do not live there.
//
// One interface, two implementations (live via Prisma, demo from the shared
// synthetic dataset). The two /admin/leads server components are written against
// this interface so Stage B can flip them between real and demo leads with the
// mode cookie, exactly like the analytics lane.
//
// Field shapes MATCH what the two leads pages render today (Date, not ISO — the
// pages are server components that format Date directly; keeping Date here makes
// the Stage-B rewire a lift, not a reshape).

/** Sortable columns on the leads list (mirror leads/page.tsx SORT_ORDER). */
export type CrmSortKey = "name" | "company" | "type" | "status" | "created";

export interface CrmLeadListOpts {
  /** Pipeline-stage filter; null/undefined = all leads. */
  status?: string | null;
  /** Sort column; null/undefined = default (most recently touched). */
  sort?: CrmSortKey | null;
  /** Sort direction; ignored when sort is absent. */
  dir?: "asc" | "desc";
}

/** The most recent logged activity, shown in the list's "Last activity" cell. */
export interface CrmLastActivity {
  createdAt: Date;
  type: string;
}

/** One row of the leads list (leads/page.tsx). Carries PII (name/email/company). */
export interface CrmLeadRow {
  id: string;
  name: string;
  email: string;
  company: string | null;
  inquiryType: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  lastActivity: CrmLastActivity | null;
}

/** One activity row on the lead detail timeline. */
export interface CrmActivityRow {
  id: string;
  type: string;
  body: string;
  createdAt: Date;
}

/** One booking row on the lead detail page. */
export interface CrmBookingRow {
  id: string;
  createdAt: Date;
}

/** Raw pageview row for the lead-detail "Source & time to decision" facts (B4/B5).
 *  These are ANALYTICS fields (path/referrer/createdAt), not PII, but they live in
 *  the CRM lane because the lead-detail page computes the facts there (it already
 *  holds PII) and so the page never imports Prisma or the demo dataset directly. */
export interface CrmSourceView {
  path: string;
  referrer: string | null;
  createdAt: Date;
}

/** Full lead detail (leads/[id]/page.tsx). Carries all PII. */
export interface CrmLeadDetail {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  inquiryType: string;
  message: string;
  status: string;
  source: string;
  /** The analytics bridge — anonymous visitor id (NOT PII); null when cookieless. */
  visitorId: string | null;
  createdAt: Date;
  updatedAt: Date;
  activities: CrmActivityRow[];
  bookings: CrmBookingRow[];
}

/** One interface, two implementations. The leads pages are written against it. */
export interface AdminCrmSource {
  /** Sortable, status-filterable leads list with each lead's last activity. */
  leadList(opts: CrmLeadListOpts): Promise<CrmLeadRow[]>;
  /** Full lead detail (activities + bookings), or null when the id is unknown. */
  leadDetail(id: string): Promise<CrmLeadDetail | null>;
  /** All pageviews for a visitor, oldest first — feeds the lead-detail B4/B5
   *  source-and-time-to-decision facts (analytics fields only, no PII). */
  leadSourceViews(visitorId: string): Promise<CrmSourceView[]>;
}
