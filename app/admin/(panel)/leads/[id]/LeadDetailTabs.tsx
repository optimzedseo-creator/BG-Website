"use client";

// WP3.5 — Lead detail restructured into the tab grammar (UX §3.4):
// Overview / Journey / Activity / Source. This is the ONLY client piece: the
// server component pre-renders each panel (including the client StatusSelect and
// the shared JourneyTimeline) and hands them in as slots; this wrapper only owns
// which panel is visible. Panels stay mounted and toggle `hidden` so tabpanel
// semantics and in-panel scroll survive a tab switch.

import { useState, type ReactNode } from "react";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "journey", label: "Journey" },
  { key: "activity", label: "Activity" },
  { key: "source", label: "Source" },
] as const;

export default function LeadDetailTabs({
  overview,
  journey,
  activity,
  source,
}: {
  overview: ReactNode;
  journey: ReactNode;
  activity: ReactNode;
  source: ReactNode;
}) {
  const [tab, setTab] = useState<string>("overview");
  const panels: Record<string, ReactNode> = { overview, journey, activity, source };

  return (
    <div className="adm-leadtabs">
      <div className="adm-modal-tabs" role="tablist" aria-label="Lead sections">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            id={`adm-leadtab-${t.key}`}
            aria-selected={tab === t.key}
            aria-controls={`adm-leadpanel-${t.key}`}
            className={`adm-modal-tab${tab === t.key ? " on" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {TABS.map((t) => (
        <div
          key={t.key}
          role="tabpanel"
          id={`adm-leadpanel-${t.key}`}
          aria-labelledby={`adm-leadtab-${t.key}`}
          hidden={tab !== t.key}
        >
          {panels[t.key]}
        </div>
      ))}
    </div>
  );
}
