import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { JWT } from "google-auth-library";
import { resolveGa4Credentials } from "@/lib/ga4Credentials";
import type { LiveStatsJsonBody } from "@/lib/ga4LiveStatsCache";

const emptySkillBreakdown = {
  Speaking: 0,
  Writing: 0,
  Listening: 0,
  Reading: 0,
};

function emptyStatsPayload() {
  return {
    onlineUsers: 0,
    recentSignups: 0,
    practicingUsers: 0,
    recentPractices: 0,
    skillBreakdown: { ...emptySkillBreakdown },
  };
}

/**
 * Fetches GA4 metrics for `/api/analytics/live-stats`.
 * `onlineUsers` is realtime `activeUsers` only (omitted when realtime fails).
 */
export async function buildGa4LiveStatsBody(): Promise<LiveStatsJsonBody> {
  const ga4PropertyId = process.env.GA4_PROPERTY_ID;
  if (!ga4PropertyId?.trim()) {
    return {
      success: false,
      error:
        "GA4_PROPERTY_ID is not set. Add it in Vercel (Project → Settings → Environment Variables) for Preview/Development. Get the numeric ID from GA4 Admin → Property settings.",
      stats: emptyStatsPayload(),
    };
  }

  const resolved = resolveGa4Credentials();
  if ("error" in resolved) {
    return {
      success: false,
      error: resolved.error,
      stats: emptyStatsPayload(),
    };
  }

  const propertyId = `properties/${ga4PropertyId}`;
  const authClient = new JWT({
    email: resolved.email,
    key: resolved.privateKey,
    scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
  });
  const analyticsDataClient = new BetaAnalyticsDataClient({ authClient });

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const dateFmt = (d: Date) => d.toISOString().slice(0, 10);

  let activeUsersNow: number | null = null;
  let sessionsToday: number | null = null;
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
      metrics: [{ name: "sessions" }, { name: "newUsers" }],
    });
    const parsedSessions = parseInt(
      last24HoursResponse.rows?.[0]?.metricValues?.[0]?.value ?? "",
      10,
    );
    if (Number.isFinite(parsedSessions)) {
      sessionsToday = parsedSessions;
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
    if (totalPracticingFromGa4 === 0 && totalPracticeEventsAllSkills > 0) {
      totalPracticingFromGa4 = totalPracticeEventsAllSkills;
    }
  } catch (practiceErr) {
    console.warn(
      "[GA4] Practice-by-skill report failed:",
      practiceErr instanceof Error ? practiceErr.message : practiceErr,
    );
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

  const skillBreakdown = hasPerSkillBreakdown
    ? {
        Speaking: speakingCount,
        Writing: writingCount,
        Listening: listeningCount,
        Reading: readingCount,
      }
    : { ...emptySkillBreakdown };

  const totalPracticing = totalPracticingFromGa4 ?? 0;

  // Header “online now” = GA4 realtime activeUsers only (not 24h totals or event counts).
  const onlineUsers =
    activeUsersNow !== null && activeUsersNow > 0 ? activeUsersNow : null;

  console.log("[GA4 Live Stats - service_account]", {
    activeUsersNow,
    sessionsToday,
    newUsers24h,
    totalPracticing,
    skillBreakdown,
    onlineUsers,
  });

  const isDecoderError = warnings.some(
    (w) =>
      w.includes("DECODER") ||
      w.includes("unsupported") ||
      w.includes("Getting metadata from plugin failed"),
  );
  if (isDecoderError) {
    return {
      success: false,
      error:
        'ANALYTICS_PRIVATE_KEY is invalid (decoder/format error). Paste the full PEM key in one line and use literal backslash-n (\\n) for line breaks. Example: "-----BEGIN PRIVATE KEY-----\\nMIIE...\\n-----END PRIVATE KEY-----\\n"',
      stats: emptyStatsPayload(),
    };
  }

  const recentVisits =
    sessionsToday != null && newUsers24h != null
      ? Math.max(sessionsToday, newUsers24h)
      : (sessionsToday ?? newUsers24h);

  return {
    success: true,
    stats: {
      ...(onlineUsers !== null ? { onlineUsers } : {}),
      ...(newUsers24h !== null ? { recentSignups: newUsers24h } : {}),
      ...(recentVisits !== null ? { recentVisits } : {}),
      practicingUsers: totalPracticing,
      recentPractices: totalPracticing,
      skillBreakdown,
    },
    timestamp: new Date().toISOString(),
    source: "google_analytics_4_service_account",
    ...(warnings.length > 0 && { warnings }),
  };
}
