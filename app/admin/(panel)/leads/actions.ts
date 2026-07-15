"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/auth";

// Status values are FIXED (Phase-3 contract in prisma/schema.prisma) and never
// client-extensible — anything outside this list is rejected.
const STATUSES = new Set(["new", "contacted", "call_booked", "qualified", "won", "lost"]);

export async function updateLeadStatus(
  leadId: string,
  status: string
): Promise<{ ok?: true; error?: string }> {
  if (!(await requireAdmin())) return { error: "Unauthorized" };

  if (typeof leadId !== "string" || !/^[a-z0-9]{20,40}$/i.test(leadId)) {
    return { error: "Bad request" };
  }
  if (typeof status !== "string" || !STATUSES.has(status)) {
    return { error: "Invalid status" };
  }

  const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { status: true } });
  if (!lead) return { error: "Lead not found" };
  if (lead.status === status) return { ok: true };

  // Update + timeline entry atomically (Activity type "status" per contract).
  await prisma.$transaction([
    prisma.lead.update({ where: { id: leadId }, data: { status } }),
    prisma.activity.create({
      data: { leadId, type: "status", body: `${lead.status} → ${status}` },
    }),
  ]);

  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${leadId}`);
  return { ok: true };
}
