import type { NextRequest } from "next/server";

/** Supabase Auth session chunks (`sb-<ref>-auth-token`, `.0`, `.1`, …). */
function hasSupabaseAuthCookie(req: NextRequest): boolean {
  return req.cookies.getAll().some(
    (cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("auth-token"),
  );
}

/** Authenticated app, checkout, and admin routes must always resolve sessions. */
const SESSION_REQUIRED_PATH_PREFIXES = [
  "/cms",
  "/api",
  "/profile",
  "/plans",
  "/practice-overview",
  "/speaking",
  "/reading",
  "/writing",
  "/listening",
  "/exam-overview",
  "/exams",
  "/words",
  "/flow",
  "/earn100",
  "/sign-in",
  "/sign-up",
  "/auth",
  "/onboarding",
  "/onboarding-survey",
  "/success",
  "/failed",
  "/welcome",
  "/account-sharing-notice",
  "/partners/dashboard",
  "/partners/auth",
  "/delete-account",
  "/sso-callback",
  "/final-offer",
  "/learning",
  "/refund-request",
  "/monitoring",
] as const;

function requiresSupabaseSession(path: string): boolean {
  return SESSION_REQUIRED_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

/**
 * Anonymous visitors on public marketing/wiki/blog pages can skip Supabase Auth
 * middleware work so responses stay CDN-cacheable.
 */
export function shouldUsePublicPageCache(req: NextRequest): boolean {
  if (hasSupabaseAuthCookie(req)) return false;
  return !requiresSupabaseSession(req.nextUrl.pathname);
}

/**
 * Paths that never need Supabase session resolution in middleware.
 * Skipping avoids Auth work on high-volume public endpoints.
 */
export function shouldSkipSupabaseSessionInMiddleware(req: NextRequest): boolean {
  const path = req.nextUrl.pathname;

  if (path.startsWith("/api/analytics/")) return true;
  if (path.startsWith("/api/cron/")) return true;
  if (path.startsWith("/api/indexnow/")) return true;
  if (path.startsWith("/monitoring")) return true;
  if (path.includes("webhook")) return true;
  if (path.startsWith("/api/stripe/") || path.startsWith("/api/paypal/")) return true;
  if (path.startsWith("/api/blog/")) return true;
  if (path.startsWith("/api/plans/")) return true;
  if (path.startsWith("/api/subscribe")) return true;
  if (path.startsWith("/api/lead-capture/")) return true;

  return shouldUsePublicPageCache(req);
}
