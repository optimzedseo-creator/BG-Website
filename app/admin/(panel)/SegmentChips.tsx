"use client";

import type { BreakdownRow } from "@/lib/admin/iq/types";

/*
 * Module-local segment chips (UX §5): device / country / sourceClass cuts that
 * filter THIS module's rows and lists only — never global. Single-select per
 * dimension; clicking the active chip clears it. Options always come from the
 * uncut window (the source guarantees this), so applying one chip never hides
 * the other chips' options.
 */

export interface ChipGroup {
  key: "device" | "country" | "source";
  label: string;
  options: BreakdownRow[];
  active: string | null;
}

export default function SegmentChips({
  groups,
  onToggle,
  disabled,
}: {
  groups: ChipGroup[];
  onToggle: (key: ChipGroup["key"], value: string | null) => void;
  disabled?: boolean;
}) {
  return (
    <div className="adm-chips" role="group" aria-label="Segment cuts (this module only)">
      {groups.map((g) =>
        g.options.length === 0 ? null : (
          <div key={g.key} className="adm-chip-group">
            <span className="adm-chip-groupname">{g.label}</span>
            {g.options.map((o) => {
              const on = g.active === o.label;
              return (
                <button
                  key={o.label}
                  type="button"
                  className={`adm-chip${on ? " on" : ""}`}
                  aria-pressed={on}
                  disabled={disabled}
                  onClick={() => onToggle(g.key, on ? null : o.label)}
                >
                  {o.label}
                  <span className="adm-chip-n">{o.n}</span>
                </button>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
