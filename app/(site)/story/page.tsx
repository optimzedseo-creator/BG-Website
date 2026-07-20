import type { Metadata } from "next";
import PhotoFrame from "@/components/PhotoFrame";

const TITLE = "From Army Ranger to CMO - The Bradley Griffin Story";
const DESCRIPTION =
  "From the 75th Ranger Regiment to the boardroom: a parachute malfunction at altitude, twenty-five seconds to fix it, and the standard behind two exits and a NASDAQ acquisition.";
const URL = "https://www.bradleygriffin.us/story";
const OG_IMAGE = "https://www.bradleygriffin.us/assets/bradley-griffin-og.jpg";

/*
 * C1 MIGRATION NOTE: metadata + JSON-LD are FROZEN at the live values
 * (already canonical — the meta description says "twenty-five seconds").
 * The C1 rebuild changes visible copy only; the mockup story copy is the
 * audited migration draft (C1-CONTENT-MAP §3) and FIXES two live defects:
 * the garbled ch-05 IHS sentence and the timeline's "thirty-second decision".
 */
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: URL },
  openGraph: {
    siteName: "Bradley Griffin",
    type: "profile", // legacy story page uses og:type "profile"
    title: TITLE,
    description: DESCRIPTION,
    url: URL,
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
};

/* JSON-LD carried over VERBATIM from the legacy page (byte-identical). */
const storyJsonLd =
  '{"@context": "https://schema.org", "@graph": [{"@type": "AboutPage", "url": "https://www.bradleygriffin.us/story", "name": "The Story - Bradley Griffin", "mainEntity": {"@type": "Person", "@id": "https://www.bradleygriffin.us/#person", "name": "Bradley Griffin"}}, {"@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.bradleygriffin.us/"}, {"@type": "ListItem", "position": 2, "name": "The Story", "item": "https://www.bradleygriffin.us/story"}]}]}';

/*
 * C1 story page (Tier F). Chapter anchor ids #ch-01…#ch-07 are PUBLIC
 * CONTRACT (the home arc cards deep-link them) — never rename without a
 * redirect check. Photo slots per C1-DESIGN-SYSTEM §4: real library assets
 * where they exist, brand-gradient stand-ins where they don't. The child-
 * visible brad-family-lake.jpg does NOT carry over (slot 8 is adult-only
 * pending Brad's explicit call).
 */
export default function StoryPage() {
  return (
    <div className="c1 c1-story">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: storyJsonLd }} />

      {/* ======= STORY HERO ======= */}
      <section className="s-hero" id="top">
        <div className="wrap s-hero-grid">
          <div>
            <span className="microlabel">My story</span>
            <h1>Before the boardroom, <em>the jump.</em></h1>
            <p className="lede">
              Executives like to talk about pressure. I measure it differently. This is the part of the
              record that never fits on a r&eacute;sum&eacute;: <strong>the 75th Ranger Regiment, a parachute
              malfunction at altitude, and the twenty-five seconds</strong> that have governed every decision
              I&rsquo;ve made since. Two companies built and sold, a NASDAQ acquisition, and a region that now
              leads a national platform. All of it traces back to a standard set at Fort Benning.
            </p>
            <p className="jump-row">
              <span>Seven chapters</span>
              <span>2005 to today</span>
              <span>No embellishment required</span>
            </p>
          </div>
          <PhotoFrame
            ratio="3/4"
            tone="sepia"
            src="/assets/military-griffin-solo.jpg"
            alt="A young Bradley Griffin in U.S. Army dress uniform and beret"
            caption={"Bradley Griffin · U.S. Army"}
            sizes="(max-width: 860px) 100vw, 40vw"
            className="reveal"
          />
        </div>
      </section>

      {/* ======= CH 01 — FORT BENNING ======= */}
      <section className="chapter" id="ch-01">
        <div className="wrap ch-grid" data-px="stack">
          <div className="ch-rail reveal">
            <div className="ch-num">01</div>
            <div>
              <span className="microlabel">Fort Benning</span>
              <p className="ch-meta">Fort Benning, Georgia<br />U.S. Army &middot; 2005</p>
            </div>
            <div className="rule"></div>
          </div>
          <div className="ch-body reveal">
            <h2>The standard <em>finds you first.</em></h2>
            <p className="prose">I was selected for the 75th Ranger Regiment, one of the most elite special operations units the United States military fields. People imagine that path as a highlight reel. It isn&rsquo;t. The path to a Ranger unit is not designed to build you up. It is designed to find the exact point where you break, and then ask you, plainly and repeatedly, whether you intend to continue. Most men answer no. Nobody blames them.</p>
            <p className="pullq" data-px="float">The training isn&rsquo;t designed to build you up. It&rsquo;s designed to find where you break, and ask whether you intend to continue.</p>
            <p className="prose">What the Regiment actually equips you with isn&rsquo;t gear. It&rsquo;s a code: <strong>integrity, honor, and a sense of duty</strong> that places the mission above your own security, because the mission is usually a matter of life and death, and trust between Rangers has to be absolute. I have carried that into every room I&rsquo;ve entered since.</p>
            <p className="motto"><span>&middot; Rangers lead the way</span><span>&middot; Sua Sponte</span></p>
            <div className="ch-figs">
              <PhotoFrame
                ratio="4/3"
                tone="sepia"
                src="/assets/military-jumpwings.jpg"
                alt="A young Bradley Griffin in uniform with a fellow soldier, holding their newly earned parachutist wings at Airborne School"
                caption={"Airborne School · the day the wings were pinned"}
                sizes="(max-width: 860px) 100vw, 320px"
              />
              <PhotoFrame
                ratio="4/3"
                tone="sepia"
                src="/assets/military-three-generations.jpg"
                alt="Bradley Griffin in Army dress uniform and beret, flanked by his father and grandfather on graduation day"
                caption={"Graduation day · a proud legacy"}
                sizes="(max-width: 860px) 100vw, 320px"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ======= CH 02 — THIRTY SECONDS (dark) — the parachute account is KB-CANONICAL and FROZEN ======= */}
      <section className="chapter dark" id="ch-02">
        <div className="wrap ch-grid" data-px="stack">
          <div className="ch-rail reveal">
            <div className="ch-num">02</div>
            <div>
              <span className="microlabel">Thirty seconds</span>
              <p className="ch-meta">Airborne operation<br />One jump &middot; one decision</p>
            </div>
            <div className="rule"></div>
          </div>
          <div className="ch-body reveal">
            <h2>The canopy opened <em>wrong.</em></h2>
            <p className="prose">A jump is a procedure. You rehearse it until it is boring, because boring is what keeps planeloads of men alive. A normal jump gives you about sixty seconds under canopy. Mine had run exactly as drawn a dozen times. Then one didn&rsquo;t. I exited the aircraft the way I had been trained to, and looked up at a canopy rolled tight on itself. Jumpers call it a cigarette roll. Open, but not flying.</p>
            <p className="prose">What I had was <strong>maybe twenty-five seconds</strong>. I pulled the risers apart with everything I had and kicked a bicycle motion to spin the twist out of the lines. The canopy unwound, and left me oscillating so hard I couldn&rsquo;t read my own speed or direction of fall. There was no committee. No second opinion. No more altitude coming.</p>
            <p className="prose">The fix is why I&rsquo;m alive. It is not why I&rsquo;m whole. The landing tore my right leg up badly, and here is what that unit does to your standards: I got up and covered the <strong>five miles</strong> to catch up with my jump stick on that leg. The injuries ended with an <strong>honorable medical discharge</strong>. In 2007 I took the uniform off for the last time.</p>
            <p className="pullq" data-px="float">A parachute accident ended my military career. It didn&rsquo;t end the standard it set.</p>
          </div>
        </div>
      </section>

      {/* ======= OFFER INTERSTITIAL 1 — trust peak S1, after the jump ======= */}
      <section className="inter">
        <div className="wrap inter-in reveal">
          <div>
            <span className="microlabel">Why this chapter matters to you</span>
            <h3>Every business decision since has been easier than that jump. I&rsquo;ve made every one of them like it mattered as much.</h3>
            <p className="sig">Bring me the problem. I&rsquo;ll provide the solution.</p>
          </div>
          <a className="btn btn-solid" href="/contact">Start a conversation <span className="arr">&rarr;</span></a>
        </div>
      </section>

      {/* ======= CH 03 — STARTING OVER ======= */}
      <section className="chapter" id="ch-03">
        <div className="wrap ch-grid" data-px="stack">
          <div className="ch-rail reveal">
            <div className="ch-num">03</div>
            <div>
              <span className="microlabel">Starting over</span>
              <p className="ch-meta">CDW, then Toshiba<br />The sales floors</p>
            </div>
            <div className="rule"></div>
          </div>
          <div className="ch-body reveal">
            <h2>Revenue, learned <em>from the ground.</em></h2>
            <p className="prose">There is no field on a civilian r&eacute;sum&eacute; for &ldquo;held to the Ranger standard.&rdquo; The market didn&rsquo;t owe me anything for it, and I didn&rsquo;t ask. I started where revenue actually starts: on the floor. At <strong>CDW</strong>, as an account manager, I learned that every dollar on an income statement began as one person keeping a promise to another.</p>
            <p className="prose">Then <strong>Toshiba</strong>: outside sales rep, Hawaii. Paradise, if you&rsquo;ve never carried a quota through it. I worked the territory the way I&rsquo;d been taught to work an operation. Plan, execute, debrief, adjust, repeat. <strong>Eighteen months later I was the sales manager.</strong> Not because anyone handed it over. Because the numbers kept making the argument for me.</p>
            <p className="prose">Those years are why no dashboard has ever been able to lie to me. I know what the frontline knows, because I have been the frontline.</p>
          </div>
        </div>
      </section>

      {/* ======= CH 04 — TEAM OF ONE (dark) ======= */}
      <section className="chapter dark" id="ch-04">
        <div className="wrap ch-grid" data-px="stack">
          <div className="ch-rail reveal">
            <div className="ch-num">04</div>
            <div>
              <span className="microlabel">Team of one</span>
              <p className="ch-meta">Founder &times;2 &middot; exits &times;2<br />2011 to 2018</p>
            </div>
            <div className="rule"></div>
          </div>
          <div className="ch-body reveal">
            <h2>Every seat, <em>earned the hard way.</em></h2>
            <p className="prose">In 2011 I founded <strong>Optimized</strong>, and for a long stretch the entire company was me. By day I was the whole sales team: the cold calls, the pipeline, the proposals, the contracts. By night I was the whole delivery team: the SEO, the PPC, the social campaigns, the web development. Every deliverable a client paid for passed through my hands, because there were no other hands.</p>
            <p className="pullq" data-px="float">By day I was the entire sales team. By night, the entire delivery team. There were no other hands.</p>
            <p className="prose">It never took a dollar of outside money. Optimized bootstrapped its way to <strong>23 employees, $5M in revenue, and seven satellite offices</strong> across the continental U.S., then sold to a UK equity firm. Alongside it I co-founded <strong>Florida Landscaping Services</strong>, a partnership that ended in a successful exit. Every role I hire for today, I have personally done.</p>
            <p className="prose">And in 2018, while running companies, I took on a different kind of build: a <strong>U.S. congressional campaign, constructed from zero</strong>. The organization, the field operation, the communications, all of it stood up from nothing, culminating in a <strong>live debate on statewide PBS</strong>, unscripted, under the lights. As a test of leadership and communication under maximum public pressure, there is nothing else like it in civilian life.</p>
          </div>
        </div>
      </section>

      {/* ======= CH 05 — THE EXECUTIVE YEARS (fixes the live garbled IHS sentence) ======= */}
      <section className="chapter" id="ch-05">
        <div className="wrap ch-grid" data-px="stack">
          <div className="ch-rail reveal">
            <div className="ch-num">05</div>
            <div>
              <span className="microlabel">The executive years</span>
              <p className="ch-meta">Head of Marketing to CMO<br />2019 to today</p>
            </div>
            <div className="rule"></div>
          </div>
          <div className="ch-body reveal">
            <h2>The system, <em>proven at scale.</em></h2>
            <p className="prose">The operator years came next, the ones a r&eacute;sum&eacute; lists cleanly and the work never was. At <strong>Wensco</strong> I owned every outcome, and the records for sales, revenue, and growth fell one after another.</p>
            <p className="prose">Then <strong>AcreValue</strong>, the one that proved the system travels. I came in fractional: a platform with 1.5 million users and recurring revenue that had declined two straight years. I rebuilt the go-to-market from the inside sales calls out, repositioned the product, returned MRR to growth, and set the table for the ending: <strong>acquisition by CoStar Group, a NASDAQ company</strong>. A turnaround that ends on a stock ticker doesn&rsquo;t need adjectives.</p>
            <p className="prose"><strong>Atrium</strong> handed me a $25M budget across six brands, and it was deployed the way a budget that size should be: with discipline, attribution, and zero sentiment. <strong>Vertex</strong> made me Chief Marketing Officer, and within four months inbound calls were up 490% and the booking rate had gone from 16% to 59%. Today I run Midwest marketing for <strong>Infinity Home Services</strong>, and the region leads the entire company: the #1 performing region, with double-digit year-over-year sales growth.</p>
            <PhotoFrame
              ratio="16/9"
              tone="room"
              caption={"The session room, morning of the talk"}
              className="ch-fig-wide"
            />
          </div>
        </div>
      </section>

      {/* ======= OFFER INTERSTITIAL 2 — trust peak S2, after the record: the four doors ======= */}
      <section className="inter">
        <div className="wrap reveal">
          <span className="microlabel">Put the record to work</span>
          <h3>You&rsquo;ve just read the track record. It&rsquo;s available in four shapes.</h3>
          <div className="mini-offers">
            <a className="mo" href="/fractional"><span className="of-k">Ongoing</span><h4>Hire me fractionally</h4><p>Part-time executive leadership, embedded with your team.</p></a>
            <a className="mo" href="/consulting"><span className="of-k">Defined scope</span><h4>Hire me for a project</h4><p>A raw-data audit or an AI build, one clear deliverable.</p></a>
            <a className="mo" href="/speaking"><span className="of-k">Events</span><h4>Book me to speak</h4><p>Strategy, competition, and AI, delivered with composure.</p></a>
            <a className="mo" href="/executive"><span className="of-k">Full-time</span><h4>Hire me as an executive</h4><p>CMO, CEO, or senior growth leadership, P&amp;L-accountable.</p></a>
          </div>
        </div>
      </section>

      {/* ======= CH 06 — THE UNFINISHED DEGREE (dark) ======= */}
      <section className="chapter dark" id="ch-06">
        <div className="wrap ch-grid" data-px="stack">
          <div className="ch-rail reveal">
            <div className="ch-num">06</div>
            <div>
              <span className="microlabel">The unfinished degree</span>
              <p className="ch-meta">Central Michigan to Auburn<br />2025 to 2027</p>
            </div>
            <div className="rule"></div>
          </div>
          <div className="ch-body reveal">
            <h2>Unfinished is not <em>a word I keep.</em></h2>
            <p className="prose">There was one item left open on the ledger, and it had been open for twenty years. I left for the Army before the bachelor&rsquo;s degree was done, and life kept not requiring it. The companies didn&rsquo;t ask. The campaigns didn&rsquo;t ask. The C-suites didn&rsquo;t ask. But the standard doesn&rsquo;t accept &ldquo;not required.&rdquo;</p>
            <p className="prose">So I went back. <strong>Central Michigan University</strong>, while simultaneously running a $25M growth engine at work. I finished <strong>summa cum laude, with a 3.97</strong>, twenty years after the first credit was earned. I did it to be a good example to my children: you can do it, and it doesn&rsquo;t have to happen in any specific order of life. Then, because a standard doesn&rsquo;t know how to stop, I enrolled again: a <strong>dual MBA and M.S. in Information Systems at Auburn University</strong>, on schedule for 2027.</p>
            <p className="pullq" data-px="float">Twenty years later: summa cum laude, 3.97. Earned nights and weekends, next to a $25M P&amp;L.</p>
            <p className="prose">People ask what a Ranger tab has to do with marketing. Everything. The plan. The rehearsal. The brutal honesty about what the data actually says. <strong>Discipline isn&rsquo;t a slide in my deck. It&rsquo;s the operating system.</strong></p>
          </div>
        </div>
      </section>

      {/* ======= CH 07 — OFF THE CLOCK (adult-only frames per slot 8) ======= */}
      <section className="chapter" id="ch-07">
        <div className="wrap ch-grid" data-px="stack">
          <div className="ch-rail reveal">
            <div className="ch-num">07</div>
            <div>
              <span className="microlabel">Off the clock</span>
              <p className="ch-meta">Michigan, by choice<br />Family &middot; water &middot; faith</p>
            </div>
            <div className="rule"></div>
          </div>
          <div className="ch-body reveal">
            <h2>The r&eacute;sum&eacute; stops <em>at the water&rsquo;s edge.</em></h2>
            <p className="prose">Everything above is what I do. It is not the whole of what I am. Before any title on this page, I&rsquo;m a husband and a father, a family man building a life in Michigan, which is what all the other chapters were for.</p>
            <p className="prose">When the calendar allows, we&rsquo;re outside: Michigan lakes and long days on the water. Time outdoors keeps honest books. The water doesn&rsquo;t care what you ran last quarter, and neither do the people who matter most.</p>
            <p className="prose">And I&rsquo;m a Christian. I don&rsquo;t lead meetings with it, and I won&rsquo;t hide it either. The standards named throughout this story, <strong>integrity, service, stewardship</strong>, didn&rsquo;t come out of a leadership book. They come from somewhere deeper, and they don&rsquo;t clock out when I do.</p>
            <p className="pullq" data-px="float">One standard: at home, in the field, and in the boardroom.</p>
            <div className="ch-figs">
              <PhotoFrame
                ratio="4/3"
                tone="dusk"
                src="/assets/brad-lake-fishing.jpg"
                alt="Bradley Griffin casting from a boat on a Michigan lake at dusk"
                caption={"Michigan water · honest books"}
                sizes="(max-width: 860px) 100vw, 320px"
              />
              <PhotoFrame ratio="4/3" tone="dusk" caption={"Before the hunt · off the clock"} />
            </div>
          </div>
        </div>
      </section>

      {/* ======= TIMELINE — self-drawing spine (fixes the live "thirty-second decision") ======= */}
      <section className="tl" id="timeline">
        <div className="wrap">
          <div className="tl-head reveal">
            <span className="microlabel">The record, laid out</span>
            <h2>Twenty years, <em>one line.</em></h2>
            <p>Every chapter above, laid end to end. No gaps, no gloss. The same standard, applied to whatever the year demanded.</p>
          </div>
          <div className="tl-cols reveal">
            <div className="tl-col">
              <div className="tl-item"><span className="yr">2005 to 2007</span><h4>U.S. Army &middot; 75th Ranger Regiment</h4><p>Airborne Ranger, Fort Benning. A parachute malfunction, a twenty-five-second decision, and an honorable medical discharge that ended the career, not the standard.</p></div>
              <div className="tl-item"><span className="yr">2007 to 2011</span><h4>The sales floors</h4><p>CDW account manager, then Toshiba outside sales in Hawaii. Promoted to sales manager in eighteen months.</p></div>
              <div className="tl-item"><span className="yr">2011 to 2018</span><h4>Founder &times;2 &middot; exits &times;2</h4><p>Optimized: a team of one, bootstrapped to 23 employees, $5M, and seven satellite offices, sold to a UK equity firm. Florida Landscaping Services: co-founded, exited successfully.</p></div>
              <div className="tl-item"><span className="yr">2018</span><h4>U.S. congressional candidate</h4><p>Built a full campaign organization from zero, culminating in a live debate on statewide PBS. A leadership-and-communications chapter run on honor and integrity.</p></div>
            </div>
            <div className="tl-col">
              <div className="tl-item"><span className="yr">2019 to 2025</span><h4>Head of Marketing to CMO</h4><p>Wensco, Roofing GR, AcreValue through its CoStar NASDAQ acquisition, Atrium with $25M across six brands, then Vertex as CMO: inbound calls up 490%, booking rate from 16% to 59%.</p></div>
              <div className="tl-item"><span className="yr">2025</span><h4>Central Michigan University &middot; B.A.</h4><p>The degree finished twenty years after it started. Summa cum laude, 3.97, earned while running a $25M growth engine.</p></div>
              <div className="tl-item"><span className="yr">Today</span><h4>Infinity Home Services &middot; regional marketing</h4><p>The Midwest region leads the company: #1, with double-digit year-over-year sales growth.</p></div>
              <div className="tl-item"><span className="yr">2027</span><h4>Auburn University &middot; MBA + M.S. IS</h4><p>Dual master&rsquo;s in progress at the Harbert College of Business. The standard doesn&rsquo;t know how to stop.</p></div>
            </div>
          </div>
        </div>
      </section>

      {/* ======= FINALE ======= */}
      <section className="finale" id="contact">
        <div className="wrap reveal">
          <span className="microlabel">Start a conversation</span>
          <h2>You&rsquo;ve read the story. <em>Put it to work.</em></h2>
          <p>The standard that survived a failed canopy is the same one I&rsquo;ll bring to your P&amp;L. If your company has a mission worth that kind of discipline, tell me about it.</p>
          <div className="fin-ctas">
            <a className="btn btn-gold" href="/contact">Get in Touch <span className="arr">&rarr;</span></a>
            <a className="btn btn-line cal-link" href="https://calendly.com/optimzedseo/30min" target="_blank" rel="noopener">Schedule a Call <span className="arr">&rarr;</span></a>
          </div>
        </div>
      </section>
    </div>
  );
}
