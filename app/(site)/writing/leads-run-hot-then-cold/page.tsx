import ArticleShell, { articleMetadata } from "../ArticleShell";

const SLUG = "leads-run-hot-then-cold";
export const metadata = articleMetadata(SLUG);

export default function Page() {
  return (
    <ArticleShell slug={SLUG}>
      <p>One month the leads are great. The next month they&rsquo;re garbage.</p>

      <p>
        Same channels. Same budget. Same ads running the same way. Yet the sales team swears the
        quality fell off a cliff, and marketing swears nothing changed. Both are telling the truth.
      </p>

      <p>Usually nothing changed about the leads. Something changed about what happened after they came in.</p>

      <span className="kicker">A lead is a chain, not a moment</span>
      <p>
        Someone raises their hand. Now somebody has to respond. Fast. Then follow up. Then follow up
        again. Then get that person onto a calendar, in front of the right person, at a time that
        actually works for them. Every link in that chain is a place the lead can go cold. Break one
        link and the whole thing feels like a &ldquo;bad lead.&rdquo;
      </p>

      <p>
        Speed is the link nobody wants to look at. A lead answered in five minutes and a lead answered
        in five hours are not the same lead anymore. The person didn&rsquo;t get worse. They just
        called the next company on the list while they were still thinking about it.
      </p>

      <p className="pull">You don&rsquo;t have a marketing problem. You have a calendar problem.</p>

      <p>
        So the &ldquo;quality&rdquo; swing is often a staffing swing. A calendar swing. The good week
        had someone answering the phone by lunch and moving people onto the schedule. The bad week had
        a rep out, a follow-up sequence that quietly stopped firing, and three warm prospects sitting
        in an inbox until they cooled off. Marketing did its job. It put a hand-raiser in front of
        you. The system decided whether that turned into money.
      </p>

      <h2>Measure the part you&rsquo;re avoiding</h2>

      <p>
        Most companies can tell you their cost per lead to the penny and have no idea what their
        average response time actually is. Not &ldquo;we usually get back same day.&rdquo; The real
        number, off the timestamps. That gap between what people believe and what the data says is
        where the money leaks out.
      </p>

      <p>
        Map the chain. Time every step. Find the link that keeps breaking. Then make the fragile parts
        automatic, so the follow-up survives a bad week and a short-staffed Friday instead of depending
        on someone remembering.
      </p>

      <p>
        Systems that scale don&rsquo;t depend on the best day of the month. When leads run hot then
        cold, the ads are rarely the story. The thing that happens after the click is. Fix that, and
        the &ldquo;bad&rdquo; leads tend to get a lot better overnight.
      </p>
    </ArticleShell>
  );
}
