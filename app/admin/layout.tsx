import type { Metadata } from "next";
import "../styles/admin.css";

// Admin shell: no storefront chrome (Header/Footer/Analytics live in the
// (site) route group), all admin CSS scoped under .page-admin, and noindex
// metadata on every admin page (middleware adds X-Robots-Tag on top).
export const metadata: Metadata = {
  title: "Admin — Bradley Griffin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="page-admin">{children}</div>;
}
