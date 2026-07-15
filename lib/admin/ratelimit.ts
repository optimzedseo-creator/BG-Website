// Per-instance rate dampening for the login/setup endpoints — same pattern
// (and same honesty note) as /api/contact and /api/track: Vercel serverless
// instances don't share state, so this SLOWS brute force per warm instance.
// The hard guarantee against password guessing is the Setting-based lockout
// in lib/admin/auth.ts (5 fails → 15-min lock, shared via the database).

const buckets = new Map<string, Map<string, number[]>>();

export function rateDampen(
  bucket: string,
  ip: string,
  max: number,
  windowMs: number
): boolean {
  let hits = buckets.get(bucket);
  if (!hits) {
    hits = new Map();
    buckets.set(bucket, hits);
  }
  const now = Date.now();
  const fresh = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  if (fresh.length >= max) {
    hits.set(ip, fresh);
    return true; // limited
  }
  fresh.push(now);
  hits.set(ip, fresh);
  if (hits.size > 500) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= windowMs)) hits.delete(k);
    }
  }
  return false;
}

export async function clientIpFromHeaders(h: Headers): Promise<string> {
  const fwd = h.get("x-forwarded-for");
  if (typeof fwd === "string" && fwd.length) return fwd.split(",")[0].trim();
  return "unknown";
}
