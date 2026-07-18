/**
 * SINGLE SOURCE OF TRUTH for the /insights pillar section.
 *
 * Everything downstream derives from this module so nothing can drift:
 *  - the index cards + counts (/insights)
 *  - the hub post-lists (/insights/[pillar])
 *  - the post template (/insights/[pillar]/[post])
 *  - every JSON-LD graph (Blog / CollectionPage / BlogPosting / BreadcrumbList)
 *  - the sitemap entries
 *
 * Parity by construction: the same variables feed the visible JSX AND the
 * JSON-LD (via lib/jsonld.ts `jsonLd()`), so headline/description/section/
 * breadcrumb strings cannot diverge from what a reader sees.
 */

export const SITE = "https://www.bradleygriffin.us";
export const OG_IMAGE = SITE + "/assets/bradley-griffin-og.jpg";
export const PERSON_ID = SITE + "/#person";
export const BLOG_ID = SITE + "/insights/#blog";
export const CAL_URL = "https://calendly.com/optimzedseo/30min";

/** Launch dates — modified >= published, ISO-8601 with America/New_York offset. */
export const PUBLISHED = "2026-07-17T00:00:00-04:00";
export const MODIFIED = "2026-07-17T00:00:00-04:00";
export const SITEMAP_LASTMOD = "2026-07-17";

export type IconKey = "data" | "marketing" | "ai" | "sales";

export interface Cta {
  label: string;
  href: string;
}

export interface Pillar {
  slug: string;
  order: number;
  numeral: string; // "01".."04"
  icon: IconKey;
  /** Full display label — used in breadcrumbs, lateral row, and JSON-LD articleSection. */
  label: string;
  /** Sentence-case H1 shown on the hub and on index cards. */
  h1: string;
  /** Eyebrow / kicker: "Insights · <label>". */
  eyebrow: string;
  /** Index-card microlabel. */
  microlabel: string;
  /** Index-card one-line dek. */
  dek: string;
  /** Hub thesis (verbatim) — also the CollectionPage description. */
  thesis: string;
  /** Diagnosis-analogy thread paragraphs (the localized blood-test "reading"). */
  diagnosis: string[];
  /** 200-300w overview body paragraphs; may embed markdown links `[anchor](/path)`. */
  overview: string[];
  cta: Cta;
}

export interface Post {
  slug: string;
  pillarSlug: string;
  order: number;
  /** Exact visible H1 (<=110 chars) — also the BlogPosting headline. */
  title: string;
  /** One-sentence promise — also the BlogPosting description + card dek. */
  dek: string;
  datePublished: string;
  dateModified: string;
  cta: Cta;
  /** Verbatim body paragraphs; may embed markdown links `[label](/path)`. */
  body: string[];
  /**
   * In-body cluster paragraph rendered after the body: contains the single
   * up-link to the hub and the sibling link, as markdown links, descriptive
   * anchors only.
   */
  related: string;
}

/* ============================================================
   PILLARS  (order = reader urgency; flagship first)
   Overview + diagnosis copy is content-locked (bradley-content).
   ============================================================ */

export const pillars: Pillar[] = [
  {
    slug: "data-analytics",
    order: 1,
    numeral: "01",
    icon: "data",
    label: "Data & Analytics",
    h1: "Data and analytics",
    eyebrow: "Insights · Data & Analytics",
    microlabel: "Flagship",
    dek: "Reading the raw data, and finding the real problem under the symptom you can feel.",
    thesis:
      "Most companies measure activity, not the few numbers that actually predict growth. Read the raw data right and the real problem is almost never where the dashboard says it is.",
    diagnosis: [],
    overview: [
      `Every company I meet has data. Dashboards, reports, a tool for everything. What they do not have is a clear answer to one question: which numbers actually predict growth?`,
      `Most teams measure activity. Clicks, sends, meetings, tasks closed. Those numbers move every day, so they feel like progress. But activity is not the same as growth. You can be busy and flat at the same time.`,
      `The real problem is almost never where the dashboard points. The dashboard shows the symptom you can feel. It rarely shows the cause. To find the cause you have to read the raw data, not the summary.`,
      `That is why I start with an audit, not a plan. An audit is a blood test for your business: it shows the real diagnosis under the symptom you can feel, and like any blood test it takes a good doctor to read it and prescribe the fix. The blood panel tells you which number actually says you are sick.`,
      `When you read it right, the fix gets simple. You stop paying for the things that do not move growth. You double down on the few that do. Good months stop feeling like luck.`,
      `If your reports are loud but your growth is quiet, that is the place to look. It usually starts with [a data and platform audit](/consulting), or with [a fractional CMO who reads the data first](/fractional). Bring me the problem. I will bring the math.`,
    ],
    cta: { label: "Get in Touch", href: "/contact" },
  },
  {
    slug: "digital-marketing",
    order: 2,
    numeral: "02",
    icon: "marketing",
    label: "Digital Marketing",
    h1: "Digital marketing",
    eyebrow: "Insights · Digital Marketing",
    microlabel: "Channels & funnels",
    dek: "Why the channel is rarely the problem, and what to check before you spend more.",
    thesis:
      "When marketing \"isn't working,\" the channel is rarely the culprit. The problem is usually upstream, in the offer, the fit, or a funnel that leaks before the ad ever gets a fair shot.",
    diagnosis: [],
    overview: [
      `Most marketing problems get blamed on the wrong thing. The ads. The agency. The channel of the month. So the fix is always to spend more, or switch platforms, and hope.`,
      `The channel is rarely the culprit. When marketing is not working, the problem is usually upstream. The offer is weak. The fit is off. Or the funnel leaks before the ad ever gets a fair shot.`,
      `So before I touch the ad account, I check the vitals. An audit reads the numbers under the symptom you can feel and shows you where the money is actually leaking. You run the vitals before you write the prescription.`,
      `Nine times out of ten the money is not in a new channel. It is in fixing what happens before and after the click. A sharper offer. A page that converts. A follow-up that does not drop the lead.`,
      `If you are spending more and getting less, the answer is probably not another campaign. It is to [bring in a fractional CMO to fix it upstream](/fractional). Fix the upstream, and the same spend starts to work.`,
    ],
    cta: { label: "Get in Touch", href: "/contact" },
  },
  {
    slug: "ai-automation",
    order: 3,
    numeral: "03",
    icon: "ai",
    label: "AI & Automation",
    h1: "AI and automation",
    eyebrow: "Insights · AI & Automation",
    microlabel: "Build, not buzz",
    dek: "AI as a build tool, not a buzzword. Diagnose the process before you automate it.",
    thesis:
      "AI is a build tool, not a strategy. Automate a broken process and all you get is the wrong thing, faster and at scale.",
    diagnosis: [],
    overview: [
      `AI is being sold as the answer to everything right now. Every vendor has a bot. Every deck has a slide. The pressure to buy something is real, and it is loud.`,
      `Here is the part they skip. AI is a build tool, not a strategy. It makes things faster. It does not decide what is worth doing. Automate a broken process and all you get is the wrong thing, faster and at scale.`,
      `So I diagnose before I build. An audit finds the real problem under the symptom you can feel, so you automate the fix instead of the fault. Diagnosis comes before treatment, every time.`,
      `Once the process is sound, AI is genuinely useful. It clears busywork. It speeds up the work your team should be doing anyway. The point is to fix the thing first, then make the good version faster.`,
      `If you want AI to earn its keep, start with the process, not the tool. That is [the AI builds I actually do](/consulting). Get the workflow right, then let the machine run it.`,
    ],
    cta: { label: "Get in Touch", href: "/contact" },
  },
  {
    slug: "sales-conversion",
    order: 4,
    numeral: "04",
    icon: "sales",
    label: "Sales & Conversion",
    h1: "Sales and conversion",
    eyebrow: "Insights · Sales & Conversion",
    microlabel: "The last mile",
    dek: "The leak is usually after the lead, not before it. Fix the last mile.",
    thesis:
      "When growth stalls, the leak is usually after the lead, not before it. You are not short on leads. You are losing the ones you already paid for, at the step after the phone rings.",
    diagnosis: [],
    overview: [
      `Most companies that feel stuck reach for the same fix. More leads. Turn up the ad spend, buy another list, fill the top of the funnel. It rarely solves the thing that is actually broken.`,
      `When growth stalls, the leak is usually after the lead, not before it. You are not short on leads. You are losing the ones you already paid for, at the step after the phone rings.`,
      `One rate tells the story faster than any dashboard: how many of your leads actually book. If that number is low, more leads just means more waste.`,
      `I saw this at Vertex. The leads were fine. The booking rate was not. Only 16 percent of their calls turned into a booked job. So I built automated booking that routed each lead straight to sales, with no manual CRM entry, and fixed the step after the call instead of the top of the funnel. Booking went from 16 percent to 59 percent, with the same calls.`,
      `If your leads run hot then cold, look at the handoff, not the ad. It usually starts with [a data and platform audit of your booking and follow-up](/consulting). Stop the leak, and the leads you already have start to pay.`,
    ],
    cta: { label: "Get in Touch", href: "/contact" },
  },
];

/* ============================================================
   POSTS  (bodies verbatim from the anonymized drafts;
   front-matter + [Brad: confirm] footnotes stripped from render)
   ============================================================ */

export const posts: Post[] = [
  {
    slug: "audit-is-a-blood-test",
    pillarSlug: "data-analytics",
    order: 1,
    title: "Your audit is a blood test",
    dek:
      "Your audit is a blood test: it shows the real diagnosis under the symptom you can feel, and reading it right is the whole job.",
    datePublished: PUBLISHED,
    dateModified: MODIFIED,
    cta: { label: "Get in Touch", href: "/contact" },
    body: [
      `Most companies bring me a symptom.`,
      `Sales are soft. Leads dried up. The website "isn't converting." The last agency didn't move the needle. Something feels off, and nobody can quite say what.`,
      `That is a symptom. It is not the problem.`,
      `Think about how a good doctor works. You walk in tired. You feel run down. She does not guess and hand you a pill. She orders a blood test. The test does not care how you feel that morning. It shows what is actually going on inside you. Low iron. High sugar. A thyroid that slipped off its mark. It turns a vague complaint into a real diagnosis.`,
      `An audit does the same thing for a business.`,
      `I start at the source. Not a summary slide. Not last quarter's dashboard. The raw numbers, before anyone cleaned them up or built a story around them. That is the blood test. It does not care what the team said in the meeting. It shows what is true.`,
      `And here is what the test finds almost every time. The problem is not where people think it is.`,
      `They think they have a traffic problem. The data shows a conversion problem. They think they have a marketing problem. The data shows a sales problem, or a pricing problem, or a follow-up problem nobody owns. The symptom points one way. The blood test points somewhere else.`,
      `I saw this clearly at Vertex. The story going in was a growth story. We drove inbound calls up 490 percent. By every surface measure, marketing was winning.`,
      `Then I read the raw call data. The phone was ringing. The biggest lever was not more calls. It was what happened after the call connected. Only 16 percent of those calls turned into a booking. That was the real diagnosis. Not a marketing problem. A booking problem, sitting one step past where anyone was looking.`,
      `So I built the fix. I set up automated booking that sent each lead straight to the sales team, with no manual CRM entry. Booking went from 16 percent to 59 percent. Same calls. Far more business. You cannot fix that by buying more traffic. You can only fix it once the blood test tells you where the bleeding is.`,
      `This is the part most people skip. The test is not the cure.`,
      `A blood test that reveals low iron does nothing on its own. It takes a doctor to read it, weigh it against everything else, and prescribe the right remedy at the right dose. Read it wrong and you treat the wrong thing. A business audit is the same. The raw data is the diagnosis. Turning it into the right fix, in the right order, is the hard part. That is the job.`,
      `That is also why a dashboard alone rarely helps. A dashboard is a wall of numbers someone already decided to show you. It is the summary slide, not the blood panel. It tells you the story the last person wanted told. The real diagnosis is under it, in the data nobody put on the screen.`,
      `Most companies never order the blood test. They feel the symptom and they reach for the nearest pill. A new agency. A new logo. A bigger ad budget. More spend on the exact thing that is not broken. Then they wonder why the tired feeling comes back.`,
      `If your growth runs hot then cold, and no one can tell you why, you do not need another opinion. You need the test.`,
      `Read the raw data first. Diagnose the real problem. Then fix that, not the symptom you happened to notice.`,
      `That is the whole job, and it is the part almost everyone skips.`,
      `If your numbers are telling a story you don't quite trust, that is usually the tell. Something on the surface disagrees with something underneath. That gap is where the real problem lives.`,
      `I read that gap for a living. If you want a clear diagnosis of what is actually holding your growth back, and a plan to fix it, [Get in Touch](/contact).`,
    ],
    related:
      "This piece is one part of [a data and analytics audit that starts at the raw source](/insights/data-analytics). If you want the other half of that picture, read [why your attribution report is fiction](/insights/data-analytics/attribution-is-fiction).",
  },
  {
    slug: "attribution-is-fiction",
    pillarSlug: "data-analytics",
    order: 2,
    title: "Your attribution report is fiction",
    dek:
      "Your attribution report credits whatever stood closest to the sale, not what caused it, and here's the two-week test that shows the difference.",
    datePublished: PUBLISHED,
    dateModified: MODIFIED,
    cta: { label: "Get in Touch", href: "/contact" },
    body: [
      `Here is a number your attribution report will never show you.`,
      `How many of last month's sales would have happened anyway.`,
      `It cannot show you that. It was never built to. But that number is the whole game, and its absence is why most attribution reports are fiction dressed up as fact.`,
      `Let me be plain about what the report actually does. It takes every sale and hands the credit to whatever it could see last. A click. A form. A coupon code. It is not measuring what caused the sale. It is measuring what happened to be standing closest to the sale when it landed.`,
      `Those are not the same thing. They are almost never the same thing.`,
      `A customer sees your brand for months. A referral from a friend. A post that stuck. A billboard on the drive to work. Then, the day they are finally ready, they search your name and click one ad. The report gives that ad all the credit. The ad did not create the customer. It just answered the door.`,
      `So you do the logical thing. You pour more money into the channel the report praised. And the numbers hold up, for a while, because that channel keeps catching customers other things created. Then growth runs hot, then cold, and no one can tell you why.`,
      `That is the trap. The report is not lying about the click. It is lying by leaving everything else out.`,
      `I see this every time I open the raw data instead of the dashboard. The dashboard is a clean story. The raw data is a messier truth. And the truth usually says the channel getting the credit is not the channel doing the work.`,
      `I watched this play out at AcreValue. When I stepped in, growth had stalled and the business was sliding. The easy read was a demand problem. Buy more traffic, chase more leads, feed the top of the funnel.`,
      `The data said otherwise. The problem was not how many people arrived. It was what happened to them, and which efforts were actually moving them, once they did. We stopped funding the channels that looked good in the report and started funding the ones that were quietly doing the work. The business returned to growth, and it later sold. That turn did not come from spending more. It came from seeing clearly.`,
      `Here is the test I would run on your own report this week.`,
      `Turn off the channel your attribution says is your best performer. Not forever. For two weeks. Then watch total sales, not the channel's own number.`,
      `If total sales barely move, that channel was taking credit, not making sales. It was standing next to the money, not earning it. If total sales fall hard, good. Now you know something real. Either way, you learned more from two weeks of silence than from a year of the dashboard.`,
      `Most companies will never run that test. It feels reckless to turn off the thing the report calls the winner. So they keep paying the channel that shows up last and keep starving the ones that show up early. Then they blame the market when it stops working.`,
      `This is the quiet version of the same problem I see everywhere. A company is sure it has a marketing problem. What it really has is a visibility problem. It cannot see which of its own efforts are working, so every budget decision is a guess wearing a suit.`,
      `You do not fix that with a better dashboard. A better dashboard is a prettier version of the same blind spot. You fix it by going back to the raw data and asking a harder question. Not "what got the last click." "What actually changed the outcome."`,
      `That question is uncomfortable, because the honest answer is often not the channel you have been defending.`,
      `Attribution is not evil. It is just incomplete, and most people treat incomplete as gospel.`,
      `If your growth runs hot then cold and your reports can't tell you why, the report is probably the reason. I read the raw data underneath it and tell you what is actually working. If that is the clarity you want before your next budget call, [Get in Touch](/contact).`,
    ],
    related:
      "This piece is part of [a data and analytics audit of what's actually working](/insights/data-analytics). For the mindset underneath it, read [why a good audit works like a blood test](/insights/data-analytics/audit-is-a-blood-test).",
  },
];

/* ============================================================
   DERIVED ACCESSORS
   ============================================================ */

export function getPillars(): Pillar[] {
  return [...pillars].sort((a, b) => a.order - b.order);
}

export function getPillar(slug: string): Pillar | undefined {
  return pillars.find((p) => p.slug === slug);
}

/** Posts in a pillar, ordered. */
export function getPosts(pillarSlug: string): Post[] {
  return posts
    .filter((p) => p.pillarSlug === pillarSlug)
    .sort((a, b) => a.order - b.order);
}

export function getPost(pillarSlug: string, postSlug: string): Post | undefined {
  return posts.find((p) => p.pillarSlug === pillarSlug && p.slug === postSlug);
}

/** Honest index-card count label (no fake counts for empty hubs). */
export function countLabel(pillarSlug: string): string {
  const n = getPosts(pillarSlug).length;
  if (n === 0) return "First posts coming";
  return `${n} article${n === 1 ? "" : "s"}`;
}

export function pillarUrl(pillarSlug: string): string {
  return `${SITE}/insights/${pillarSlug}`;
}

export function postUrl(pillarSlug: string, postSlug: string): string {
  return `${SITE}/insights/${pillarSlug}/${postSlug}`;
}

/** The three OTHER pillars, for the lateral row. */
export function lateralPillars(currentSlug: string): Pillar[] {
  return getPillars().filter((p) => p.slug !== currentSlug);
}

/* ============================================================
   JSON-LD GRAPH BUILDERS  (plain objects → jsonLd() in routes)
   Fed the SAME variables that render the visible JSX.
   ============================================================ */

const personRef = { "@type": "Person", "@id": PERSON_ID, name: "Bradley Griffin" };

function crumb(position: number, name: string, item: string) {
  return { "@type": "ListItem", position, name, item };
}

/** /insights — Blog + BreadcrumbList in one @graph. */
export function indexGraph() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Blog",
        "@id": BLOG_ID,
        url: `${SITE}/insights`,
        name: "Insights",
        description:
          "Field notes on spotting the real problem before you spend more money fixing the wrong one. Across data, marketing, AI, and sales.",
        author: personRef,
        publisher: personRef,
        inLanguage: "en-US",
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          crumb(1, "Home", `${SITE}/`),
          crumb(2, "Insights", `${SITE}/insights`),
        ],
      },
    ],
  };
}

/** /insights/[pillar] — CollectionPage + inner ItemList + BreadcrumbList. */
export function hubGraph(pillar: Pillar) {
  const hubPosts = getPosts(pillar.slug);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        url: pillarUrl(pillar.slug),
        name: pillar.h1,
        description: pillar.thesis,
        isPartOf: { "@id": BLOG_ID },
        inLanguage: "en-US",
        mainEntity: {
          "@type": "ItemList",
          itemListElement: hubPosts.map((post, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: postUrl(pillar.slug, post.slug),
            name: post.title,
          })),
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          crumb(1, "Home", `${SITE}/`),
          crumb(2, "Insights", `${SITE}/insights`),
          crumb(3, pillar.label, pillarUrl(pillar.slug)),
        ],
      },
    ],
  };
}

/** /insights/[pillar]/[post] — BlogPosting + BreadcrumbList. */
export function postGraph(post: Post, pillar: Pillar) {
  const url = postUrl(pillar.slug, post.slug);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        headline: post.title,
        description: post.dek,
        datePublished: post.datePublished,
        dateModified: post.dateModified,
        author: personRef,
        publisher: personRef,
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        url,
        articleSection: pillar.label,
        image: OG_IMAGE,
        inLanguage: "en-US",
        isPartOf: { "@id": BLOG_ID },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          crumb(1, "Home", `${SITE}/`),
          crumb(2, "Insights", `${SITE}/insights`),
          crumb(3, pillar.label, pillarUrl(pillar.slug)),
          crumb(4, post.title, url),
        ],
      },
    ],
  };
}
