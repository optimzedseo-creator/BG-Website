import Image from "next/image";

/**
 * PhotoFrame — the C1 house photo frame (".ph", C1-DESIGN-SYSTEM.md §2.3).
 * Server component, zero client JS.
 *
 * Renders the navy-night plate with the inset gold hairline, the caption
 * scrim (ph-k / ph-t / ph-s stack), and the `.ph-art` layer that carries
 * data-px="art" — under html.fx the art layer is over-scanned 13% and the
 * engine drifts it inside the clipped frame; static, it sits at inset 0.
 *
 * Two modes:
 *  - Real photo: pass `src` (+ real `alt`) — renders next/image `fill`
 *    inside the art layer (lazy below the fold unless `priority`).
 *  - Library stand-in: omit `src` — the tone class paints the brand
 *    gradient plate (slot map §4) and the layer is aria-hidden.
 *
 * ASSET CONTRACT (P4 photo swap): every real image destined for this frame
 * ships with ≥13% extra height beyond the visible crop, duotone baked in.
 * The swap after the shoot is a props change — no layout code.
 *
 * STATIC-PLATE EXCEPTION (C1-PHOTO-MAP.md, Brad's call 2026-07-20): a source
 * too small to carry the 13% bleed may ship with `staticPlate` — the art
 * layer loses data-px="art" (never enters the MotionEngine registry) and the
 * fx over-scan CSS keys off that attribute, so the frame renders the full-
 * quality safe crop with zero drift. Currently: campaign-downtown-2018.png
 * (805px social re-save; re-enters the registry if the original is found).
 */

const RATIO_CLASS = {
  "3/4": "r-34",
  "4/3": "r-43",
  "16/9": "r-169",
  "4/5": "r-45",
} as const;

type Props = {
  ratio: keyof typeof RATIO_CLASS;
  tone?: "navy" | "sepia" | "dusk" | "room";
  src?: string;
  alt?: string;
  sizes?: string;
  priority?: boolean;
  kicker?: string;
  caption?: string;
  sub?: string;
  className?: string;
  /** Exclude the art layer from the parallax registry (static-plate exception). */
  staticPlate?: boolean;
};

export default function PhotoFrame({
  ratio,
  tone,
  src,
  alt,
  sizes,
  priority,
  kicker,
  caption,
  sub,
  className,
  staticPlate,
}: Props) {
  const classes = ["ph", RATIO_CLASS[ratio], tone ? `ph-${tone}` : "", className || ""]
    .filter(Boolean)
    .join(" ");
  const hasCaption = Boolean(kicker || caption || sub);
  return (
    <figure className={classes}>
      <div className="ph-art" data-px={staticPlate ? undefined : "art"} aria-hidden={src ? undefined : true}>
        {src ? (
          <Image
            src={src}
            alt={alt || ""}
            fill
            sizes={sizes || "(max-width: 860px) 100vw, 33vw"}
            className="ph-img"
            priority={priority}
          />
        ) : null}
      </div>
      {hasCaption ? (
        <figcaption>
          {kicker ? <span className="ph-k">{kicker}</span> : null}
          {caption ? <span className="ph-t">{caption}</span> : null}
          {sub ? <span className="ph-s">{sub}</span> : null}
        </figcaption>
      ) : null}
    </figure>
  );
}
