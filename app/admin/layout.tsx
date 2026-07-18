import type { Metadata, Viewport } from "next";
import { Syne, DM_Sans, DM_Mono } from "next/font/google";
import "../styles/admin.css";

/*
 * ADMIN-IQ fonts (DESIGN-SPEC §2) — self-hosted via next/font at BUILD time,
 * served from /_next/static/media/ (same-origin), so the existing
 * font-src 'self' CSP needs zero changes. Imported HERE (not the root layout)
 * so admin routes alone pay for them; the public site loads nothing new.
 */
const syne = Syne({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-syne",
  display: "swap",
});
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-dm-sans",
  display: "swap",
});
const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
  display: "swap",
});

// Admin shell: no storefront chrome (Header/Footer/Analytics live in the
// (site) route group), all admin CSS scoped under .page-admin, and noindex
// metadata on every admin page (middleware adds X-Robots-Tag on top).
export const metadata: Metadata = {
  title: "Admin · Bradley Griffin",
  robots: { index: false, follow: false },
};

// Dark-only console (DESIGN-SPEC §6) — browser chrome matches the canvas.
export const viewport: Viewport = {
  themeColor: "#06080E",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`page-admin ${syne.variable} ${dmSans.variable} ${dmMono.variable}`}>
      {children}
    </div>
  );
}
