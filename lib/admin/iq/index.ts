// ADMIN-IQ — DataSource entry point (DATA-SPEC §7.1).
// Panels/components call getSource(mode) and are written against
// AdminIqSource — they cannot tell which implementation they got.
//
// Mode selection itself is server-side and read AFTER requireAdmin() passes
// (DATA-SPEC §7.2) — that gate lives in the callers, never here.

import type { AdminIqSource, IqMode } from "./types";
import { liveSource } from "./source-live";

export function getSource(mode: IqMode): AdminIqSource {
  if (mode === "live") return liveSource;
  // Wave 4 (WP4.1): source-demo.ts — deterministic in-memory dataset,
  // zero Prisma import. Until it lands, demo mode is a loud failure,
  // never a silent fallback to live data.
  throw new Error(
    'ADMIN-IQ: demo source is not implemented yet (lands Wave 4, WP4.1). Only mode "live" is available.'
  );
}

export type {
  AdminIqSource,
  CommandKpiId,
  Filters,
  FunnelStepKey,
  GscDetailKind,
  IqActivity,
  IqCommand,
  IqDayDetail,
  IqFunnelStep,
  IqGscDetail,
  IqKpiDetail,
  IqLanding,
  IqMode,
  IqPageDetail,
  IqSummary,
  IqVisitorJourney,
  SourceOpts,
} from "./types";
