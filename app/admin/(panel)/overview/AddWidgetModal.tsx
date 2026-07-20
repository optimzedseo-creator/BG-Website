"use client";

// Dashboard Wave PHASE 2 · WP2 — the add-widget gallery (§5.9 mini-modal
// idiom). Entries grouped by module accent; each row = name + one-line
// what-it-shows + accent swatch + an "Added" check once present. CLICK to add
// into the first open slot (touch-safe — no drag required, ux spec). The modal
// stays open so several widgets can be added in one visit.

import { useEffect } from "react";
import type { LayoutEntry } from "@/lib/admin/iq/widgets";
import { GALLERY, galleryItemPresent, type GalleryItem } from "./canvas-lib";

export default function AddWidgetModal({
  entries,
  onAdd,
  onClose,
}: {
  entries: LayoutEntry[];
  onAdd: (item: GalleryItem) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const groups = [...new Set(GALLERY.map((g) => g.group))];

  return (
    <div className="adm-mini-overlay" onClick={onClose}>
      <div
        className="adm-mini adm-gallery"
        role="dialog"
        aria-label="Add a widget"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="adm-mini-title">Add a widget</h3>
        {groups.map((group) => (
          <div key={group} className="adm-gallery-group">
            <span className="adm-gallery-grouptitle">{group}</span>
            <div className="adm-gallery-items">
              {GALLERY.filter((g) => g.group === group).map((g) => {
                const added = galleryItemPresent(entries, g);
                return (
                  <button
                    key={g.id}
                    type="button"
                    className={`adm-gallery-item${added ? " is-added" : ""}`}
                    aria-disabled={added}
                    onClick={() => {
                      if (!added) onAdd(g);
                    }}
                  >
                    <span
                      className={`adm-gallery-acc ${g.accentClass}`}
                      data-acc={g.acc}
                      aria-hidden="true"
                    />
                    <span className="adm-gallery-text">
                      <span className="adm-gallery-name">{g.name}</span>
                      <span className="adm-gallery-desc">{g.desc}</span>
                    </span>
                    {added && <span className="adm-gallery-added">✓ Added</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <div className="adm-mini-actions">
          <button type="button" className="adm-btn-ghost" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
