// ADMIN-IQ — internal-traffic exclusion list (DATA-SPEC §5.3, WP1.5).
//
// Mechanism: READ-TIME visitorId exclusion, never a write-time flag and never
// a delete — analytics rows stay intact and auditable; the list is applied as
// NOT IN inside source-live.ts, so exclusion is part of every visitor-scoped
// metric's DEFINITION. Retroactive by construction: the moment an id lands on
// the list, its past visits leave every number.
//
// Storage: Setting key "internal_visitor_ids" = JSON array of visitorIds
// (no schema change; §5.3 caps it at ~50 — past that, revisit with a
// PageView column + backfill migration, not a bigger list).
//
// ⚠ SECURITY INVARIANT: these helpers do NOT gate. Every caller (the panel
// layout's auto-capture, /admin/security server actions) MUST await
// requireAdmin() first-line before touching this module.

import "server-only";
import { getSetting, setSetting } from "@/lib/admin/auth";

// bg_vid id-shape contract — imported from the tracking contract's single
// source of truth (Wave 2 dedupe, bradley-api Change 3): @/lib/track exports
// VISITOR_ID_RE, and the three API routes derive their cookie matcher from
// the same constant, so exclusion-list validation can never drift from what
// /api/track actually sets.
import { VISITOR_ID_RE } from "@/lib/track";

/** The first-party visitor cookie set/read by /api/track — re-exported from the
 * tracking contract's single source of truth (@/lib/track), never re-declared. */
export { VISITOR_COOKIE } from "@/lib/track";

/** Setting key (DATA-SPEC §5.3). */
export const K_INTERNAL_VISITOR_IDS = "internal_visitor_ids";

/** §5.3 cap — a bigger list means the mechanism is wrong, not the cap. */
export const MAX_INTERNAL_IDS = 50;

export function isValidVisitorId(id: string): boolean {
  return VISITOR_ID_RE.test(id);
}

/** The current exclusion list. Malformed/legacy values degrade to [] — never throw on a Setting row. */
export async function readInternalVisitorIds(): Promise<string[]> {
  const raw = await getSetting(K_INTERNAL_VISITOR_IDS);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string" && isValidVisitorId(v));
  } catch {
    return [];
  }
}

export type AddInternalResult = "added" | "already-listed" | "invalid" | "list-full";

/**
 * Read-check-append. Writes ONLY when the id is new (the layout auto-capture
 * calls this per admin request — repeat requests must not churn the row).
 */
export async function addInternalVisitorId(id: string): Promise<AddInternalResult> {
  if (!isValidVisitorId(id)) return "invalid";
  const ids = await readInternalVisitorIds();
  if (ids.includes(id)) return "already-listed";
  if (ids.length >= MAX_INTERNAL_IDS) return "list-full";
  await setSetting(K_INTERNAL_VISITOR_IDS, JSON.stringify([...ids, id]));
  return "added";
}

/** Remove one id from the list. Removing only changes the metric definition — no analytics rows are touched, ever. */
export async function removeInternalVisitorId(id: string): Promise<void> {
  const ids = await readInternalVisitorIds();
  if (!ids.includes(id)) return;
  await setSetting(K_INTERNAL_VISITOR_IDS, JSON.stringify(ids.filter((v) => v !== id)));
}
