// ADMIN-CRM — demo CRM DataSource (Wave 4 Stage A).
//
// Builds CrmLeadRow / CrmLeadDetail from the SAME synthetic entities the
// analytics demo source generates (imported from ../iq/source-demo). Because a
// demo lead's CRM row and its analytics journey are the SAME person — same
// visitorId — the leads/[id] Journey tab reconciles with the CRM row (Stage B).
//
// ⚠ HARD RULE — NO DATABASE. This file imports NOTHING from @/lib/db (or
// @prisma/client at runtime): its only cross-module import is the demo dataset
// getter, which is itself DB-free. The generator stays single-sourced (in
// lib/admin/iq/source-demo.ts) so the two demo lanes can never drift.

import { getDemoDataset } from "../iq/source-demo";
import type { DemoLead } from "../iq/source-demo";
import type { AdminCrmSource, CrmLeadDetail, CrmLeadRow, CrmLeadListOpts, CrmSortKey, CrmSourceView } from "./types";

/** Most-recent activity for a lead (mirrors the live `take: 1` orderBy desc). */
function lastActivityFor(leadId: string) {
  const ds = getDemoDataset();
  let best: { createdAt: Date; type: string } | null = null;
  for (const a of ds.activities) {
    if (a.leadId !== leadId) continue;
    if (!best || a.createdAt.getTime() > best.createdAt.getTime()) best = { createdAt: a.createdAt, type: a.type };
  }
  return best;
}

/** In-memory comparator mirroring the live orderBy (default: updatedAt desc).
 *  Null company sorts last (matches Postgres NULLS LAST for the common asc path;
 *  demo ordering is cosmetic, not a guardrail). */
function sortLeads(leads: DemoLead[], sort: CrmSortKey | null | undefined, dir: "asc" | "desc"): DemoLead[] {
  const mult = dir === "asc" ? 1 : -1;
  const out = [...leads];
  const cmpStr = (a: string, b: string) => a.localeCompare(b);
  if (!sort) {
    out.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    return out;
  }
  out.sort((a, b) => {
    switch (sort) {
      case "name":
        return mult * cmpStr(a.name, b.name);
      case "company": {
        if (!a.company && !b.company) return 0;
        if (!a.company) return 1; // nulls last
        if (!b.company) return -1;
        return mult * cmpStr(a.company, b.company);
      }
      case "type":
        return mult * cmpStr(a.inquiryType, b.inquiryType);
      case "status":
        return mult * cmpStr(a.status, b.status);
      case "created":
        return mult * (a.createdAt.getTime() - b.createdAt.getTime());
      default:
        return 0;
    }
  });
  return out;
}

async function demoLeadList(opts: CrmLeadListOpts): Promise<CrmLeadRow[]> {
  const ds = getDemoDataset();
  const dir = opts.dir === "asc" ? "asc" : "desc";
  const filtered = opts.status ? ds.leads.filter((l) => l.status === opts.status) : ds.leads;
  const sorted = sortLeads(filtered, opts.sort ?? null, dir);
  return sorted.map((l) => ({
    id: l.id,
    name: l.name,
    email: l.email,
    company: l.company,
    inquiryType: l.inquiryType,
    status: l.status,
    createdAt: l.createdAt,
    updatedAt: l.updatedAt,
    lastActivity: lastActivityFor(l.id),
  }));
}

async function demoLeadDetail(id: string): Promise<CrmLeadDetail | null> {
  const ds = getDemoDataset();
  const lead = ds.leads.find((l) => l.id === id) ?? null;
  if (!lead) return null;

  const activities = ds.activities
    .filter((a) => a.leadId === id)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((a) => ({ id: a.id, type: a.type, body: a.body, createdAt: a.createdAt }));
  const bookings = ds.bookings
    .filter((b) => b.leadId === id)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((b) => ({ id: b.id, createdAt: b.createdAt }));

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
    activities,
    bookings,
  };
}

async function demoLeadSourceViews(visitorId: string): Promise<CrmSourceView[]> {
  return getDemoDataset()
    .pageViews.filter((v) => v.visitorId === visitorId)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((v) => ({ path: v.path, referrer: v.referrer, createdAt: v.createdAt }));
}

export const demoCrmSource: AdminCrmSource = {
  leadList: demoLeadList,
  leadDetail: demoLeadDetail,
  leadSourceViews: demoLeadSourceViews,
};
