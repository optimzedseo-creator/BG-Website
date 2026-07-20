import Link from "next/link";

/** Site footer — C1 chrome (§2.16): navy-night, gold-bright surname. */
export default function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <span className="fbrand">Bradley <span className="gs">Griffin</span></span>
        <nav>
          <Link href="/case-studies">Case studies</Link>
          <Link href="/story">About</Link>
          <Link href="/speaking">Speaking</Link>
          <Link href="/credentials">Credentials</Link>
          <Link href="/faq">FAQ</Link>
          <Link href="/contact">Contact</Link>
          <a href="https://www.linkedin.com/in/brad-w-griffin/" target="_blank" rel="noopener">LinkedIn</a>
        </nav>
        <span className="fine">© 2026 Bradley Griffin · bradleygriffin.us</span>
      </div>
    </footer>
  );
}
