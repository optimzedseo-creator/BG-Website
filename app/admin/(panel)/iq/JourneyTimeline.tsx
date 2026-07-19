"use client";

// WP3.4 — the stitched visitor timeline, ported out of leads/[id]/page.tsx into
// ONE shared presentational component (used by the Journey modal now, and the
// lead page in Wave 3b). Session-grouped (30-min-gap heuristic); each entry is
// time · icon-by-kind · label · detail · Event.meta chips. Every path/referrer
// string is rendered as TEXT — they are attacker-supplied and MUST NOT become
// HTML. Works at N=1 and renders untruncated on mobile.

import Link from "next/link";
import type { IqVisitorJourney, JourneyKind } from "@/lib/admin/iq/types";

const KIND_ICON: Record<JourneyKind, string> = {
  view: "👁",
  chooser: "🔀",
  cta: "🎯",
  brief: "✉️",
  booking: "📅",
};

function fmtTime(iso: string): string {
  // "YYYY-MM-DD HH:MM UTC" — matches the lead page's honest UTC labeling.
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
}

function fmtTotal(seconds: number): string {
  if (seconds <= 0) return "no time reported";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

export default function JourneyTimeline({
  data,
  hideLeadLink = false,
}: {
  data: IqVisitorJourney;
  /** WP3.5: on the lead's own page the "became: a lead" link would point back
   * to the record already open — suppress it there. Defaults false (the Journey
   * modal keeps the link). */
  hideLeadLink?: boolean;
}) {
  return (
    <div className="adm-journey-wrap">
      <div className="adm-journey-head">
        <div className="adm-journey-facts">
          <span className="adm-mono adm-journey-id">{data.shortId}</span>
          <span className="adm-journey-fact">
            {data.pageviews} pageview{data.pageviews === 1 ? "" : "s"}
          </span>
          <span className="adm-journey-fact" title="A new session starts after 30 minutes of inactivity.">
            {data.sessionCount} session{data.sessionCount === 1 ? "" : "s"}
          </span>
          {data.device && <span className="adm-journey-fact">{data.device}</span>}
          {data.browser && <span className="adm-journey-fact">{data.browser}</span>}
          {data.country && <span className="adm-journey-fact">{data.country}</span>}
          {data.firstSeen && (
            <span className="adm-journey-fact">first seen {data.firstSeen.slice(0, 10)}</span>
          )}
        </div>
      </div>

      {!hideLeadLink && data.hasLead && data.leadId && (
        <Link href={`/admin/leads/${data.leadId}`} className="adm-journey-lead">
          <span aria-hidden="true">→</span> became: a lead. Open the CRM record.
        </Link>
      )}

      {data.sessions.length === 0 ? (
        <p className="adm-empty">🌙 No recorded pageviews or events for this visitor yet.</p>
      ) : (
        <ol className="adm-journey-sessions">
          {data.sessions.map((session, si) => (
            <li key={session.startAt + si} className="adm-journey-session">
              <div className="adm-journey-session-head">
                <span className="adm-mono">Session {si + 1}</span>
                <span className="adm-journey-session-time">{fmtTime(session.startAt)}</span>
              </div>
              <ol className="adm-journey-items">
                {session.items.map((item, ii) => (
                  <li key={item.at + ii} className={`adm-j2 adm-j2-${item.kind}`}>
                    <span className="adm-j2-icon" aria-hidden="true">
                      {KIND_ICON[item.kind]}
                    </span>
                    <div className="adm-j2-body">
                      <div className="adm-j2-line">
                        <span className="adm-j2-label">{item.label}</span>
                        <span className="adm-mono adm-j2-at">{item.at.slice(11, 16)}</span>
                      </div>
                      {item.detail && <span className="adm-j2-detail">{item.detail}</span>}
                      {item.metaChips.length > 0 && (
                        <div className="adm-j2-chips">
                          {item.metaChips.map((c, ci) => (
                            <span key={ci} className="adm-qchip">
                              {c}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ol>
      )}

      {data.truncated && (
        <p className="adm-caption">
          Showing the most recent {data.sessions.reduce((a, s) => a + s.items.length, 0)} events.
          This visitor has {data.pageviews} pageviews in total.
        </p>
      )}

      <div className="adm-journey-foot">
        <span className="adm-journey-foot-h">Pages read</span>
        {data.pagesRead.length === 0 ? (
          <span className="adm-journey-fact">none yet</span>
        ) : (
          <div className="adm-j2-chips">
            {data.pagesRead.map((path) => (
              <span key={path} className="adm-pathchip">
                {path}
              </span>
            ))}
          </div>
        )}
        <span className="adm-journey-total">Total time on site: {fmtTotal(data.totalSeconds)}</span>
      </div>
    </div>
  );
}
