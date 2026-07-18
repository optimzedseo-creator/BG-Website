// GSC query classifier — WP4 (ANALYTICS-BUILD-PLAN) pre-tagging at ingest.
// Source of truth for the taxonomy: .claude/bradley-team/analytics-ideas/keywords.md
// (bradley-keywords, 2026-07-15) — rules A1 (branded two-token), A2 (collision
// hypothesis), A3 (intent dictionaries, first hit wins), A4 (geo string rule).
//
// VERSIONING IS BINDING: any change to a rule below MUST bump
// GSC_CLASSIFIER_VERSION (definition drift = fake trend). Rows store the
// version they were tagged with; re-tagging old rows is a deliberate,
// versioned backfill, never a silent edit.

export const GSC_CLASSIFIER_VERSION = "v1-2026-07-18";

// A1 — branded, rigorous two-token rule: BOTH name tokens (either order) or
// the joined form. Single-token matches are collision noise (Griffin Opus,
// Bradley University, Peter Griffin...) and are tracked separately below.
const BRANDED_RE = /bradley.*griffin|griffin.*bradley|bradleygriffin/i;

// A1 — ambiguous-branded: single token only. NEVER folded into branded.
const AMBIGUOUS_RE = /bradley|griffin/i;

// A2 — possible wrong-entity decoys (GA-10 political surface, the Alabama
// motivational speaker, misc collisions). A HYPOTHESIS flag, never a fact:
// GSC gives no proof of which Bradley Griffin the searcher wanted.
const COLLISION_RE =
  /republican|ballotpedia|congress|election|vote|georgia|\bga-?10\b|alabama|motivational|espeakers|\bnfl\b|actor|obituary/i;

// A4 — explicit geo-string rule (SW Michigan / N Indiana target metros).
// Deliberately NO bare \bin\b or \bmi\b (stopword/noise per the taxonomy).
// The honest geo cut is GscCountryDaily (GSC's own dimension); this flag only
// marks queries that carry an explicit geo token.
const GEO_RE =
  /michigan|indiana|kalamazoo|grand rapids|portage|battle creek|south bend|elkhart|mishawaka|southwest michigan|west michigan|mt pleasant|lansing/i;

// A3 — intent buckets, dictionary classifier, FIRST HIT WINS (order matters:
// specific-intent buckets before the broad informational catch-all).
const INTENT_BUCKETS: ReadonlyArray<readonly [string, RegExp]> = [
  ["hire-fractional", /fractional cmo|cmo for hire|part-?time cmo|outsourced cmo|interim cmo|fractional (marketing|cmo)/i],
  ["consulting", /marketing consultant|marketing audit|growth consultant|ppc audit|seo audit|attribution|marketing strategy|marketing help/i],
  ["cost", /cost|pricing|\bprice\b|\brates?\b|how much|\bfees?\b|salary|\$/i],
  ["speaking", /keynote|speaker|\btalk\b|conference|panel|\bevent\b|book a speaker/i],
  ["book", /it'?s not a marketing problem|marketing problem book|griffin.*book/i],
  ["informational", /^(?:how|what|why|when|should|can|is|are|does|do)\b|\?\s*$/i],
  ["exec", /cmo job|chief marketing officer|hire a cmo|vp marketing/i],
] as const;

export interface GscQueryTags {
  isBranded: boolean;
  brandedAmbiguous: boolean;
  isCollision: boolean;
  intentBucket: string | null;
  isGeo: boolean;
}

export function classifyQuery(query: string): GscQueryTags {
  const isBranded = BRANDED_RE.test(query);
  const brandedAmbiguous = !isBranded && AMBIGUOUS_RE.test(query);
  const isCollision = (isBranded || brandedAmbiguous) && COLLISION_RE.test(query);

  let intentBucket: string | null = null;
  for (const [bucket, re] of INTENT_BUCKETS) {
    if (re.test(query)) {
      intentBucket = bucket;
      break;
    }
  }

  return {
    isBranded,
    brandedAmbiguous,
    isCollision,
    intentBucket,
    isGeo: GEO_RE.test(query),
  };
}

// Defensive ingest hygiene: GSC query/page strings are third-party data even
// though no PII is expected. Strip control chars, collapse whitespace, and
// hard-cap length (btree unique-index entries have a ~2.7KB ceiling; caps set
// with bradley-database: query<=1024, page<=2048). Returns null for empties —
// callers must skip those rows.
export function cleanGscString(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  // eslint-disable-next-line no-control-regex
  const s = v.replace(/[\x00-\x1f\x7f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
  return s.length ? s : null;
}
