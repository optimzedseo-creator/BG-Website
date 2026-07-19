// ADMIN-CRM — live CRM DataSource (Wave 4 Stage A).
//
// A lift-and-shift of the exact Prisma queries the two /admin/leads server
// components run today (leads/page.tsx findMany + leads/[id]/page.tsx
// findUnique) into the AdminCrmSource interface. Behavior is IDENTICAL — this
// factors the queries out so Stage B can swap in the demo source without
// touching the query logic.
//
// ⚠ SECURITY INVARIANT (mirrors source-live.ts): this module does NOT call
// requireAdmin(). It is called FROM the gated leads pages; every caller MUST
// await requireAdmin() first-line. This is the PII lane — the gate is not
// optional.

import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import type { AdminCrmSource, CrmLeadDetail, CrmLeadRow, CrmLeadListOpts, CrmSortKey, CrmSourceView } from "./types";

// bradley-database B3 — every findMany carries a take. Mirrors source-live.ts.
const LEAD_ROW_CAP = 10_000;
// Per-visitor pageview history is tiny; this cap is a B3 ceiling that cannot clip
// a real visitor (the old inline query on the lead page had no take — output is
// byte-identical at any real scale).
const SOURCE_VIEW_CAP = 5_000;

// Same column → orderBy map the leads list uses today (page.tsx SORT_ORDER).
const SORT_ORDER: Record<CrmSortKey, (dir: "asc" | "desc") => Prisma.LeadOrderByWithRelationInput> = {
  name: (dir) => ({ name: dir }),
  company: (dir) => ({ company: dir }),
  type: (dir) => ({ inquiryType: dir }),
  status: (dir) => ({ status: dir }),
  created: (dir) => ({ createdAt: dir }),
};

async function liveLeadList(opts: CrmLeadListOpts): Promise<CrmLeadRow[]> {
  const dir = opts.dir === "asc" ? "asc" : "desc";
  const orderBy: Prisma.LeadOrderByWithRelationInput = opts.sort ? SORT_ORDER[opts.sort](dir) : { updatedAt: "desc" };

  const leads = await prisma.lead.findMany({
    where: opts.status ? { status: opts.status } : undefined,
    orderBy,
    take: LEAD_ROW_CAP,
    select: {
      id: true,
      name: true,
      email: true,
      company: true,
      inquiryType: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      activities: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true, type: true } },
    },
  });

  return leads.map((l) => ({
    id: l.id,
    name: l.name,
    email: l.email,
    company: l.company,
    inquiryType: l.inquiryType,
    status: l.status,
    createdAt: l.createdAt,
    updatedAt: l.updatedAt,
    lastActivity: l.activities[0] ? { createdAt: l.activities[0].createdAt, type: l.activities[0].type } : null,
  }));
}

async function liveLeadDetail(id: string): Promise<CrmLeadDetail | null> {
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      activities: { orderBy: { createdAt: "desc" } },
      bookings: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!lead) return null;

  return {
    id: lead.id,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    company: lead.company,
    inquiryType: lead.inquiryType,
    message: lead.message,
    status: lead.status,
    source: lead.source,
    visitorId: lead.visitorId,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
    activities: lead.activities.map((a) => ({ id: a.id, type: a.type, body: a.body, createdAt: a.createdAt })),
    bookings: lead.bookings.map((b) => ({ id: b.id, createdAt: b.createdAt })),
  };
}

async function liveLeadSourceViews(visitorId: string): Promise<CrmSourceView[]> {
  // The exact query the lead-detail page ran inline (path/referrer/createdAt,
  // ascending) — lifted verbatim so live output is unchanged.
  return prisma.pageView.findMany({
    where: { visitorId },
    orderBy: { createdAt: "asc" },
    take: SOURCE_VIEW_CAP,
    select: { path: true, referrer: true, createdAt: true },
  });
}

export const liveCrmSource: AdminCrmSource = {
  leadList: liveLeadList,
  leadDetail: liveLeadDetail,
  leadSourceViews: liveLeadSourceViews,
};
