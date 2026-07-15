import ArticleShell, { articleMetadata } from "../ArticleShell";

const SLUG = "attribution-reports-are-fiction";
export const metadata = articleMetadata(SLUG);

export default function Page() {
  return (
    <ArticleShell slug={SLUG}>
      <p>Open almost any marketing dashboard and it looks certain.</p>

      <p>
        Neat columns. Confident percentages. A pie chart that adds up to a hundred. It has the posture
        of truth. Most of the time, it&rsquo;s a story the tools are telling you about themselves.
      </p>

      <span className="kicker">Add up the credit</span>
      <p>
        Here&rsquo;s the tell. Total up what every platform claims it drove last month. Google takes
        credit for the sale. Facebook takes credit for the same sale. The email tool takes credit too.
        Three channels, one customer, three victory laps. The math can&rsquo;t possibly work. But each
        dashboard looks clean on its own, so nobody notices.
      </p>

      <p className="pull">Every platform is graded on its own homework. Every platform gives itself an A.</p>

      <p>
        That&rsquo;s not lying, exactly. It&rsquo;s self-reporting. A tool built to sell you more of a
        channel is not a neutral judge of that channel. It never was.
      </p>

      <h2>Last click is a bad witness</h2>

      <p>
        Then there&rsquo;s the default that runs most reports: last click. Whatever a customer touched
        right before they bought gets all the credit. That&rsquo;s like thanking the coupon at the
        register and ignoring the year of reasons the person walked into the store. The last step is
        easy to measure. That doesn&rsquo;t make it the reason.
      </p>

      <h2>A model is just someone&rsquo;s assumptions</h2>

      <p>
        An &ldquo;attribution model&rdquo; sounds scientific. It&rsquo;s a set of rules about how to
        split credit, and somebody chose those rules. Often the somebody was a vendor whose product
        happens to look great under those exact rules. When the assumptions are invisible, the output
        feels like fact. It isn&rsquo;t. It&rsquo;s an opinion with good formatting.
      </p>

      <p>
        None of this means stop measuring. It means measure harder, and stop trusting the pre-chewed
        version. Go back to the raw source data, the stuff underneath the dashboard. Where did this
        customer actually come from. What did it actually cost to get them. What did it actually turn
        into in revenue, not in &ldquo;conversions.&rdquo; Follow it end to end, once, by hand. It is
        slower and far less pretty, and it is the only version you can defend.
      </p>

      <p>
        The goal was never a nicer chart. It&rsquo;s a number you&rsquo;d bet your own money on. Most
        attribution reports aren&rsquo;t that. They&rsquo;re fiction with a dashboard, and the
        dashboard is the part that fools you.
      </p>
    </ArticleShell>
  );
}
