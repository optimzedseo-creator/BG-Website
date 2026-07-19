// Dashboard Wave PHASE 2 · WP1 — favorite (pinned) KPIs.
//
// Storage: Setting key "admin_favorite_kpis" = JSON array of CommandKpiId
// strings, capped at 6 (the favorites strip pins starred KPIs at the top of
// the canvas; an empty list renders nothing in view mode — ux spec KB 1519).
// This mirrors the internal_visitor_ids pattern exactly: a tiny single-owner
// K/V row, tolerant read (malformed/legacy values degrade to [], never throw),
// whitelist-validated write.
//
// NOTE the deliberate asymmetry with dashboards: favorites are a 6-item id
// list — K/V-shaped config, fine in Setting. Dashboard LAYOUTS are client-
// shaped JSON blobs and live in their OWN Dashboard table, never here
// (security ruling: Setting holds auth secrets; layout writes must not share
// that write path).
//
// ⚠ SECURITY INVARIANT: these helpers do NOT gate. Every caller (the
// dashboard-actions server actions) MUST await requireAdmin() first-line
// before touching this module.

import "server-only";
import { getSetting, setSetting } from "@/lib/admin/auth";
import type { CommandKpiId } from "./types";
import { MAX_FAVORITE_KPIS, isCommandKpiId } from "./widgets";

/** Setting key. */
export const K_FAVORITE_KPIS = "admin_favorite_kpis";

/** Cap re-exported from the (client-safe) widget contract module — the WP2
 * canvas imports it from there; ONE copy either way. */
export { MAX_FAVORITE_KPIS };

/** Whitelist + dedupe + cap, from any untrusted value. Order is preserved
 * (the strip renders in favorite order). */
export function sanitizeFavoriteKpis(raw: unknown): CommandKpiId[] {
  if (!Array.isArray(raw)) return [];
  const out: CommandKpiId[] = [];
  for (const v of raw) {
    if (isCommandKpiId(v) && !out.includes(v)) out.push(v);
    if (out.length >= MAX_FAVORITE_KPIS) break;
  }
  return out;
}

/** The current favorites list. Malformed/legacy values degrade to []. */
export async function readFavoriteKpis(): Promise<CommandKpiId[]> {
  const raw = await getSetting(K_FAVORITE_KPIS);
  if (!raw) return [];
  try {
    return sanitizeFavoriteKpis(JSON.parse(raw));
  } catch {
    return [];
  }
}

/** Persist a sanitized list; returns what was actually stored (the caller
 * echoes it back so the UI state can never drift from the row). */
export async function writeFavoriteKpis(raw: unknown): Promise<CommandKpiId[]> {
  const ids = sanitizeFavoriteKpis(raw);
  await setSetting(K_FAVORITE_KPIS, JSON.stringify(ids));
  return ids;
}
