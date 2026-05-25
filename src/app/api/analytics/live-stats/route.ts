import { NextResponse } from "next/server";
import { buildGa4LiveStatsBody } from "@/lib/ga4LiveStats";
import {
  GA4_LIVE_STATS_CACHE_CONTROL,
  getOrFetchGa4LiveStats,
  getStaleGa4LiveStatsBody,
} from "@/lib/ga4LiveStatsCache";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const jsonHeaders = {
  "Cache-Control": GA4_LIVE_STATS_CACHE_CONTROL,
};

function statusForBody(body: { success?: boolean; error?: string }): number {
  if (body.success === false) {
    if (
      typeof body.error === "string" &&
      (body.error.includes("GA4_PROPERTY_ID") ||
        body.error.includes("ANALYTICS_PRIVATE_KEY") ||
        body.error.includes("credentials"))
    ) {
      return 503;
    }
    return 500;
  }
  return 200;
}

/**
 * GET /api/analytics/live-stats
 * Fetches real-time statistics from Google Analytics 4 (cached ~90s server-side).
 * - onlineUsers: realtime activeUsers only (omitted when realtime quota/errors)
 * - recentSignups: newUsers in the last ~24h
 * - recentVisits: totalUsers in the last ~24h
 */
export async function GET() {
  try {
    const body = await getOrFetchGa4LiveStats(buildGa4LiveStatsBody);
    return NextResponse.json(body, {
      status: statusForBody(body as { success?: boolean; error?: string }),
      headers: jsonHeaders,
    });
  } catch (error) {
    console.error("Error fetching GA4 live stats:", error);

    const stale = getStaleGa4LiveStatsBody();
    if (stale) {
      return NextResponse.json(stale, { status: 200, headers: jsonHeaders });
    }

    const rawMessage =
      error instanceof Error ? error.message : "Failed to fetch GA4 stats";
    const isAuthError =
      rawMessage.includes("invalid_grant") ||
      rawMessage.includes("unauthorized") ||
      (error as { code?: number })?.code === 401;
    const errorMessage = isAuthError
      ? "GA4 auth failed: Check ANALYTICS_CLIENT_EMAIL (or ANALYTICS_CLIENT_ID), ANALYTICS_PRIVATE_KEY, and that the service account has access to the GA4 property."
      : rawMessage;

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        stats: {
          onlineUsers: 0,
          recentSignups: 0,
          practicingUsers: 0,
          recentPractices: 0,
          skillBreakdown: {
            Speaking: 0,
            Writing: 0,
            Listening: 0,
            Reading: 0,
          },
        },
      },
      { status: 500, headers: jsonHeaders },
    );
  }
}
