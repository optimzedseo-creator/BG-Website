// ADMIN-IQ — DataSource entry point (DATA-SPEC §7.1).
// Panels/components call getSource(mode) and are written against
// AdminIqSource — they cannot tell which implementation they got.
//
// Mode selection itself is server-side and read AFTER requireAdmin() passes
// (DATA-SPEC §7.2) — that gate lives in the callers, never here.

import type { AdminIqSource, IqMode } from "./types";
import { liveSource } from "./source-live";
import { demoSource } from "./source-demo";

export function getSource(mode: IqMode): AdminIqSource {
  // Wave 4 Stage A (WP4.1): "demo" → the deterministic in-memory dataset
  // (source-demo.ts, zero Prisma import); "live" stays the Prisma source.
  // Mode is resolved server-side AFTER requireAdmin() (see mode.ts); this
  // factory never gates and never reads the cookie itself.
  return mode === "demo" ? demoSource : liveSource;
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
