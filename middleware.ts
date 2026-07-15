// Edge middleware — Phase 4 (BACKEND-PLAN.md §5).
// Guards /admin/* (except /admin/login) by verifying the bg_admin session JWT
// and stamps X-Robots-Tag: noindex on EVERY /admin response.
//
// DEFENSE-IN-DEPTH ONLY: this is the outer wall. The real gate is
// requireAdmin() awaited inside every admin server action and route handler
// (middleware alone is insufficient — server actions are public endpoints).

import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

export const config = { matcher: ["/admin/:path*", "/admin"] };

const SESSION_COOKIE = "bg_admin";

async function isFullSession(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) return false; // fail closed
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ["HS256"],
    });
    return payload.sub === "admin" && payload.stage === "full";
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const authed = await isFullSession(req);

  let res: NextResponse;
  if (pathname === "/admin/login") {
    // Already signed in → straight to the dashboard.
    res = authed ? NextResponse.redirect(new URL("/admin", req.url)) : NextResponse.next();
  } else if (!authed) {
    res = NextResponse.redirect(new URL("/admin/login", req.url));
  } else {
    res = NextResponse.next();
  }

  // Admin never enters a search index — belt (header) and braces (metadata).
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}
