import ArticleShell, { articleMetadata } from "../ArticleShell";

const SLUG = "its-not-a-marketing-problem";
export const metadata = articleMetadata(SLUG);

export default function Page() {
  return (
    <ArticleShell slug={SLUG}>
      <p>Every few weeks, someone tells me their marketing is broken.</p>

      <p>
        Leads are down. The website feels tired. The agency isn&rsquo;t delivering. They want a new
        campaign, a new channel, a new logo. Something to turn the numbers back around.
      </p>

      <p>Then we look at the actual business. And most of the time, the marketing was never the problem.</p>

      <p className="pull">Marketing is a multiplier. That&rsquo;s it. That&rsquo;s the whole job.</p>

      <p>
        It takes what a business already does and puts it in front of more people. If the offer is
        strong, marketing makes it stronger. If the operation is a mess, marketing makes the mess more
        expensive. It doesn&rsquo;t fix anything. It amplifies whatever is already there.
      </p>

      <p>
        So when growth stalls, the honest question isn&rsquo;t &ldquo;how do we get more leads.&rdquo;
        It&rsquo;s &ldquo;what happens to a lead once we get one.&rdquo;
      </p>

      <span className="kicker">Walk the actual path</span>
      <p>
        A prospect reaches out. How long until someone answers? They ask for a price. How long until
        it lands in their inbox? They say yes. How long until the work actually starts? Somewhere in
        those gaps, deals die quietly. Marketing filled the top of the funnel. The business leaked it
        out the bottom.
      </p>

      <p>
        Now pour more budget in. You don&rsquo;t fix the leak. You just feed it faster. More spend,
        same close rate, a bigger number at the top and the same disappointing number at the end. That
        is what multiplying a broken business looks like on a report.
      </p>

      <h2>Why marketing takes the blame anyway</h2>

      <p>
        Marketing is a convenient place to point. Its work is visible and its results are debatable.
        Everyone saw the campaign. Nobody agrees on what it did. So when the quarter comes up short,
        the invoice for a slow sales process, a weak offer, or a broken handoff gets handed to
        marketing. New campaign, please. Same operation underneath.
      </p>

      <p>
        This isn&rsquo;t anyone being dishonest. It&rsquo;s just easier to change an ad than to change
        how the company works. The ad is a project. The operation is a habit.
      </p>

      <h2>Fix it, then multiply it</h2>

      <p>
        Before you spend another dollar getting attention, earn the right to it. Go to the raw data,
        not the summary someone built to make the quarter look calm. Where do leads actually come
        from. What do they actually cost. Where do they stall. What closes, and what doesn&rsquo;t, and
        why. That is boring work. It is also the only work that makes the marketing worth doing.
      </p>

      <p>
        Get the business working first. A strong offer, a fast response, a process that holds up when
        someone is out sick. Then turn marketing on and let it do the one thing it&rsquo;s actually
        good at. Multiply something worth multiplying.
      </p>

      <p>
        Until then, it&rsquo;s not a marketing problem. And no campaign is going to save you from it.
      </p>
    </ArticleShell>
  );
}
