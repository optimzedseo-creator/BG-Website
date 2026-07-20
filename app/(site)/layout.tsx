import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SiteEffects from "@/components/SiteEffects";
import Analytics from "@/components/Analytics";
import MotionEngine from "@/components/MotionEngine";

/*
 * Public-site layout: the shared chrome that used to live in the root layout.
 * Every public page sits inside this (site) route group; /admin does NOT —
 * it gets its own minimal layout (no Header/Footer, no analytics beacon,
 * and by construction no MotionEngine).
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      {children}
      <Footer />
      <SiteEffects />
      <Analytics />
      <MotionEngine />
    </>
  );
}
