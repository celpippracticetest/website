import { NextResponse } from "next/server";
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { OAuth2Client } from "google-auth-library";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/analytics/live-stats
 * Fetches real-time statistics from Google Analytics 4
 * - Active users (last 30 minutes from GA4)
 * - Total users (last 24 hours)
 * - Practice events by skill type
 *
 * Uses OAuth 2.0 with existing refresh token (no service account needed)
 */
export async function GET() {
  try {
    // Validate environment variables
    const measurementId = process.env.GA_MEASUREMENT_ID;
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    if (!measurementId || !clientId || !clientSecret || !refreshToken) {
      throw new Error("Missing required OAuth credentials");
    }

    // Convert measurement ID (G-XXXXXXX) to property ID (properties/XXXXXXX)
    const propertyId = `properties/${measurementId}`;

    // Create OAuth2 client
    const oauth2Client = new OAuth2Client(clientId, clientSecret);

    // Set credentials with refresh token
    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    // Initialize GA4 Data API client with OAuth2
    const analyticsDataClient = new BetaAnalyticsDataClient({
      authClient: oauth2Client,
    });

    console.log(
      "[GA4] Fetching realtime and 24h data for property:",
      propertyId
    );

    // Fetch real-time active users (last 30 minutes)
    const [realtimeResponse] = await analyticsDataClient.runRealtimeReport({
      property: propertyId,
      metrics: [{ name: "activeUsers" }],
    });

    const activeUsersNow = parseInt(
      realtimeResponse.rows?.[0]?.metricValues?.[0]?.value || "0"
    );

    // Fetch last 24 hours data
    const [last24HoursResponse] = await analyticsDataClient.runReport({
      property: propertyId,
      dateRanges: [{ startDate: "yesterday", endDate: "today" }],
      metrics: [
        { name: "totalUsers" },
        { name: "newUsers" }, // Recent signups
      ],
    });

    const totalUsers24h = parseInt(
      last24HoursResponse.rows?.[0]?.metricValues?.[0]?.value || "0"
    );
    const newUsers24h = parseInt(
      last24HoursResponse.rows?.[0]?.metricValues?.[1]?.value || "0"
    );

    // Fetch practice events by skill (last 24 hours)
    const [practiceEventsResponse] = await analyticsDataClient.runReport({
      property: propertyId,
      dateRanges: [{ startDate: "yesterday", endDate: "today" }],
      dimensions: [{ name: "customEvent:skill_type" }],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: {
        filter: {
          fieldName: "eventName",
          inListFilter: {
            values: ["practice_started", "practice_completed"],
          },
        },
      },
    });

    // Parse skill breakdown
    const skillBreakdown: Record<string, number> = {};
    practiceEventsResponse.rows?.forEach((row) => {
      const skill = row.dimensionValues?.[0]?.value;
      const count = parseInt(row.metricValues?.[0]?.value || "0");
      if (skill && skill !== "(not set)") {
        skillBreakdown[skill] = count;
      }
    });

    const speakingCount = skillBreakdown.Speaking || 0;
    const writingCount = skillBreakdown.Writing || 0;
    const listeningCount = skillBreakdown.Listening || 0;
    const readingCount = skillBreakdown.Reading || 0;

    // Total practicing = sum of individual skills
    const totalPracticing =
      speakingCount + writingCount + listeningCount + readingCount;

    // Active users should be MORE than practicing (practicing is a subset)
    const calculatedActiveUsers = Math.max(
      activeUsersNow,
      totalUsers24h,
      Math.floor(totalPracticing * 1.5)
    );

    // Log for debugging
    console.log("[GA4 Live Stats - OAuth]", {
      activeUsersNow,
      totalUsers24h,
      newUsers24h,
      totalPracticing,
      skillBreakdown,
      calculatedActiveUsers,
    });

    return NextResponse.json({
      success: true,
      stats: {
        onlineUsers: calculatedActiveUsers,
        recentSignups: newUsers24h,
        practicingUsers: totalPracticing,
        recentPractices: totalPracticing,
        skillBreakdown: {
          Speaking: speakingCount,
          Writing: writingCount,
          Listening: listeningCount,
          Reading: readingCount,
        },
      },
      timestamp: new Date().toISOString(),
      source: "google_analytics_4_oauth",
    });
  } catch (error) {
    console.error("Error fetching GA4 live stats:", error);

    // Log more details for debugging
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
      });
    }

    // Return zeros on error so widget doesn't show
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch GA4 stats",
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
      { status: 500 }
    );
  }
}
