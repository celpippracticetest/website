import type { NextRequest } from "next/server";

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

  return false;
}
