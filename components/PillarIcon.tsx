import type { IconKey } from "@/lib/insights";

/**
 * Single-weight line icons for pillar differentiation. No fills, no per-pillar
 * color — stroke inherits currentColor so the brand accent stays singular
 * (WP0: differentiation is numeral + line-icon + microlabel only, no new hex).
 */
export default function PillarIcon({ icon }: { icon: IconKey }) {
  const common = {
    width: 26,
    height: 26,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    focusable: false,
  };
  switch (icon) {
    case "data": // bar chart — data & analytics
      return (
        <svg {...common}>
          <path d="M3 3v18h18" />
          <rect x="7" y="12" width="3" height="6" />
          <rect x="12.5" y="8" width="3" height="10" />
          <rect x="18" y="4" width="3" height="14" />
        </svg>
      );
    case "marketing": // signal / broadcast — digital marketing
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="2.5" />
          <path d="M7.4 7.4a6.5 6.5 0 0 0 0 9.2M16.6 16.6a6.5 6.5 0 0 0 0-9.2" />
          <path d="M4.6 4.6a10.5 10.5 0 0 0 0 14.8M19.4 19.4a10.5 10.5 0 0 0 0-14.8" />
        </svg>
      );
    case "ai": // node / build — ai & automation
      return (
        <svg {...common}>
          <circle cx="6" cy="6" r="2.5" />
          <circle cx="18" cy="6" r="2.5" />
          <circle cx="12" cy="18" r="2.5" />
          <path d="M8.2 7.4 10 15.8M15.8 7.4 14 15.8M8.5 6h7" />
        </svg>
      );
    case "sales": // funnel — sales & conversion
      return (
        <svg {...common}>
          <path d="M3 5h18l-7 8v6l-4 2v-8L3 5Z" />
        </svg>
      );
  }
}
