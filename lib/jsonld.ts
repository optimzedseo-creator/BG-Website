/**
 * Serialize JSON-LD exactly like Python's json.dumps default output
 * (", " and ": " separators, no indentation) — the format the legacy
 * static pages were generated with. This keeps the parity gate's
 * byte-identical JSON-LD comparison honest.
 */
export function jsonLd(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) {
    return "[" + value.map(jsonLd).join(", ") + "]";
  }
  if (typeof value === "object") {
    return (
      "{" +
      Object.entries(value as Record<string, unknown>)
        .map(([k, v]) => JSON.stringify(k) + ": " + jsonLd(v))
        .join(", ") +
      "}"
    );
  }
  return JSON.stringify(value);
}
