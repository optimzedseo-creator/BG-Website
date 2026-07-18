import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import "./styles/home.css";
import "./styles/case-studies.css";
import "./styles/story.css";
import "./styles/speaking.css";
import "./styles/credentials.css";
import "./styles/executive.css";
import "./styles/fractional.css";
import "./styles/consulting.css";
import "./styles/insights.css";

/*
 * Fonts are self-hosted via next/font (removes the Google Fonts third-party
 * call). The legacy pages loaded Fraunces normal-only (opsz 9..144, wght
 * 400/500/600) — italics were browser-synthesized — so we match that:
 * normal style only, full variable wght + opsz axes.
 */
const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal"],
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
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
