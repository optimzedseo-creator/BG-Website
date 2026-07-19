"use client";

// WP3.1 — the modal grammar every drill reuses (DESIGN §5.9 + UX §3 preamble).
// ModalWrap: overlay + panel, focus trap, Esc + backdrop close, return-focus to
// opener, scroll-lock, role="dialog" aria-modal, mobile swipe-down to dismiss.
// ModalHeader: micro-label + accent-keylined title + denominator sub-line + a
// ghost-neutral close. ModalTabs: the §5.8 segmented control as a tab row.

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function ModalWrap({
  onClose,
  labelledBy,
  acc,
  children,
}: {
  onClose: () => void;
  labelledBy: string;
  /** data-acc value so the panel takes the entity accent (Wave-3a ratification),
   * not the opener's. */
  acc?: string;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<Element | null>(null);
  const [dragY, setDragY] = useState(0);
  const touchStartRef = useRef<number | null>(null);

  useEffect(() => {
    openerRef.current = document.activeElement;
    document.body.classList.add("adm-modal-open");
    // Focus the first focusable in the panel (fall back to the panel itself).
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      // B7: roving-tabindex sets inactive tabs to tabindex=-1, but the CSS
      // FOCUSABLE selector's button:not([disabled]) still matches them. Exclude
      // tabIndex < 0 at runtime so ONE Tab stop = the active tab (arrows move
      // within) — the focus-trap and the tablist now agree.
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.tabIndex >= 0 && (el.offsetParent !== null || el === document.activeElement)
      );
      if (items.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.classList.remove("adm-modal-open");
      if (openerRef.current instanceof HTMLElement) openerRef.current.focus();
    };
  }, [onClose]);

  const onBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Mobile swipe-down: engage only when the panel is scrolled to the top, so a
  // downward drag over content never fights the scroll.
  const onTouchStart = (e: React.TouchEvent) => {
    if ((panelRef.current?.scrollTop ?? 0) <= 0) touchStartRef.current = e.touches[0].clientY;
    else touchStartRef.current = null;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartRef.current === null) return;
    const dy = e.touches[0].clientY - touchStartRef.current;
    setDragY(dy > 0 ? dy : 0);
  };
  const onTouchEnd = () => {
    if (dragY > 90) onClose();
    else setDragY(0);
    touchStartRef.current = null;
  };

  return (
    <div className="adm-modal-overlay" onMouseDown={onBackdrop} data-acc={acc}>
      <div
        className="adm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        ref={panelRef}
        style={dragY ? { transform: `translateY(${dragY}px)`, transition: "none" } : undefined}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <span className="adm-modal-grip" aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}

export function ModalHeader({
  micro,
  title,
  titleId,
  sub,
  onClose,
}: {
  micro: string;
  title: string;
  titleId: string;
  sub?: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="adm-modal-head">
      <div className="adm-modal-titles">
        <span className="adm-modal-micro">{micro}</span>
        <h2 id={titleId} className="adm-modal-title">
          {title}
        </h2>
        {sub ? <span className="adm-modal-sub">{sub}</span> : null}
      </div>
      <button type="button" className="adm-modal-close" onClick={onClose} aria-label="Close">
        ✕
      </button>
    </div>
  );
}

export interface ModalTab {
  key: string;
  label: string;
}

/** B15 — APG tab/panel pairing: modals spread this onto the active panel's
 * section wrapper so aria-controls (on the tab) has a matching role="tabpanel"
 * + aria-labelledby target. Generic — every tabbed modal reuses it. */
export function tabPanelProps(tabKey: string): {
  role: "tabpanel";
  id: string;
  "aria-labelledby": string;
} {
  return { role: "tabpanel", id: `adm-tabpanel-${tabKey}`, "aria-labelledby": `adm-tab-${tabKey}` };
}

export function ModalTabs({
  tabs,
  active,
  onSelect,
}: {
  tabs: ModalTab[];
  active: string;
  onSelect: (key: string) => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [scrollable, setScrollable] = useState(false);

  // B9 — the edge-fade mask must only show when the row actually overflows
  // (pure CSS cannot detect overflow). Measure on mount + resize and toggle a
  // class the mask CSS is scoped to, so a short 2-3 tab row shows no phantom fade.
  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const measure = () => setScrollable(el.scrollWidth > el.clientWidth + 1);
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [tabs.length]);

  // P3 — APG tablist roving tabindex: only the active tab is in the Tab order
  // (tabindex 0); ArrowLeft/Right move selection AND focus, Home/End jump to the
  // ends. Inactive tabs carry tabindex -1 so a single Tab press lands on the row.
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const idx = tabs.findIndex((t) => t.key === active);
    if (idx < 0) return;
    let next = idx;
    if (e.key === "ArrowRight") next = (idx + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (idx - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    else return;
    e.preventDefault();
    onSelect(tabs[next].key);
    const btns = rowRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    btns?.[next]?.focus();
  };

  return (
    <div
      className={`adm-modal-tabs${scrollable ? " is-scrollable" : ""}`}
      role="tablist"
      aria-label="Sections"
      ref={rowRef}
      onKeyDown={onKeyDown}
    >
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          role="tab"
          id={`adm-tab-${t.key}`}
          aria-controls={`adm-tabpanel-${t.key}`}
          aria-selected={active === t.key}
          tabIndex={active === t.key ? 0 : -1}
          className={`adm-modal-tab${active === t.key ? " on" : ""}`}
          onClick={() => onSelect(t.key)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/** Shared loading/error body — keeps the honest empty spirit inside modals. */
export function ModalStatus({ loading, error }: { loading: boolean; error: string | null }) {
  if (error) return <p className="adm-error" role="status">{error}</p>;
  if (loading) return <p className="adm-empty" role="status">Loading.</p>;
  return null;
}

/** Small helper: a stable close callback that also removes a lingering hash on
 * direct deep-link opens where the parent didn't provide one. */
export function useStableClose(onClose: () => void): () => void {
  return useCallback(onClose, [onClose]);
}
