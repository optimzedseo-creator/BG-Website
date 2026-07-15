// RFC 6238 self-test: strip types from lib/admin/totp.ts and check vectors.
import { readFileSync, writeFileSync } from "node:fs";
let src = readFileSync("lib/admin/totp.ts", "utf8");
src = src
  .replace(/: (Buffer|string|number|boolean)(\[\])?/g, "")
  .replace(/export function (\w+)\(([^)]*)\)/g, (m, n, args) => `export function ${n}(${args.replace(/: [^,)=]+/g, "")})`)
  .replace(/function (\w+)\(([^)]*)\)/g, (m, n, args) => `function ${n}(${args.replace(/: [^,)=]+/g, "")})`);
writeFileSync("scripts/_totp.mjs", src);
const t = await import("./_totp.mjs");
// RFC 6238 Appendix B vectors (SHA-1, secret = ASCII "12345678901234567890"),
// truncated to 6 digits (RFC codes are 8-digit; last 6 must match).
const secret = t.base32Encode(Buffer.from("12345678901234567890", "ascii"));
const vectors = [
  [59_000, "94287082"],
  [1111111109_000, "07081804"],
  [1234567890_000, "89005924"],
  [2000000000_000, "69279037"],
];
let fail = 0;
for (const [ms, code8] of vectors) {
  const got = t.totpCode(secret, ms);
  const want = code8.slice(-6);
  console.log(ms / 1000, "got", got, "want", want, got === want ? "OK" : "FAIL");
  if (got !== want) fail++;
}
// base32 roundtrip
const rb = Buffer.from("hello world totp!!");
const rt = t.base32Decode(t.base32Encode(rb)).equals(rb);
console.log("base32 roundtrip", rt ? "OK" : "FAIL");
// window check: code from previous step verifies (need Date.now mocking - verify directly)
const now = Date.now();
const prev = t.totpCode(secret, now - 30_000);
console.log("verify ±1 window", t.verifyTotp(secret, prev) ? "OK" : "FAIL");
console.log("reject garbage", !t.verifyTotp(secret, "000000") || "possible-collision", !t.verifyTotp(secret, "12345a") ? "OK" : "FAIL");
process.exit(fail ? 1 : 0);

import { unlinkSync } from "node:fs";
unlinkSync("scripts/_totp.mjs");
