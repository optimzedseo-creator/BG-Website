"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * Client filter island for the /insights hub index (section 3 + 4 of the spec).
 * Chips filter the numbered field-notes list client-side; no route change.
 * All row data (read-time, date label) is precomputed server-side and passed in
 * as plain serializable props, so this island is purely presentational + state.
 * Default selection is "all" — identical to the server render, so hydration is
 * a byte match (no server/client mismatch).
 */
export type InsightNote = {
  slug: string;
  href: string;
  pillarSlug: string;
  pillarLabel: string;
  title: string;
  dek: string;
  dateLabel: string;
  readMin: number;
};

export type InsightChip = {
  slug: string;
  label: string;
  populated: boolean;
};

export default function InsightsFilter({
  notes,
  chips,
  total,
}: {
  notes: InsightNote[];
  chips: InsightChip[];
  total: number;
}) {
  const [active, setActive] = useState<string>("all");
  const shown = active === "all" ? notes : notes.filter((n) => n.pillarSlug === active);

  return (
    <>
      <div className="ix-chips" role="group" aria-label="Filter field notes by topic">
        <button
          type="button"
          className={`ix-chip${active === "all" ? " is-active" : ""}`}
          aria-pressed={active === "all"}
          onClick={() => setActive("all")}
        >
          All
        </button>
        {chips.map((c) =>
          c.populated ? (
            <button
              key={c.slug}
              type="button"
              className={`ix-chip${active === c.slug ? " is-active" : ""}`}
              aria-pressed={active === c.slug}
              onClick={() => setActive(c.slug)}
            >
              {c.label}
            </button>
          ) : (
            <span key={c.slug} className="ix-chip is-disabled" aria-disabled="true">
              {c.label} <span className="ix-soon">&middot; soon</span>
            </span>
          ),
        )}
        <span className="ix-chip-count">{total} field notes</span>
      </div>

      <span className="ix-notes-label">The field notes</span>
      <ol className="ix-notes">
        {shown.map((n, i) => (
          <li key={n.slug}>
            <Link className="ix-note" href={n.href}>
              <span className="ix-note-n">{String(i + 1).padStart(2, "0")}</span>
              <span className="ix-note-main">
                <span className="ix-note-tag">{n.pillarLabel}</span>
                <span className="ix-note-title">{n.title}</span>
                <span className="ix-note-dek">{n.dek}</span>
                <span className="ix-note-meta">
                  {n.dateLabel} <span className="dot">&middot;</span> {n.readMin} min read
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </>
  );
}
