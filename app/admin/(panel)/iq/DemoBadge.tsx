// ADMIN-IQ — crop-proof demo mark (Wave 4 Stage B, DESIGN §5.15 / UX §8).
//
// A REAL DOM node (never a CSS ::after — a11y: screen readers must announce it),
// present ONLY in demo, absent in live. Placed in every page heading so a
// screenshot of ANY heading carries "◐ DEMO DATA". The glyph and the word ALWAYS
// ride together — purple is also the Search accent, so color alone is ambiguous;
// the ◐ glyph + the literal word disambiguate (never color-only).
//
// Presentational + prop-driven (no "use client", no server-only) so it works in
// BOTH server pages (pass mode === "demo") and client views (pass
// payload.meta.mode === "demo" — the same data-accurate signal the modal
// sub-line uses).

export default function DemoBadge({ demo }: { demo: boolean }) {
  if (!demo) return null;
  return (
    <span className="adm-demo-badge">
      <span aria-hidden="true">◐</span> DEMO DATA
    </span>
  );
}
