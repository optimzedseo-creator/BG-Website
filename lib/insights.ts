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

/** "The Difference" release (Articles 1 & 2) — same date/offset convention. */
export const RELEASE_PUBLISHED = "2026-07-24T00:00:00-04:00";
export const RELEASE_MODIFIED = "2026-07-24T00:00:00-04:00";
export const RELEASE_SITEMAP_LASTMOD = "2026-07-24";

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
      `If your reports are loud but your growth is quiet, that is the place to look. It usually starts with [a data and platform audit](/consulting), or with [a fractional CMO who reads the data first](/fractional). Bring me the problem. I will provide the solution.`,
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
  {
    slug: "agency-can-win-while-you-lose",
    pillarSlug: "data-analytics",
    order: 3,
    title: "Your agency can win while you lose",
    dek:
      "The retainer pays whether your revenue moves or not. That is not a bug in the agency model. It is the model.",
    datePublished: RELEASE_PUBLISHED,
    dateModified: RELEASE_MODIFIED,
    cta: { label: "Get in Touch", href: "/contact" },
    body: [
      `There is a hard truth most agencies will never put in a pitch deck.`,
      `They can win while you lose.`,
      `Not because they are evil. Because of how the deal is built. The retainer clears on the first of the month whether your revenue moved or not. The invoice does not know if you grew. That single fact bends everything that happens next.`,
      `Follow the incentive and you can predict the behavior.`,
      `If an agency gets paid for activity, it will sell you activity. More posts. More emails. More campaigns. A busier dashboard. All of it real work, none of it promised to change the number that actually matters. You are buying motion and calling it progress.`,
      `Then come the vanity metrics. Impressions. Reach. Engagement. Open rates. Numbers that always go up and to the right, because they are chosen to. They make the monthly report look like a win. They rarely touch revenue. A metric that cannot go down is not a measurement. It is a comfort blanket.`,
      `And when results do not come, no one is on the hook. This is the quiet genius of the agency model. An agency is faceless, and faceless is blameless. You do not know who touched your account. You cannot point to the person who made the call. When it underperforms, the work gets "optimized," a new junior name shows up on the email chain, and the retainer renews. Accountability has nowhere to land.`,
      `It gets worse under the surface. The person who sold you is not the person doing the work. The work is often handed down, then handed out, to a white-label shop or an offshore team you were never told about. You are paying senior rates for whoever is cheapest that week. You will never meet them. You were never supposed to.`,
      `I want to be fair here, because this is a structural problem, not a character one. There are good people inside agencies doing honest work. But good people inside a broken incentive still answer to the incentive. The model rewards billable activity and punishes nobody for missing results. Put anyone in that system long enough and the system wins.`,
      `So here is what I built instead. One name. Mine.`,
      `I am the direct point of contact, one hundred percent of the time. Nothing is farmed out to a shop you cannot see. When the work moves your number, that is on me. When it does not, that is on me too. You always know exactly who is accountable, because there is only one person it could be.`,
      `And I start where agencies never do. Before the building, the diagnosis. I confirm the real problem first, so you stop paying to fix the one you only think you have. Most companies are sure they have a marketing problem. Often they have a conversion problem, or a pricing problem, or a follow-up problem nobody owns. Spend against the wrong diagnosis and the money is gone before the work even starts.`,
      `I saw it at Vertex. Inbound calls were up 490 percent. Marketing looked like the winner. The raw data said the real leak was after the call connected. Only 16 percent booked. Fix the diagnosis, not the symptom, and booking went to 59 percent. Same calls. Far more business. No amount of extra activity would have found that.`,
      `Then everything ties to a target you can check. Concrete steps. SMART goals. Follow-up audits that prove the number moved, or prove it did not. If it did not, we see it early and we adjust. That is the opposite of a metric picked to always look good.`,
      `That is the whole difference. An agency sells you effort and stays out of the blast radius. I find what is actually wrong, put my name on the fix, and let the results grade the work.`,
      `My mission is simple. To keep companies from paying firms that win even when their clients lose.`,
      `If you are tired of buying activity and hoping it turns into growth, [Get in Touch](/contact). I will tell you what is actually wrong first.`,
    ],
    related:
      "This piece is part of [a data and analytics audit that starts at the raw source](/insights/data-analytics). For the tooling side of the same story, read [why you can't fix what you can't see](/insights/data-analytics/you-cant-fix-what-you-cant-see). For the mindset underneath it, read [why a good audit works like a blood test](/insights/data-analytics/audit-is-a-blood-test) and [why your attribution report is fiction](/insights/data-analytics/attribution-is-fiction).",
  },
  {
    slug: "you-cant-fix-what-you-cant-see",
    pillarSlug: "data-analytics",
    order: 4,
    title: "You can't fix what you can't see",
    dek:
      "Most agency reports miss the real problem for two reasons. The incumbent has no reason to surface it, and the tooling can't build the cut that would. Here's the difference, and how I read past both.",
    datePublished: RELEASE_PUBLISHED,
    dateModified: RELEASE_MODIFIED,
    cta: { label: "Get in Touch", href: "/contact" },
    body: [
      `Every agency reports. Almost none of them report on the thing that is actually wrong.`,
      `That sounds like an accusation. It is really two separate problems wearing the same coat. One is about incentive. One is about tooling. They land in the same place: the number that would tell you the truth never makes it onto the page.`,
      `Start with the one nobody says out loud.`,
      `If an agency is the incumbent, and the report shows a real performance gap, that report is a confession. It says either we cannot see the problem or we cannot solve it. So the gap quietly does not get surfaced. Not always on purpose. But the incentive only points one way, and it does not point at the truth. The people paid to fix the problem are the same people writing the report card on the problem. You already know how that grades.`,
      `That is the won't.`,
      `The can't is quieter, and in a way more honest.`,
      `Most reports only show you the dimensions someone already decided to build. Sessions. Source. Device. Landing page. The columns are pre-built, and you are free to slice the columns you were handed. What you cannot do is ask a question the report was never built to answer. The report is not hiding anything. It just does not have the column.`,
      `So a gap opens up on its own. Not from bad faith. From a hard limit on what the software can see. And you cannot fix what you cannot see.`,
      `Here is where my work is different, and it is worth showing you the actual move instead of just claiming it.`,
      `I do not start with the dashboard. I start with the raw data, before anyone rolled it into a report. I clean it until it is usable. Then I do the part the dashboard cannot. I build new columns.`,
      `The raw data has whatever it has. But sitting inside it are dimensions nobody labeled. So I engineer them. I take the search terms and tag each one brand or non-brand, because someone typing your name and someone who has never heard of you are two completely different businesses, and the standard report files them under the same word: organic. I take the same rows and split locational searches from business-unit searches, because "plumber near me" and "commercial pipe lining" are not the same customer, even though the tool counts them in one bucket.`,
      `Those columns do not exist in the source. I create them from it.`,
      `And once they exist, I can cut the data in ways a pre-built report has no dimension for. Brand versus non-brand. Location versus line of business. The cross-sections that tell you which part of your growth is real demand and which part is just people who already knew your name. That is not a setting I turned on. It is analysis, and it lives in columns nobody built until I built them.`,
      `That is depth inside one source. Here is the part that no single tool can do at all.`,
      `Every system is boxed into its own data. Analytics sees the website. The CRM sees the leads. The ad platform sees the spend. Call tracking sees the calls. Each one is honest about its own little yard, and blind to everything on the other side of the fence. That is why one dashboard can never tell you the whole truth. It was never allowed to look past its own fence.`,
      `So I audit each system on its own, then I bring the results together into one master roll-up. I map the metrics from every source into a single view and read the ecosystem through several lenses at once. No single platform's native reporting builds this for you, because each one only sees its own side of the fence. Stitching them together is the analyst's job, not a setting.`,
      `And that is where the real proof shows up. When a problem is true, it does not appear in one system. It shows up in all of them. The website data says one thing, the CRM says the same thing, the call data agrees. Now it is not a hunch from a single report. It is confirmed from three directions. That is the difference between guessing and knowing.`,
      `That is the whole moat, and it is not magic. Depth inside each source, from columns I build that the tool never shipped. Breadth across every source, from a roll-up no single tool can produce. One tells you what is really happening in a system. The other confirms it across all of them. Together they answer the question your business is actually asking, which is usually the one your last three reports skipped.`,
      `If your reports look fine but your growth does not, that gap is the tell. The answer is almost never in the columns you were handed, or inside any one tool's fence. It takes someone who will read the raw data, build the cut nobody built, and line up every source until the real problem has nowhere left to hide. If that is the clarity you want, [Get in Touch](/contact).`,
    ],
    related:
      "This piece is part of [a data and analytics audit of what's actually working](/insights/data-analytics). For the incentive side of the same story, read [how your agency can win while you lose](/insights/data-analytics/agency-can-win-while-you-lose). For the mindset underneath it, read [why a good audit works like a blood test](/insights/data-analytics/audit-is-a-blood-test) and [why your attribution report is fiction](/insights/data-analytics/attribution-is-fiction).",
  },
  {
    slug: "not-a-marketing-problem",
    pillarSlug: "data-analytics",
    order: 5,
    title: "The problem shows up in marketing. It doesn't always live there.",
    dek:
      "Your marketing data is where the problem shows up, rarely where it lives, and tracing the symptom back to its real cause is the whole job.",
    datePublished: RELEASE_PUBLISHED,
    dateModified: RELEASE_MODIFIED,
    cta: { label: "Get in Touch", href: "/contact" },
    body: [
      `When growth stalls, the numbers that look worst are almost always marketing numbers. Leads are down. Cost per lead is up. The funnel is leaking. So that is where everyone looks.`,
      `Sometimes they are right. The problem really is in marketing, and I fix it. The offer is soft. The targeting is lazy. The funnel drops people it should keep. That is my lane, and I know how to close those gaps.`,
      `Just as often, the marketing data is lying about where the problem lives. Not on purpose. Marketing is just the first place a problem shows up. A weak sales handoff, a call center that misses, a pricing mistake, a follow-up nobody owns. All of it lands in the marketing numbers first. The dashboard says marketing. The cause is three rooms away.`,
      `The marketing data is smoke. Sometimes the fire is in marketing. Sometimes it is somewhere else entirely. My job is to find the fire, not to hose down the smoke.`,
      `Two companies can walk in with the exact same symptom, leads down and cost per lead up, and have two completely different problems. One needs a better offer. The other needs to fix what happens after the lead comes in. Same dashboard, opposite fixes. Guess wrong and you spend a year and a budget on the wrong room.`,
      `Here is why reading that difference is rare. Ask an agency what is wrong and the answer is always the same: buy more marketing. More ads, more channels, more retainer. Not because they are dishonest. Because that is what they sell. When the only thing you sell is marketing, every problem looks like a marketing problem.`,
      `My incentive runs the other way. I do not win by selling you more spend. I win by finding the real problem, wherever it is. So when the cause is not in marketing, I have every reason to say so. That is the whole value.`,
      `The cost of getting this wrong is brutal, and I have watched it happen. Growth slips. The numbers look like marketing. So leadership blames the marketer, then fires the marketer, then hires a new one to fix a problem that was never in marketing. Nothing changes, because nothing was actually wrong with the marketing. The door keeps spinning, and the real problem sits there untouched.`,
      `I saw the clean version of this at Vertex. On the surface it was a marketing win. We drove inbound calls up 490 percent. If you stopped at the marketing dashboard, you would have called it a success and moved on.`,
      `I did not stop there. I traced the calls past the point where marketing hands off. Only 16 percent of them turned into a booked job. The phone was ringing. The business was leaking at the step right after it rang. That is not a marketing problem. It is a booking problem, hiding inside a marketing number that looked great.`,
      `So I built the fix where the fire actually was. Automated booking that routed each lead straight to the sales team, with no manual CRM entry. Booking went from 16 percent to 59 percent, on the same calls. No new traffic. We just stopped the bleeding one room over from where everyone was looking.`,
      `My book is called "It's Not a Marketing Problem." That is the provocative version, and it is true more often than most companies want to admit. The honest version is sharper: the problem shows up in your marketing data, and the data will not tell you where it actually lives. Sometimes it is marketing. Sometimes it is not. Reading the difference is the job.`,
      `If your marketing numbers look wrong and no one can tell you why, that gap is the tell. [Get in Touch](/contact) and I will trace it to the real problem, wherever it turns out to live.`,
    ],
    related:
      "This piece is the spine of [a data and analytics audit that starts at the raw source](/insights/data-analytics). For how I read that raw data, see [why your audit is a blood test](/insights/data-analytics/audit-is-a-blood-test); for what it exposes about your channels, [why your attribution report is fiction](/insights/data-analytics/attribution-is-fiction).",
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
