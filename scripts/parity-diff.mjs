/**
 * Parity gate: compares LIVE production pages vs the local Next.js build.
 *   node scripts/parity-diff.mjs [localBase] [--changed=/,/story]
 * Checks per page: title, meta description, meta robots, canonical,
 * og:* / twitter:* values, JSON-LD (byte-level), and normalized visible copy.
 *
 * C1 migration mode (redesign/c1): routes listed via --changed are the
 * phase's migrated pages. On those routes a VISIBLE-COPY diff is reported in
 * full but counted as INTENTIONAL (not a failure) — head metadata and
 * JSON-LD stay hard failures everywhere, because the SEO surface is frozen
 * until Brad's D1 call lands (C1-IMPLEMENTATION-PLAN.md §3.2). Untouched
 * routes must pass every check.
 */
const LIVE = "https://www.bradleygriffin.us";
const args = process.argv.slice(2);
const LOCAL = args.find((a) => !a.startsWith("--")) || "http://localhost:3199";
const changedArg = args.find((a) => a.startsWith("--changed="));
const CHANGED = new Set(changedArg ? changedArg.slice("--changed=".length).split(",").filter(Boolean) : []);
const PAGES = ["/", "/executive", "/fractional", "/consulting", "/case-studies", "/story", "/speaking", "/credentials", "/faq", "/contact", "/rates", "/insights"];

const ENTITIES = {
  "&mdash;": "—", "&ndash;": "–", "&rsquo;": "’", "&lsquo;": "‘",
  "&ldquo;": "“", "&rdquo;": "”", "&middot;": "·", "&copy;": "©",
  "&rarr;": "→", "&nbsp;": " ", "&hellip;": "…", "&quot;": '"',
  "&#39;": "'", "&#x27;": "'", "&#8209;": "‑", "&minus;": "−",
  "&times;": "×", "&darr;": "↓", "&uarr;": "↑", "&dagger;": "†",
  "&amp;": "&",
};
function decode(s) {
  return s.replace(/&[#a-zA-Z0-9x]+;/g, (m) => {
    if (ENTITIES[m] !== undefined) return ENTITIES[m];
    // generic numeric character references: &#183; / &#x2192;
    const num = m.match(/^&#(x?)([0-9a-fA-F]+);$/);
    if (num) return String.fromCodePoint(parseInt(num[2], num[1] ? 16 : 10));
    return m;
  });
}

function getTag(html, re) {
  const m = html.match(re);
  return m ? decode(m[1].trim()) : null;
}
function getMetas(html) {
  const out = {};
  const re = /<meta\s+(?:name|property)="([^"]+)"\s+content="([^"]*)"\s*\/?>/g;
  let m;
  while ((m = re.exec(html))) out[m[1]] = decode(m[2]);
  // also match reversed attribute order (content before name)
  const re2 = /<meta\s+content="([^"]*)"\s+(?:name|property)="([^"]+)"\s*\/?>/g;
  while ((m = re2.exec(html))) out[m[2]] = decode(m[1]);
  return out;
}
function getJsonLd(html) {
  const out = [];
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) out.push(m[1].trim());
  return out;
}
function visibleText(html) {
  let body = html.replace(/^[\s\S]*?<body[^>]*>/, "").replace(/<\/body>[\s\S]*$/, "");
  body = body.replace(/<script[\s\S]*?<\/script>/g, " ");
  body = body.replace(/<style[\s\S]*?<\/style>/g, " ");
  body = body.replace(/<[^>]+>/g, " ");
  return decode(body).replace(/\s+/g, " ").trim();
}

const KEYS = [
  "description", "robots", "theme-color",
  "og:site_name", "og:type", "og:title", "og:description", "og:url", "og:image",
  "twitter:card", "twitter:title", "twitter:description", "twitter:image",
];

let failures = 0;
let intentional = 0;
function check(page, label, live, local) {
  if (live === local) {
    console.log(`  OK   ${label}`);
  } else {
    failures++;
    console.log(`  DIFF ${label}`);
    console.log(`       live : ${JSON.stringify(live)}`);
    console.log(`       local: ${JSON.stringify(local)}`);
  }
}

for (const page of PAGES) {
  const cb = Math.floor(Math.random() * 1e9);
  const [liveHtml, localHtml] = await Promise.all([
    fetch(`${LIVE}${page}?cb=${cb}`).then((r) => r.text()),
    fetch(`${LOCAL}${page}`).then((r) => r.text()),
  ]);

  console.log(`\n===== ${page} =====`);
  check(page, "title", getTag(liveHtml, /<title>([\s\S]*?)<\/title>/), getTag(localHtml, /<title>([\s\S]*?)<\/title>/));
  check(page, "canonical",
    getTag(liveHtml, /<link rel="canonical" href="([^"]+)"/),
    getTag(localHtml, /<link rel="canonical" href="([^"]+)"/));

  const liveM = getMetas(liveHtml);
  const localM = getMetas(localHtml);
  for (const k of KEYS) {
    if (liveM[k] === undefined && localM[k] === undefined) continue;
    check(page, `meta ${k}`, liveM[k] ?? "(absent)", localM[k] ?? "(absent)");
  }

  const liveLd = getJsonLd(liveHtml);
  const localLd = getJsonLd(localHtml);
  check(page, "json-ld count", String(liveLd.length), String(localLd.length));
  for (let i = 0; i < Math.max(liveLd.length, localLd.length); i++) {
    const same = liveLd[i] === localLd[i];
    if (same) console.log(`  OK   json-ld[${i}] byte-identical`);
    else {
      failures++;
      console.log(`  DIFF json-ld[${i}]`);
      console.log(`       live : ${liveLd[i]}`);
      console.log(`       local: ${localLd[i]}`);
    }
  }

  const liveText = visibleText(liveHtml);
  const localText = visibleText(localHtml);
  if (liveText === localText) console.log("  OK   visible copy identical (normalized)");
  else if (CHANGED.has(page)) {
    intentional++;
    console.log("  INTENTIONAL visible-copy diff (route listed via --changed — migrated this phase)");
    let i = 0;
    while (i < Math.min(liveText.length, localText.length) && liveText[i] === localText[i]) i++;
    console.log(`       first divergence at char ${i}:`);
    console.log(`       live : ...${JSON.stringify(liveText.slice(Math.max(0, i - 60), i + 120))}`);
    console.log(`       local: ...${JSON.stringify(localText.slice(Math.max(0, i - 60), i + 120))}`);
  } else {
    failures++;
    console.log("  DIFF visible copy");
    // find first divergence for a readable report
    let i = 0;
    while (i < Math.min(liveText.length, localText.length) && liveText[i] === localText[i]) i++;
    console.log(`       first divergence at char ${i}:`);
    console.log(`       live : ...${JSON.stringify(liveText.slice(Math.max(0, i - 60), i + 120))}`);
    console.log(`       local: ...${JSON.stringify(localText.slice(Math.max(0, i - 60), i + 120))}`);
  }
}

if (intentional > 0) console.log(`\nINTENTIONAL: ${intentional} visible-copy diff(s) on --changed route(s) [${[...CHANGED].join(", ")}]`);
console.log(failures === 0 ? "PARITY: PASS (all hard checks)" : `PARITY: ${failures} difference(s) found`);
process.exit(failures === 0 ? 0 : 1);
