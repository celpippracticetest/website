import { NextResponse } from "next/server";
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { JWT } from "google-auth-library";
import { resolveGa4Credentials } from "@/lib/ga4Credentials";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/analytics/live-stats
 * Fetches real-time statistics from Google Analytics 4
 * - Active users (last 30 minutes from GA4)
 * - Total users (last 24 hours)
 * - Practice events by skill type
 *
 * Auth: service account using ANALYTICS_CLIENT_EMAIL (or ANALYTICS_CLIENT_ID), ANALYTICS_PRIVATE_KEY.
 * GA4 Data API requires GA4_PROPERTY_ID (numeric, from Admin → Property settings).
 */
export async function GET() {
  try {
    const ga4PropertyId = process.env.GA4_PROPERTY_ID;
    if (!ga4PropertyId?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error:
            "GA4_PROPERTY_ID is not set. Add it in Vercel (Project → Settings → Environment Variables) for Preview/Development. Get the numeric ID from GA4 Admin → Property settings.",
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
        { status: 503 },
      );
    }

    const propertyId = `properties/${ga4PropertyId}`;

    const resolved = resolveGa4Credentials();
    if ("error" in resolved) {
      return NextResponse.json(
        {
          success: false,
          error: resolved.error,
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
        { status: 503 },
      );
    }

    const authClient = new JWT({
      email: resolved.email,
      key: resolved.privateKey,
      scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
    });
    const analyticsDataClient = new BetaAnalyticsDataClient({ authClient });

    console.log(
      "[GA4] Fetching realtime and 24h data for property:",
      propertyId,
    );

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const dateFmt = (d: Date) => d.toISOString().slice(0, 10);

    let activeUsersNow: number | null = null;
    let totalUsers24h: number | null = null;
    let newUsers24h: number | null = null;
    let totalPracticingFromGa4: number | null = null;
    const warnings: string[] = [];

    try {
      const [realtimeResponse] = await analyticsDataClient.runRealtimeReport({
        property: propertyId,
        metrics: [{ name: "activeUsers" }],
      });
      const parsedRealtime = parseInt(
        realtimeResponse.rows?.[0]?.metricValues?.[0]?.value ?? "",
        10,
      );
      if (Number.isFinite(parsedRealtime)) {
        activeUsersNow = parsedRealtime;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("[GA4] Realtime report failed:", msg);
      warnings.push(`Realtime: ${msg}`);
    }

    try {
      const [last24HoursResponse] = await analyticsDataClient.runReport({
        property: propertyId,
        dateRanges: [
          {
            startDate: dateFmt(yesterday),
            endDate: dateFmt(today),
          },
        ],
        metrics: [{ name: "totalUsers" }, { name: "newUsers" }],
      });
      const parsedTotalUsers = parseInt(
        last24HoursResponse.rows?.[0]?.metricValues?.[0]?.value ?? "",
        10,
      );
      if (Number.isFinite(parsedTotalUsers)) {
        totalUsers24h = parsedTotalUsers;
      }
      const parsedNewUsers = parseInt(
        last24HoursResponse.rows?.[0]?.metricValues?.[1]?.value ?? "",
        10,
      );
      if (Number.isFinite(parsedNewUsers)) {
        newUsers24h = parsedNewUsers;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("[GA4] 24h report failed:", msg);
      warnings.push(`24h report: ${msg}`);
    }

    // Practice events by skill. Requires a GA4 custom dimension: Admin → Custom definitions
    // → Create custom dimension → Scope: Event, Event parameter: skill_type, API name: skill_type.
    // Until that exists, this report returns INVALID_ARGUMENT and we fall back to zeros (or eventName-only total).
    let speakingCount = 0;
    let writingCount = 0;
    let listeningCount = 0;
    let readingCount = 0;
    try {
      const [practiceEventsResponse] = await analyticsDataClient.runReport({
        property: propertyId,
        dateRanges: [
          {
            startDate: dateFmt(yesterday),
            endDate: dateFmt(today),
          },
        ],
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

      const skillBreakdownMap: Record<string, number> = {};
      let totalPracticeEventsAllSkills = 0;
      practiceEventsResponse.rows?.forEach((row) => {
        const skill = row.dimensionValues?.[0]?.value;
        const count = parseInt(row.metricValues?.[0]?.value || "0", 10);
        totalPracticeEventsAllSkills += count;
        if (skill && skill !== "(not set)") {
          skillBreakdownMap[skill] = count;
        }
      });
      speakingCount = skillBreakdownMap.Speaking || 0;
      writingCount = skillBreakdownMap.Writing || 0;
      listeningCount = skillBreakdownMap.Listening || 0;
      readingCount = skillBreakdownMap.Reading || 0;
      totalPracticingFromGa4 =
        speakingCount + writingCount + listeningCount + readingCount;
      // Keep headline totals usable even if all rows are "(not set)" for skill_type.
      if (totalPracticingFromGa4 === 0 && totalPracticeEventsAllSkills > 0) {
        totalPracticingFromGa4 = totalPracticeEventsAllSkills;
      }
    } catch (practiceErr) {
      console.warn(
        "[GA4] Practice-by-skill report failed (create custom dimension 'skill_type' in GA4 Admin → Custom definitions for breakdown). Error:",
        practiceErr instanceof Error ? practiceErr.message : practiceErr,
      );
      // Fallback: total practice count by event name only (no skill breakdown)
      try {
        const [eventOnlyResponse] = await analyticsDataClient.runReport({
          property: propertyId,
          dateRanges: [
            { startDate: dateFmt(yesterday), endDate: dateFmt(today) },
          ],
          dimensions: [{ name: "eventName" }],
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
        totalPracticingFromGa4 =
          eventOnlyResponse.rows?.reduce(
            (sum, row) =>
              sum + parseInt(row.metricValues?.[0]?.value || "0", 10),
            0,
          ) || 0;
      } catch {
        // ignore
      }
    }

    const hasPerSkillBreakdown =
      speakingCount + writingCount + listeningCount + readingCount > 0;

    const skillBreakdown: {
      Speaking: number;
      Writing: number;
      Listening: number;
      Reading: number;
    } = hasPerSkillBreakdown ?
      {
        Speaking: speakingCount,
        Writing: writingCount,
        Listening: listeningCount,
        Reading: readingCount,
      }
    : {
        Speaking: 0,
        Writing: 0,
        Listening: 0,
        Reading: 0,
      };

    const totalPracticing = totalPracticingFromGa4 ?? 0;

    const onlineCandidates = [activeUsersNow, totalUsers24h, totalPracticingFromGa4].filter(
      (n): n is number => n !== null && Number.isFinite(n) && n > 0
    );
    const onlineUsers =
      onlineCandidates.length > 0 ? Math.max(...onlineCandidates) : null;

    console.log("[GA4 Live Stats - service_account]", {
      activeUsersNow,
      totalUsers24h,
      newUsers24h,
      totalPracticing,
      skillBreakdown,
      onlineUsers,
    });

    // Private key format error: return clear 503 so user can fix ANALYTICS_PRIVATE_KEY
    const isDecoderError = warnings.some(
      (w) =>
        w.includes("DECODER") ||
        w.includes("unsupported") ||
        w.includes("Getting metadata from plugin failed"),
    );
    if (isDecoderError) {
      return NextResponse.json(
        {
          success: false,
          error:
            'ANALYTICS_PRIVATE_KEY is invalid (decoder/format error). Paste the full PEM key in one line and use literal backslash-n (\\n) for line breaks. Example: "-----BEGIN PRIVATE KEY-----\\nMIIE...\\n-----END PRIVATE KEY-----\\n"',
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
        { status: 503 },
      );
    }

    return NextResponse.json({
      success: true,
      stats: {
        ...(onlineUsers !== null ? { onlineUsers } : {}),
        ...(newUsers24h !== null ? { recentSignups: newUsers24h } : {}),
        practicingUsers: totalPracticing,
        recentPractices: totalPracticing,
        skillBreakdown,
      },
      timestamp: new Date().toISOString(),
      source: "google_analytics_4_service_account",
      ...(warnings.length > 0 && { warnings }),
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

    const rawMessage =
      error instanceof Error ? error.message : "Failed to fetch GA4 stats";
    const isAuthError =
      rawMessage.includes("invalid_grant") ||
      rawMessage.includes("unauthorized") ||
      (error as { code?: number })?.code === 401;
    const errorMessage =
      isAuthError ?
        "GA4 auth failed: Check ANALYTICS_CLIENT_EMAIL (or ANALYTICS_CLIENT_ID), ANALYTICS_PRIVATE_KEY, and that the service account has access to the GA4 property."
      : rawMessage;

    // Return zeros on error so widget doesn't show
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
      { status: 500 },
    );
  }
}
