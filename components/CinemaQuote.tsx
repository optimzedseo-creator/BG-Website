/**
 * CinemaQuote — the C1 dark parallax quote band (C1-DESIGN-SYSTEM.md §2.8).
 * Server component, zero client JS.
 *
 * Backdrop plate carries data-px="art" (driven by its parent section under
 * html.fx, 14% over-scan); the blockquote carries data-px="float" and
 * counter-drifts ±26px. Static: a navy-night band with the quote centered.
 * The plate is a duotone-gradient stand-in until the shoot delivers the
 * podium/speaking-room frame (slot 5, §4).
 */

type Props = {
  kicker: string;
  quote: string;
  attribution: string;
  ctaHref: string;
  ctaLabel: string;
  ctaClassName?: string;
};

export default function CinemaQuote({ kicker, quote, attribution, ctaHref, ctaLabel, ctaClassName }: Props) {
  return (
    <section className="cinema">
      <div className="cinema-plate" data-px="art" aria-hidden="true"></div>
      <div className="wrap-n reveal">
        <span className="microlabel">{kicker}</span>
        <blockquote data-px="float">&ldquo;{quote}&rdquo;</blockquote>
        <div className="attr">{attribution}</div>
        <div className="cta-row">
          <a className={ctaClassName || "btn btn-line"} href={ctaHref}>
            {ctaLabel} <span className="arr">&rarr;</span>
          </a>
        </div>
      </div>
    </section>
  );
}
