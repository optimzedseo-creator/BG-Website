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
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SiteEffects from "@/components/SiteEffects";

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body>
        <Header />
        {children}
        <Footer />
        <SiteEffects />
      </body>
    </html>
  );
}
