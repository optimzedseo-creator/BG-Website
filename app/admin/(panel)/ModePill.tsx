"use client";

// ADMIN-IQ — LIVE / DEMO mode pill (Wave 4 Stage B, DESIGN §5.15).
//
// Segmented control in the top bar's mode slot on every route:
//   [ ● LIVE ] [ ◐ DEMO ]   (DM Mono 11px uppercase; styles in admin.css)
// LIVE active = green + a 2.4s opacity pulse (killed by reduced-motion → static
// ●). DEMO active = purple + static ◐.
//
// Direction asymmetry (reconciled default, build-plan ruling overriding UX's
// instant-both): Live→Demo submits INSTANTLY; Demo→Live opens a §5.9 mini-modal
// confirm ("Switch to live data?", green title keyline) THEN submits — safety in
// the risky direction (never silently leave a demo screen showing real data).
//
// Submits to setModeAction (requireAdmin first-line → set/clear httpOnly cookie
// → revalidate the admin layout). Mode NEVER goes in the URL. After the action
// resolves, router.refresh() repaints server surfaces in the new mode.

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { IqMode } from "@/lib/admin/iq/types";
import { setModeAction } from "./actions";

export default function ModePill({ mode }: { mode: IqMode }) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();

  function apply(next: IqMode) {
    if (next === mode) return;
    startTransition(async () => {
      await setModeAction(next);
      router.refresh();
    });
  }

  function onLiveClick() {
    if (mode === "live" || pending) return;
    setConfirming(true); // demo → live: confirm first
  }
  function onDemoClick() {
    if (mode === "demo" || pending) return;
    apply("demo"); // live → demo: instant
  }

  return (
    <div className="adm-modepill" role="group" aria-label="Data mode">
      <button
        type="button"
        className={`adm-mode-live${mode === "live" ? " on" : ""}`}
        aria-pressed={mode === "live"}
        onClick={onLiveClick}
        disabled={pending}
        title="Live data"
      >
        <span className="adm-mode-dot" aria-hidden="true">●</span>
        LIVE
      </button>
      <button
        type="button"
        className={`adm-mode-demo${mode === "demo" ? " on" : ""}`}
        aria-pressed={mode === "demo"}
        onClick={onDemoClick}
        disabled={pending}
        title="Demo data (synthetic)"
      >
        <span className="adm-mode-dot" aria-hidden="true">◐</span>
        DEMO
      </button>

      {confirming && (
        <ConfirmSwitchToLive
          pending={pending}
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false);
            apply("live");
          }}
        />
      )}
    </div>
  );
}

/** §5.9 mini-modal: a compact confirm with a green title keyline. Esc + backdrop
 *  cancel; focus lands on Cancel (the safe default). */
function ConfirmSwitchToLive({
  pending,
  onCancel,
  onConfirm,
}: {
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = "adm-modeconfirm-title";

  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onCancel]);

  return (
    <div className="adm-mini-overlay" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="adm-mini adm-mini--live" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <h2 id={titleId} className="adm-mini-title">Switch to live data?</h2>
        <p className="adm-mini-body">
          You are viewing the demo dataset. Switching shows real, live numbers and lead names.
        </p>
        <div className="adm-mini-actions">
          <button type="button" className="adm-btn adm-btn-ghost" ref={cancelRef} onClick={onCancel} disabled={pending}>
            Cancel
          </button>
          <button type="button" className="adm-btn" onClick={onConfirm} disabled={pending}>
            Switch to live
          </button>
        </div>
      </div>
    </div>
  );
}
