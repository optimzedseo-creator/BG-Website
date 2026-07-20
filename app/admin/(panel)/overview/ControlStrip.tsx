"use client";

import CompareControl from "../CompareControl";
import type { PeriodSignal } from "../period-bus";

/*
 * PERIOD-UI wave — the overview control strip is now COMPARE-ONLY (plus the
 * Phase-2 view controls). Period selection moved to the top-bar PeriodSwitch
 * (Today · WTD · MTD · QTD · YTD · Custom) — ONE obvious owner per concern,
 * so two period controls can never fight (the WP2 pill's period half is
 * retired; its compare half lives on as the shared CompareControl).
 */
export default function ControlStrip({
  params,
  compareLabel,
  loading,
  viewSlot,
}: {
  params: PeriodSignal;
  /** The payload's PeriodEcho.compareLabel — what the source actually compared
   * against ("prior month", "same dates last year"); null when compare is off. */
  compareLabel: string | null;
  /** A refetch is in flight (ux #11): the payload echo is STALE for the freshly
   * picked params, so the pill falls back to the client hint until it lands. */
  loading: boolean;
  /** Ph2-WP2: extra strip controls (view selector + edit entry) rendered after
   * the pill inside the SAME .adm-controlbar row. */
  viewSlot?: React.ReactNode;
}) {
  return (
    <div className="adm-controlbar">
      <CompareControl params={params} compareLabel={compareLabel} loading={loading} />
      {viewSlot}
    </div>
  );
}
