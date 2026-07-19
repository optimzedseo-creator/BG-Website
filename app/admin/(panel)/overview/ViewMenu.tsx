"use client";

// Dashboard Wave PHASE 2 · WP2 — saved-views selector + manager. One control
// in the strip ("Default ▾") opening one popover: pick a view, save the
// current canvas as a new view, and manage (rename = save-with-id, delete,
// set default) inline. Names render as JSX TEXT nodes only (condition 2).
// Time is NEVER stored in a view (ux ruling — a frozen period is a stale
// dashboard), so nothing here touches the period bus.

import { useEffect, useRef, useState } from "react";
import type { DashboardRecord } from "@/lib/admin/iq/dashboards";

export default function ViewMenu({
  dashboards,
  activeId,
  defaultId,
  busy,
  onSelect,
  onSaveAs,
  onRename,
  onDelete,
  onSetDefault,
}: {
  dashboards: DashboardRecord[];
  /** Explicitly selected view id (null = the default view). */
  activeId: string | null;
  defaultId: string | null;
  busy: boolean;
  onSelect: (id: string | null) => void;
  onSaveAs: () => void;
  /** Resolves true on success — the rename form stays OPEN until then (ux
   * P3-a: a failed rename must not silently discard the typed name). */
  onRename: (id: string, name: string) => Promise<boolean>;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  function close() {
    setOpen(false);
    setRenameId(null);
    setConfirmDelete(null);
    btnRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const active = activeId ? dashboards.find((d) => d.id === activeId) : null;
  const defaultRec = defaultId ? dashboards.find((d) => d.id === defaultId) : null;
  const label = active ? active.name : "Default";

  return (
    <div className="adm-viewctl-wrap">
      <button
        ref={btnRef}
        type="button"
        className="adm-viewctl"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="adm-viewctl-label">{label}</span>
        <span className="adm-timepill-caret" aria-hidden="true">▾</span>
      </button>

      {open && (
        <>
          <div className="adm-timepop-scrim" onClick={close} />
          <div className="adm-viewpop" role="dialog" aria-label="Dashboard views">
            <span className="adm-timepop-title" id="adm-viewpop-title">View</span>
            <div className="adm-timeopts" role="radiogroup" aria-labelledby="adm-viewpop-title">
              <button
                type="button"
                role="radio"
                aria-checked={activeId === null}
                className={`adm-timeopt${activeId === null ? " is-on" : ""}`}
                onClick={() => {
                  onSelect(null);
                  close();
                }}
              >
                <span>Default</span>
                <span className="adm-timeopt-hint">
                  {defaultRec ? defaultRec.name : "built-in Command"}
                </span>
              </button>
              {dashboards.map((d) => (
                <div key={d.id} className="adm-viewrow">
                  {renameId === d.id ? (
                    <form
                      className="adm-viewrename"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const v = renameVal.trim();
                        if (!v) return;
                        void onRename(d.id, v).then((okd) => {
                          if (okd) setRenameId(null);
                        });
                      }}
                    >
                      <input
                        type="text"
                        value={renameVal}
                        maxLength={60}
                        autoFocus
                        aria-label="View name"
                        onChange={(e) => setRenameVal(e.target.value)}
                      />
                      <button type="submit" className="adm-viewact" disabled={busy}>
                        Save
                      </button>
                      <button
                        type="button"
                        className="adm-viewact"
                        onClick={() => setRenameId(null)}
                      >
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={activeId === d.id}
                        className={`adm-timeopt adm-viewrow-name${activeId === d.id ? " is-on" : ""}`}
                        onClick={() => {
                          onSelect(d.id);
                          close();
                        }}
                      >
                        <span>{d.name}</span>
                        {d.id === defaultId && <span className="adm-timeopt-hint">default</span>}
                      </button>
                      <span className="adm-viewrow-actions">
                        {d.id !== defaultId && (
                          <button
                            type="button"
                            className="adm-viewact"
                            title="Make this the default view"
                            disabled={busy}
                            onClick={() => onSetDefault(d.id)}
                          >
                            make default
                          </button>
                        )}
                        <button
                          type="button"
                          className="adm-viewact"
                          disabled={busy}
                          onClick={() => {
                            setRenameId(d.id);
                            setRenameVal(d.name);
                            setConfirmDelete(null);
                          }}
                        >
                          rename
                        </button>
                        {confirmDelete === d.id ? (
                          <button
                            type="button"
                            className="adm-viewact adm-viewact-danger"
                            disabled={busy}
                            onClick={() => {
                              onDelete(d.id);
                              setConfirmDelete(null);
                            }}
                          >
                            really delete?
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="adm-viewact"
                            aria-label={`Delete ${d.name}`}
                            disabled={busy}
                            onClick={() => setConfirmDelete(d.id)}
                          >
                            delete
                          </button>
                        )}
                      </span>
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="adm-viewpop-foot">
              <button
                type="button"
                className="adm-linkbtn"
                disabled={busy}
                onClick={() => {
                  onSaveAs();
                  close();
                }}
              >
                Save as new view…
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
