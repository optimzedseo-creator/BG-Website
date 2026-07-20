import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import "./styles/case-studies.css";
import "./styles/speaking.css";
import "./styles/credentials.css";
import "./styles/executive.css";
import "./styles/fractional.css";
import "./styles/consulting.css";
import "./styles/insights.css";
import "./styles/c1.css";
import "./styles/motion.css";

/*
 * Fonts are self-hosted via next/font (removes the Google Fonts third-party
 * call). Fraunces loads as a VARIABLE font (no `weight` key ⇒ full wght
 * range) — this is load-bearing for C1: display type is weight 420, which
 * only resolves inside the variable range (C1-DESIGN-SYSTEM.md §1.5/§8.4).
 * C1 also leans on italic `em` in display copy, so the real italic axis is
 * loaded (was browser-synthesized before).
 */
const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-fraunces",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.bradleygriffin.us"),
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#1C2B4A",
};

/*
 * Root layout carries ONLY the document shell (fonts, global CSS, favicon).
 * Site chrome (Header/Footer/SiteEffects/Analytics) lives in app/(site)/layout.tsx
 * so /admin renders its own minimal layout with no storefront chrome and no
 * analytics capture (Phase 4).
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    /*
     * suppressHydrationWarning: the inline script below adds the `js` class
     * to <html> before first paint (same pattern as theme scripts). React 19
     * owns <html className> here; the imperative class is additive and never
     * managed by React — the suppression only silences the dev mismatch note.
     * The class gates the .reveal hidden state (globals.css): no JS ⇒ no
     * class ⇒ fully visible static page. NEVER move `js` (or the engine's
     * `fx`) into JSX — classList only (C1-IMPLEMENTATION-PLAN.md §1.2).
     */
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
        {children}
      </body>
    </html>
  );
}
