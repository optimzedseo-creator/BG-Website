"use client";

import { useState } from "react";

/**
 * "+ more" chips reveal, ported from the legacy inline script on
 * credentials.html: clicking the button adds .open to the parent .chips
 * container (revealing the .xtra chips via CSS) and removes the button.
 *
 * The .open class is added imperatively on the server-rendered parent —
 * exactly like legacy — so the parent's .reveal/.in classes (managed by
 * SiteEffects via classList) are never clobbered by a React re-render.
 */
export default function ChipsMore() {
  const [gone, setGone] = useState(false);
  if (gone) return null;
  return (
    <button
      type="button"
      className="chip more"
      id="chips-more"
      onClick={(e) => {
        e.currentTarget.closest(".chips")?.classList.add("open");
        setGone(true);
      }}
    >
      + more
    </button>
  );
}
