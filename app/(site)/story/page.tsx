import type { Metadata } from "next";

const TITLE = "From Army Ranger to CMO - The Bradley Griffin Story";
const DESCRIPTION =
  "From the 75th Ranger Regiment to the boardroom: a parachute malfunction at altitude, twenty-five seconds to fix it, and the standard behind two exits and a NASDAQ acquisition.";
const URL = "https://www.bradleygriffin.us/story";
const OG_IMAGE = "https://www.bradleygriffin.us/assets/bradley-griffin-og.jpg";

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

export default function StoryPage() {
  return (
    <div className="page-story">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: storyJsonLd }} />

      {/* ======= STORY HERO ======= */}
      <section className="story-hero" id="top">
        <div className="wrap story-hero-grid">
          <div>
            <span className="microlabel">My story</span>
            <h1>Before the boardroom, <em>the jump.</em></h1>
            <p className="lede">
              Executives like to talk about pressure. I measure it differently. This is the part of the record
              that never fits on a résumé — <strong>the 75th Ranger Regiment, a parachute malfunction at altitude,
              and the twenty-five seconds</strong> that have governed every decision I've made since. Two companies
              built and sold, a NASDAQ acquisition, a region that now leads a national platform — all of it traces back
              to a standard set at Fort Benning.
            </p>
            <p className="jump-row">
              <span>Seven chapters</span>
              <span>2005 — today</span>
              <span>No embellishment required</span>
            </p>
          </div>
          <div className="portrait-wrap">
            <figure className="portrait">
              <img src="/assets/military-griffin-solo.jpg" alt="A young Bradley Griffin in U.S. Army dress uniform and beret" />
              <figcaption>Bradley Griffin · U.S. Army</figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* ======= CH 01 — FORT BENNING ======= */}
      <section className="chapter" id="ch-01">
        <div className="wrap ch-grid">
          <div className="ch-rail reveal">
            <div className="ch-num">01</div>
            <span className="microlabel">Fort Benning</span>
            <p className="ch-meta">Fort Benning, Georgia<br />U.S. Army · 2005</p>
            <div className="rule"></div>
          </div>
          <div className="ch-body reveal">
            <h2>The standard <em>finds you first.</em></h2>
            <p className="prose">I was selected for the 75th Ranger Regiment — one of the most elite special operations units the United States military fields. People imagine that path as a highlight reel. It isn't. The path to a Ranger unit is not designed to build you up; it is designed to find the exact point where you break, and then ask you — plainly, repeatedly — whether you intend to continue. Most men answer no. Nobody blames them.</p>
            <p className="prose">The demands were mental as much as physical. Sleep deprivation. Extreme weather. The constant pressure to perform at your peak when everything in your body is filing objections. In the beginning I questioned the sanity of what I was doing — whether I was strong enough, whether I would even make it out alive. Some days I was battling myself more than the elements or any enemy. But every step forward built something no schoolhouse issues: the hardened knowledge that I could persevere through any obstacle put in front of me.</p>
            <p className="pullq">The training isn't designed to build you up. It's designed to find where you break — and ask whether you intend to continue.</p>
            <p className="prose">What the Regiment actually equips you with isn't gear. It's a code: <strong>integrity, honor, and a sense of duty</strong> that places the mission above your own security — because the mission is usually a matter of life and death, and trust between Rangers has to be absolute. Rangers move first and hold the standard because someone has to. I have carried that into every room I've entered since.</p>
            <p className="motto"><span><b>·</b> Rangers lead the way</span><span><b>·</b> Sua Sponte</span></p>
            <div className="arch-figs">
              <figure className="ch-photo">
                <img src="/assets/military-jumpwings.jpg" alt="A young Bradley Griffin in uniform with a fellow soldier, holding their newly earned parachutist wings at Airborne School" loading="lazy" />
                <figcaption>Airborne School · the day the wings were pinned</figcaption>
              </figure>
              <figure className="ch-photo">
                <img src="/assets/military-three-generations.jpg" alt="Bradley Griffin in Army dress uniform and beret, flanked by his father and grandfather on graduation day" loading="lazy" />
                <figcaption>Graduation day · a proud legacy</figcaption>
              </figure>
            </div>
          </div>
        </div>
      </section>

      {/* ======= CH 02 — THIRTY SECONDS (dark) ======= */}
      <section className="chapter dark" id="ch-02">
        <div className="wrap ch-grid">
          <div className="ch-rail reveal">
            <div className="ch-num">02</div>
            <span className="microlabel">Thirty seconds</span>
            <p className="ch-meta">Airborne operation<br />One jump · one decision</p>
            <div className="rule"></div>
          </div>
          <div className="ch-body reveal">
            <h2>The canopy opened <em>wrong.</em></h2>
            <p className="prose">A jump is a procedure. You rehearse it until it is boring, because boring is what keeps planeloads of men alive. A normal jump gives you about sixty seconds under canopy. Mine had run exactly as drawn a dozen times. Then one didn't. I exited the aircraft the way I had been trained to — and looked up at a canopy rolled tight on itself. Jumpers call it a cigarette roll. Open, but not flying.</p>
            <p className="prose">What I had was <strong>maybe twenty-five seconds</strong>. I pulled the risers apart with everything I had and kicked a bicycle motion to spin the twist out of the lines. The canopy unwound — and left me oscillating so hard I couldn't read my own speed or direction of fall. There was no committee. No second opinion. No more altitude coming. There was a diagnosis, an action, and the ground doing the only thing the ground ever does.</p>
            <p className="prose">The fix is why I'm alive. It is not why I'm whole. The landing tore my right leg up badly — and here is what that unit does to your standards: I got up and covered the <strong>five miles</strong> to catch up with my jump stick on that leg. The injuries ended with the paperwork no soldier wants to read his own name on: an <strong>honorable medical discharge</strong>. In 2007 I took the uniform off for the last time — in my twenties, carrying injuries I hadn't planned for and the highest standard I'd ever been held to, with nowhere left to apply it.</p>
            <p className="pullq">A parachute accident ended my military career. It didn't end the standard it set.</p>
            <p className="prose">People ask what I learned in the military and expect a slogan. Here is what I actually learned: when the canopy rolls up at altitude, you don't get to negotiate with the situation. You get your training, your judgment, and about twenty seconds. Every business decision I've made since has been easier than that — and I've made every one of them like it mattered as much.</p>
          </div>
        </div>
      </section>

      {/* ======= CH 03 — STARTING OVER ======= */}
      <section className="chapter" id="ch-03">
        <div className="wrap ch-grid">
          <div className="ch-rail reveal">
            <div className="ch-num">03</div>
            <span className="microlabel">Starting over</span>
            <p className="ch-meta">CDW → Toshiba<br />The sales floors</p>
            <div className="rule"></div>
          </div>
          <div className="ch-body reveal">
            <h2>Revenue, learned <em>from the ground.</em></h2>
            <p className="prose">There is no field on a civilian résumé for "held to the Ranger standard." The market didn't owe me anything for it, and I didn't ask. I started where revenue actually starts: on the floor. At <strong>CDW</strong>, as an account manager, I learned that every dollar on an income statement began as one person keeping a promise to another — a call made, a follow-up honored, a problem owned all the way to resolution.</p>
            <p className="prose">Then <strong>Toshiba</strong> — outside sales rep, Hawaii. Paradise, if you've never carried a quota through it. I worked the territory the way I'd been taught to work an operation: plan, execute, debrief, adjust, repeat. <strong>Eighteen months later I was the sales manager.</strong> Not because anyone handed it over — because the numbers kept making the argument for me.</p>
            <p className="prose">Those years are why no dashboard has ever been able to lie to me. I know what the frontline knows, because I have been the frontline. Every forecast I've signed since, I've signed as someone who has personally made the cold call behind the number.</p>
          </div>
        </div>
      </section>

      {/* ======= CH 04 — TEAM OF ONE (dark) ======= */}
      <section className="chapter dark" id="ch-04">
        <div className="wrap ch-grid">
          <div className="ch-rail reveal">
            <div className="ch-num">04</div>
            <span className="microlabel">Team of one</span>
            <p className="ch-meta">Founder ×2 · exits ×2<br />2011 — 2018</p>
            <div className="rule"></div>
          </div>
          <div className="ch-body reveal">
            <h2>Every seat, <em>earned the hard way.</em></h2>
            <p className="prose">In 2011 I founded <strong>Optimized</strong>, and for a long stretch the entire company was me. By day I was the whole sales team: the cold calls, the pipeline, the proposals, the contracts. By night I was the whole delivery team: the SEO, the PPC, the social campaigns, the web development. Every deliverable a client paid for passed through my hands — because there were no other hands.</p>
            <p className="prose">It never took a dollar of outside money. It didn't need one. Optimized bootstrapped its way to <strong>23 employees, $5M in revenue, and seven satellite offices</strong> across the continental U.S. — outranking the very agencies who claimed the same expertise, in their own search results. Alongside it I co-founded <strong>Florida Landscaping Services</strong> — a partnership that ended in a successful exit. Both ventures ended the way builders want them to. Every role I hire for today, I have personally done — which means nobody who works for me carries a job I don't understand.</p>
            <p className="pullq">By day I was the entire sales team. By night, the entire delivery team. There were no other hands.</p>
            <p className="prose">And in 2018, while running companies, I took on a different kind of build: a <strong>U.S. congressional campaign, constructed from zero</strong> — the organization, the field operation, the communications, all of it stood up from nothing — culminating in a <strong>live debate on statewide PBS</strong>, unscripted, under the lights. Set aside everything else a campaign is: as a test of leadership and communication under maximum public pressure, there is nothing else like it in civilian life.</p>
          </div>
        </div>
      </section>

      {/* ======= CH 05 — THE EXECUTIVE YEARS ======= */}
      <section className="chapter" id="ch-05">
        <div className="wrap ch-grid">
          <div className="ch-rail reveal">
            <div className="ch-num">05</div>
            <span className="microlabel">The executive years</span>
            <p className="ch-meta">Head of Marketing → CMO<br />2019 — today</p>
            <div className="rule"></div>
          </div>
          <div className="ch-body reveal">
            <h2>The system, <em>proven at scale.</em></h2>
            <p className="prose">The operator years came next — the ones a résumé lists cleanly and the work never was. At <strong>Wensco</strong> I owned every outcome, and the records for sales, revenue, and growth fell one after another. At <strong>Roofing GR</strong>, the lead engine I built grew qualified volume 1,000% year over year — not a typo, a system.</p>
            <p className="prose">Then <strong>AcreValue</strong>, the one that proved the system travels. I came in fractional: a platform with 1.5 million users and recurring revenue that had declined two straight years. I rebuilt the go-to-market from the inside sales calls out, repositioned the product, returned MRR to growth — and set the table for the ending: <strong>acquisition by CoStar Group, a NASDAQ company</strong>. A turnaround that ends on a stock ticker doesn't need adjectives.</p>
            <p className="prose"><strong>Atrium</strong> handed me a $25M budget across six brands, and it was deployed like a budget that size should be — with discipline, attribution, and zero sentiment. <strong>Vertex</strong> made me Chief Marketing Officer, and within four months inbound calls were up 490% and the booking rate had gone from 16% to 59%. Today I run Midwest marketing for <strong>Infinity Home Services</strong> — and the region leads the entire company: <strong>double-digit growth and double-digit year-over-year sales growth, year over year</strong>.</p>
          </div>
        </div>
      </section>

      {/* ======= CH 06 — THE UNFINISHED DEGREE (dark) ======= */}
      <section className="chapter dark" id="ch-06">
        <div className="wrap ch-grid">
          <div className="ch-rail reveal">
            <div className="ch-num">06</div>
            <span className="microlabel">The unfinished degree</span>
            <p className="ch-meta">Central Michigan → Auburn<br />2025 — 2027</p>
            <div className="rule"></div>
          </div>
          <div className="ch-body reveal">
            <h2>Unfinished is not <em>a word I keep.</em></h2>
            <p className="prose">There was one item left open on the ledger, and it had been open for twenty years. I left for the Army before the bachelor's degree was done, and life kept not requiring it — the companies didn't ask, the campaigns didn't ask, the C-suites didn't ask. But the standard doesn't accept "not required."</p>
            <p className="prose">So I went back. <strong>Central Michigan University</strong> — while simultaneously running a $25M growth engine at work. I finished <strong>summa cum laude, with a 3.97</strong>, twenty years after the first credit was earned. Not because my career needed the credential. I did it to be a good example to my children — that you can do it, and it doesn't have to happen in any specific order of life. And then, because a standard doesn't know how to stop, I enrolled again: a <strong>dual MBA and M.S. in Information Systems at Auburn University</strong>, on schedule for 2027.</p>
            <p className="pullq">Twenty years later: summa cum laude, 3.97 — earned nights and weekends, next to a $25M P&amp;L.</p>
            <p className="prose">People ask what a Ranger tab has to do with marketing. Everything. The plan. The rehearsal. The brutal honesty about what the data actually says. The refusal to leave a mission half-finished — even one that waits twenty years for you to come back to it. <strong>Discipline isn't a slide in my deck. It's the operating system.</strong></p>
          </div>
        </div>
      </section>

      {/* ======= CH 07 — OFF THE CLOCK ======= */}
      <section className="chapter" id="ch-07">
        <div className="wrap ch-grid">
          <div className="ch-rail reveal">
            <div className="ch-num">07</div>
            <span className="microlabel">Off the clock</span>
            <p className="ch-meta">Michigan, by choice<br />Family · water · faith</p>
            <div className="rule"></div>
          </div>
          <div className="ch-body reveal">
            <h2>The résumé stops <em>at the water's edge.</em></h2>
            <div className="ch-duo">
              <div>
                <p className="prose">Everything above is what I do. It is not the whole of what I am. Before any title on this page, I'm a husband and a father — a family man building a life in Michigan, which is what all the other chapters were for.</p>
                <p className="prose">When the calendar allows, we're outside — Michigan lakes and long days on the water with my family. Time outdoors keeps honest books: the water doesn't care what you ran last quarter, and neither do the people who matter most.</p>
                <p className="prose">And I'm a Christian. I don't lead meetings with it, and I won't hide it either. The standards named throughout this story — <strong>integrity, service, stewardship</strong> — didn't come out of a leadership book. They come from somewhere deeper, and they don't clock out when I do.</p>
                <p className="pullq">One standard — at home, in the field, and in the boardroom.</p>
              </div>
              <div className="photos">
                <figure className="ch-photo">
                  <img src="/assets/brad-family-lake.jpg" alt="Bradley Griffin lifting his young child into the air on the dock at a Michigan lake" loading="lazy" />
                  <figcaption>Lake days · Michigan</figcaption>
                </figure>
                <figure className="ch-photo">
                  <img src="/assets/brad-lake-fishing.jpg" alt="Bradley Griffin casting from a boat on a Michigan lake at dusk" loading="lazy" />
                  <figcaption>Michigan water · honest books</figcaption>
                </figure>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======= FULL TIMELINE ======= */}
      <section className="timeline-section" id="timeline">
        <div className="wrap">
          <div className="section-intro reveal">
            <span className="microlabel">The record, laid out</span>
            <h2>Twenty years, <em>one line.</em></h2>
            <p>Every chapter above, laid end to end. No gaps, no gloss — the same standard, applied to whatever the year demanded.</p>
          </div>
          <div className="tl-cols reveal">
            <div className="timeline">
              <div className="tl-item"><span className="yr">2005 — 2007</span><h4>U.S. Army · 75th Ranger Regiment</h4><p>Airborne Ranger, Fort Benning. A parachute malfunction, a thirty-second decision, and an honorable medical discharge that ended the career — not the standard.</p></div>
              <div className="tl-item"><span className="yr">2007 — 2011</span><h4>The sales floors</h4><p>CDW account manager, then Toshiba outside sales in Hawaii — promoted to sales manager in eighteen months. Revenue, learned one conversation at a time.</p></div>
              <div className="tl-item"><span className="yr">2011 — 2018</span><h4>Founder ×2 · exits ×2</h4><p>Optimized: a team of one, bootstrapped to 23 employees, $5M, and seven satellite offices — sold to a UK equity firm. Florida Landscaping Services: co-founded, exited successfully.</p></div>
              <div className="tl-item"><span className="yr">2018</span><h4>U.S. congressional candidate</h4><p>Built a full campaign organization from zero — raising funds, growing a following, and debating live on statewide PBS. A leadership-and-communications chapter run on honor and integrity.</p></div>
            </div>
            <div className="timeline">
              <div className="tl-item"><span className="yr">2019 — 2025</span><h4>Head of Marketing → CMO</h4><p>Wensco → Roofing GR (1,000% lead growth) → AcreValue, fractional, through its CoStar/NASDAQ acquisition → Atrium ($25M, six brands) → Vertex, CMO (+490% inbound calls, booking rate 16%→59%).</p></div>
              <div className="tl-item"><span className="yr">2025</span><h4>Central Michigan University · B.A.</h4><p>The degree finished twenty years after it started — summa cum laude, 3.97 — earned while running a $25M growth engine.</p></div>
              <div className="tl-item"><span className="yr">Today</span><h4>Infinity Home Services · regional marketing</h4><p>The Midwest region leads the company: #1 in the company, with double-digit year-over-year sales growth.</p></div>
              <div className="tl-item"><span className="yr">2027</span><h4>Auburn University · MBA + M.S. IS</h4><p>Dual master's in progress at the Harbert College of Business. The standard doesn't know how to stop.</p></div>
            </div>
          </div>
        </div>
      </section>

      {/* ======= FINAL CTA ======= */}
      <section className="finale" id="contact">
        <div className="wrap reveal">
          <span className="microlabel">Start a conversation</span>
          <h2>You've read the story. <em>Put it to work.</em></h2>
          <p>The standard that survived a failed canopy is the same one I'll bring to your P&amp;L. If your company has a mission worth that kind of discipline — tell me about it.</p>
          <div className="fin-ctas"><a className="btn btn-solid" href="/contact">Get in Touch <span className="arr">&rarr;</span></a>
          <a className="btn btn-gold cal-link" href="https://calendly.com/optimzedseo/30min" target="_blank" rel="noopener">Schedule a Call <span className="arr">&rarr;</span></a></div>
        </div>
      </section>
    </div>
  );
}
