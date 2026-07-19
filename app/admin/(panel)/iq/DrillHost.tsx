"use client";

// WP3.1 — the single global drill host, mounted once in the panel layout so
// #/kpi/… , #/page/… and #/visitor/… deep-links restore their modal on ANY
// admin route (refresh-safe). One hash-router hook; the right modal renders for
// the current route and clears the hash on close.

import { useHashRoute } from "./hash-route";
import KpiModal from "./KpiModal";
import PageModal from "./PageModal";
import JourneyModal from "./JourneyModal";
import GscModal from "./GscModal";
import FunnelStepModal from "./FunnelStepModal";
import DayModal from "./DayModal";

export default function AdminDrillHost() {
  const { route, close } = useHashRoute();
  if (!route) return null;
  if (route.kind === "kpi") return <KpiModal kpiId={route.arg} onClose={close} />;
  if (route.kind === "page") return <PageModal path={route.arg} onClose={close} />;
  if (route.kind === "visitor") return <JourneyModal visitorId={route.arg} onClose={close} />;
  if (route.kind === "gsc") return <GscModal gscKind={route.gscKind} query={route.query} onClose={close} />;
  if (route.kind === "funnel") return <FunnelStepModal stepKey={route.arg} initialTab={route.tab} onClose={close} />;
  if (route.kind === "day") return <DayModal dayKey={route.arg} onClose={close} />;
  return null;
}
