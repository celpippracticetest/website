import { NextResponse } from "next/server";
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { JWT } from "google-auth-library";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type StatsShape = {
  onlineUsers: number;
  recentSignups: number;
  practicingUsers: number;
  recentPractices: number;
  skillBreakdown: {
    Speaking: number;
    Writing: number;
    Listening: number;
    Reading: number;
  };
};

const emptyStats = (): StatsShape => ({
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
});

/**
 * GET /api/analytics/reports
 * Returns marketing analytics for multiple time ranges: realtime, last24h, last7d, last30d, last90d.
 * Uses same GA4 auth and metrics as live-stats.
 */
export async function GET() {
  try {
    const ga4PropertyId = process.env.GA4_PROPERTY_ID;
    if (!ga4PropertyId?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error:
            "GA4_PROPERTY_ID is not set. Add it in Vercel (Project → Settings → Environment Variables).",
          data: {
            realtime: emptyStats(),
            last24h: emptyStats(),
            last7d: emptyStats(),
            last30d: emptyStats(),
            last90d: emptyStats(),
          },
        },
        { status: 503 }
      );
    }

    const propertyId = `properties/${ga4PropertyId}`;
    const analyticsClientEmail =
      process.env.ANALYTICS_CLIENT_EMAIL || process.env.ANALYTICS_CLIENT_ID;
    const analyticsPrivateKey = process.env.ANALYTICS_PRIVATE_KEY;

    if (!analyticsClientEmail?.trim() || !analyticsPrivateKey?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error:
            "ANALYTICS_CLIENT_EMAIL (or ANALYTICS_CLIENT_ID) and ANALYTICS_PRIVATE_KEY are required.",
          data: {
            realtime: emptyStats(),
            last24h: emptyStats(),
            last7d: emptyStats(),
            last30d: emptyStats(),
            last90d: emptyStats(),
          },
        },
        { status: 503 }
      );
    }

    const privateKey = analyticsPrivateKey
      .replace(/\\n/g, "\n")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .trim();
    if (
      !privateKey.includes("-----BEGIN") ||
      !privateKey.includes("-----END")
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "ANALYTICS_PRIVATE_KEY must be a valid PEM key (-----BEGIN PRIVATE KEY----- ... -----END PRIVATE KEY-----).",
          data: {
            realtime: emptyStats(),
            last24h: emptyStats(),
            last7d: emptyStats(),
            last30d: emptyStats(),
            last90d: emptyStats(),
          },
        },
        { status: 503 }
      );
    }

    const authClient = new JWT({
      email: analyticsClientEmail.trim(),
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
    });
    const analyticsDataClient = new BetaAnalyticsDataClient({ authClient });

    const dateFmt = (d: Date) => d.toISOString().slice(0, 10);
    const today = new Date();

    // Date ranges: endDate is today for all
    const ranges = {
      last24h: (() => {
        const start = new Date(today);
        start.setDate(start.getDate() - 1);
        return { startDate: dateFmt(start), endDate: dateFmt(today) };
      })(),
      last7d: (() => {
        const start = new Date(today);
        start.setDate(start.getDate() - 7);
        return { startDate: dateFmt(start), endDate: dateFmt(today) };
      })(),
      last30d: (() => {
        const start = new Date(today);
        start.setDate(start.getDate() - 30);
        return { startDate: dateFmt(start), endDate: dateFmt(today) };
      })(),
      last90d: (() => {
        const start = new Date(today);
        start.setDate(start.getDate() - 90);
        return { startDate: dateFmt(start), endDate: dateFmt(today) };
      })(),
    };

    let realtimeStats: StatsShape = emptyStats();

    // Realtime: active users only
    try {
      const [realtimeResponse] = await analyticsDataClient.runRealtimeReport({
        property: propertyId,
        metrics: [{ name: "activeUsers" }],
      });
      const activeUsersNow = parseInt(
        realtimeResponse.rows?.[0]?.metricValues?.[0]?.value || "0",
        10
      );
      realtimeStats = {
        ...emptyStats(),
        onlineUsers: activeUsersNow,
      };
    } catch (err) {
      console.warn("[GA4 Reports] Realtime report failed:", err);
    }

    // Fetch 24h, 7d, 30d, 90d in parallel: users + practice per range
    const rangeKeys = ["last24h", "last7d", "last30d", "last90d"] as const;

    const runRangeReport = async (
      key: (typeof rangeKeys)[number]
    ): Promise<StatsShape> => {
      const { startDate, endDate } = ranges[key];
      const stats = emptyStats();

      try {
        const [usersResponse] = await analyticsDataClient.runReport({
          property: propertyId,
          dateRanges: [{ startDate, endDate }],
          metrics: [{ name: "totalUsers" }, { name: "newUsers" }],
        });
        const totalUsers = parseInt(
          usersResponse.rows?.[0]?.metricValues?.[0]?.value || "0",
          10
        );
        const newUsers = parseInt(
          usersResponse.rows?.[0]?.metricValues?.[1]?.value || "0",
          10
        );
        stats.onlineUsers = totalUsers;
        stats.recentSignups = newUsers;
      } catch (err) {
        console.warn(`[GA4 Reports] Users report failed for ${key}:`, err);
      }

      try {
        const [practiceResponse] = await analyticsDataClient.runReport({
          property: propertyId,
          dateRanges: [{ startDate, endDate }],
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
        practiceResponse.rows?.forEach((row) => {
          const skill = row.dimensionValues?.[0]?.value;
          const count = parseInt(row.metricValues?.[0]?.value || "0", 10);
          if (skill && skill !== "(not set)") {
            skillBreakdownMap[skill] = count;
          }
        });
        stats.skillBreakdown = {
          Speaking: skillBreakdownMap.Speaking || 0,
          Writing: skillBreakdownMap.Writing || 0,
          Listening: skillBreakdownMap.Listening || 0,
          Reading: skillBreakdownMap.Reading || 0,
        };
        const totalPracticing =
          stats.skillBreakdown.Speaking +
          stats.skillBreakdown.Writing +
          stats.skillBreakdown.Listening +
          stats.skillBreakdown.Reading;
        stats.practicingUsers = totalPracticing;
        stats.recentPractices = totalPracticing;
      } catch {
        try {
          const [eventOnlyResponse] = await analyticsDataClient.runReport({
            property: propertyId,
            dateRanges: [{ startDate, endDate }],
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
          const total =
            eventOnlyResponse.rows?.reduce(
              (sum, row) =>
                sum + parseInt(row.metricValues?.[0]?.value || "0", 10),
              0
            ) || 0;
          stats.practicingUsers = total;
          stats.recentPractices = total;
        } catch {
          // leave at 0
        }
      }

      return stats;
    };

    const [last24h, last7d, last30d, last90d] = await Promise.all(
      rangeKeys.map((k) => runRangeReport(k))
    );

    return NextResponse.json({
      success: true,
      data: {
        realtime: realtimeStats,
        last24h,
        last7d,
        last30d,
        last90d,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching GA4 reports:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch GA4 reports";
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        data: {
          realtime: emptyStats(),
          last24h: emptyStats(),
          last7d: emptyStats(),
          last30d: emptyStats(),
          last90d: emptyStats(),
        },
      },
      { status: 500 }
    );
  }
}
