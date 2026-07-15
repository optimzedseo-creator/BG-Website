/**
 * Single source of truth for the /writing surface.
 * The index page renders this list; each article page reads its own entry
 * (by slug) so titles, dates, and canonical URLs never drift between the
 * listing, the article header, and the JSON-LD.
 *
 * Content note: every post is drawn from Brad's own book chapters / hot-takes
 * (see .claude/bradley-team/HOT-TAKES-AND-PRINCIPLES.md). No invented metrics,
 * clients, or claims; no roofing/siding/windows examples (standing exclusion).
 */

export type WritingPost = {
  slug: string;
  title: string; // article headline, sentence case
  dek: string; // one-line summary shown on the index
  description: string; // meta description
  datePublished: string; // ISO 8601
  dateModified: string; // ISO 8601
  readingMins: number;
};

export const WRITING_URL = "https://www.bradleygriffin.us/writing";
export const OG_IMAGE = "https://www.bradleygriffin.us/assets/bradley-griffin-og.jpg";
export const PERSON_ID = "https://www.bradleygriffin.us/#person";

/* Newest first. The index renders in array order. */
export const writingPosts: WritingPost[] = [
  {
    slug: "its-not-a-marketing-problem",
    title: "It's not a marketing problem",
    dek: "Marketing is a multiplier. Multiply a business that doesn't work and you get the same broken business, faster and louder and at greater expense.",
    description:
      "You can't market your way out of a broken operation. Marketing is a multiplier, and multiplying a business that doesn't work just makes the problem more expensive.",
    datePublished: "2026-07-14",
    dateModified: "2026-07-14",
    readingMins: 3,
  },
  {
    slug: "attribution-reports-are-fiction",
    title: "Most attribution reports are fiction with a dashboard",
    dek: "A clean chart is not the same thing as the truth. Most attribution reports are a story the tools tell you about themselves.",
    description:
      "A clean dashboard is not the same as the truth. Why most marketing attribution reports are a story the tools tell about themselves, and what to trust instead.",
    datePublished: "2026-07-09",
    dateModified: "2026-07-09",
    readingMins: 3,
  },
  {
    slug: "leads-run-hot-then-cold",
    title: "Your leads run hot then cold. That's a systems problem.",
    dek: "When lead quality swings from month to month, the lead usually isn't what changed. The system around it is.",
    description:
      "When lead quality swings from month to month, the lead usually isn't what changed. The system around it is. Speed, follow-up, and the calendar decide the outcome.",
    datePublished: "2026-07-02",
    dateModified: "2026-07-02",
    readingMins: 3,
  },
];

export function getPost(slug: string): WritingPost | undefined {
  return writingPosts.find((p) => p.slug === slug);
}

/** Format an ISO date as "July 14, 2026" for display. */
export function displayDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
