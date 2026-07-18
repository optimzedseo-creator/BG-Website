import Link from "next/link";

export interface Crumb {
  name: string;
  /** Omitted on the current (last) crumb. */
  href?: string;
}

/**
 * Shared 3-level (and 4-level, on posts) breadcrumb trail for the /insights
 * cluster. Visible crumb text is fed from the SAME strings as the
 * BreadcrumbList JSON-LD (lib/insights.ts) so they cannot drift. The current
 * page is rendered as plain text with aria-current, not a link.
 */
export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="ins-crumbs" aria-label="Breadcrumb">
      <ol>
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <li key={c.name}>
              {c.href && !last ? (
                <Link href={c.href}>{c.name}</Link>
              ) : (
                <span aria-current="page">{c.name}</span>
              )}
              {!last && <span className="sep" aria-hidden="true">›</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
