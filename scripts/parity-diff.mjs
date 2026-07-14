/**
 * Parity gate: compares LIVE production pages vs the local Next.js port.
 *   node scripts/parity-diff.mjs [localBase]
 * Checks per page: title, meta description, meta robots, canonical,
 * og:* / twitter:* values, JSON-LD (byte-level), and normalized visible copy.
 */
const LIVE = "https://www.bradleygriffin.us";
const LOCAL = process.argv[2] || "http://localhost:3199";
const PAGES = ["/faq", "/contact", "/rates"];

const ENTITIES = {
  "&mdash;": "—", "&ndash;": "–", "&rsquo;": "’", "&lsquo;": "‘",
  "&ldquo;": "“", "&rdquo;": "”", "&middot;": "·", "&copy;": "©",
  "&rarr;": "→", "&nbsp;": " ", "&hellip;": "…", "&quot;": '"',
  "&#39;": "'", "&#x27;": "'", "&amp;": "&",
};
function decode(s) {
  return s.replace(/&[#a-zA-Z0-9x]+;/g, (m) => ENTITIES[m] ?? m);
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
  else {
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

console.log(failures === 0 ? "\nPARITY: PASS (all checks)" : `\nPARITY: ${failures} difference(s) found`);
process.exit(failures === 0 ? 0 : 1);
