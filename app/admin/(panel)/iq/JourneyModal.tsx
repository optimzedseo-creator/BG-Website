"use client";

// WP3.4 — the Journey modal (the demo climax). Single tab: it's a timeline, not
// fragmented. Fetches /admin/api/iq/visitor and renders the SHARED
// JourneyTimeline. Accent = leads green (the money surface).

import JourneyTimeline from "./JourneyTimeline";
import { ModalHeader, ModalStatus, ModalWrap } from "./ModalShell";
import { useDrill } from "./drill-fetch";
import type { IqVisitorJourney } from "@/lib/admin/iq/types";

export default function JourneyModal({ visitorId, onClose }: { visitorId: string; onClose: () => void }) {
  const { data, loading, error } = useDrill<IqVisitorJourney>(
    `/admin/api/iq/visitor?id=${encodeURIComponent(visitorId)}`
  );
  const titleId = "adm-journey-modal-title";

  return (
    <ModalWrap onClose={onClose} labelledBy={titleId} acc="leads">
      <ModalHeader
        micro="Visitor journey"
        title={data ? `Visitor ${data.shortId}` : `Visitor ${visitorId.slice(0, 8)}`}
        titleId={titleId}
        sub={
          data
            ? `${data.pageviews} pageview${data.pageviews === 1 ? "" : "s"} · ${data.sessionCount} session${data.sessionCount === 1 ? "" : "s"}`
            : undefined
        }
        onClose={onClose}
      />
      <ModalStatus loading={loading} error={error} />
      {data && <JourneyTimeline data={data} />}
    </ModalWrap>
  );
}
