import Link from "next/link";
import { Fragment } from "react";

/**
 * Server-rendered inline markdown-link parser: converts `[label](/path)` or
 * `[label](https://…)` inside a plain-text string into real links, leaving the
 * rest as text. No client hydration — the resulting text is in the server HTML
 * (AIO static-HTML guard). Internal paths use next/link; external URLs use <a>.
 *
 * Deliberately minimal: it handles ONLY inline links (the one construct our
 * content copy uses). It is not a general markdown renderer.
 */
const LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;

export default function RichText({ text }: { text: string }) {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let key = 0;
  // Fresh regex state per render.
  const re = new RegExp(LINK_RE.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(<Fragment key={key++}>{text.slice(last, m.index)}</Fragment>);
    const label = m[1];
    const href = m[2];
    if (href.startsWith("/")) {
      nodes.push(
        <Link key={key++} href={href}>
          {label}
        </Link>,
      );
    } else {
      nodes.push(
        <a key={key++} href={href} target="_blank" rel="noopener">
          {label}
        </a>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(<Fragment key={key++}>{text.slice(last)}</Fragment>);
  return <>{nodes}</>;
}
