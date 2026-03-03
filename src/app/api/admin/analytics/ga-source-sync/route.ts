import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getDb } from "@/lib/mongodb";
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { JWT } from "google-auth-library";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function ensureAdmin() {
  const user = await currentUser();
  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const authenticate = await auth();
  const isAdmin = authenticate.sessionClaims?.metadata?.roles?.includes("admin");
  if (!isAdmin) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true as const };
}

function getGa4Client() {
  const ga4PropertyId = process.env.GA4_PROPERTY_ID;
  const analyticsClientEmail =
    process.env.ANALYTICS_CLIENT_EMAIL || process.env.ANALYTICS_CLIENT_ID;
  const analyticsPrivateKey = process.env.ANALYTICS_PRIVATE_KEY;

  if (!ga4PropertyId?.trim()) return null;
  if (!analyticsClientEmail?.trim() || !analyticsPrivateKey?.trim()) return null;

  const privateKey = analyticsPrivateKey
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();

  if (
    !privateKey.includes("-----BEGIN") ||
    !privateKey.includes("-----END")
  ) {
    return null;
  }

  const authClient = new JWT({
    email: analyticsClientEmail.trim(),
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
  });

  return {
    propertyId: `properties/${ga4PropertyId}`,
    client: new BetaAnalyticsDataClient({ authClient }),
  };
}

type GaAttributionRow = {
  userId: string;
  source: string | null;
  medium: string | null;
  campaign: string | null;
};

async function tryFetchAttributionRows(
  ga4: { propertyId: string; client: BetaAnalyticsDataClient },
  userIds: string[]
) {
  const attempts: Array<{
    joinDimension: string;
    sourceDimensions: [string, string, string];
  }> = [
    {
      joinDimension: "userId",
      sourceDimensions: [
        "firstUserSource",
        "firstUserMedium",
        "firstUserCampaignName",
      ],
    },
    {
      joinDimension: "userId",
      sourceDimensions: ["sessionSource", "sessionMedium", "sessionCampaignName"],
    },
    {
      joinDimension: "customEvent:user_id",
      sourceDimensions: [
        "firstUserSource",
        "firstUserMedium",
        "firstUserCampaignName",
      ],
    },
    {
      joinDimension: "customEvent:user_id",
      sourceDimensions: ["sessionSource", "sessionMedium", "sessionCampaignName"],
    },
  ];

  let lastError: unknown = null;

  for (const attempt of attempts) {
    try {
      const [report] = await ga4.client.runReport({
        property: ga4.propertyId,
        dateRanges: [{ startDate: "365daysAgo", endDate: "today" }],
        dimensions: [
          { name: attempt.joinDimension },
          { name: attempt.sourceDimensions[0] },
          { name: attempt.sourceDimensions[1] },
          { name: attempt.sourceDimensions[2] },
        ],
        metrics: [{ name: "totalUsers" }],
        dimensionFilter: {
          filter: {
            fieldName: attempt.joinDimension,
            inListFilter: {
              values: userIds,
              caseSensitive: false,
            },
          },
        },
        limit: 1000,
      });

      const rows = report.rows ?? [];
      const mapped: GaAttributionRow[] = rows
        .map((row) => ({
          userId: row.dimensionValues?.[0]?.value || "",
          source: row.dimensionValues?.[1]?.value || null,
          medium: row.dimensionValues?.[2]?.value || null,
          campaign: row.dimensionValues?.[3]?.value || null,
        }))
        .filter((row) => Boolean(row.userId));

      return {
        rows: mapped,
        schemaUsed: `${attempt.joinDimension} + ${attempt.sourceDimensions.join(
          ","
        )}`,
      };
    } catch (error) {
      lastError = error;
    }
  }

  return {
    rows: [] as GaAttributionRow[],
    schemaUsed: null as string | null,
    error: lastError,
  };
}

export async function POST(request: NextRequest) {
  try {
    const admin = await ensureAdmin();
    if (!admin.ok) return admin.response;

    const body = await request.json().catch(() => ({}));
    const requestedLimit = Number.parseInt(String(body?.limit ?? "2000"), 10);
    const limit =
      Number.isFinite(requestedLimit) && requestedLimit > 0
        ? Math.min(requestedLimit, 3000)
        : 2000;

    const ga4 = getGa4Client();
    if (!ga4) {
      return NextResponse.json(
        { error: "GA4 credentials are not configured." },
        { status: 500 }
      );
    }

    const db = await getDb();
    const recentSubs = await db
      .collection("stripe_subscriptions")
      .find({
        "metadata.user_id": { $exists: true, $ne: null },
      })
      .project({ metadata: 1, createdAt: 1 })
      .sort({ createdAt: -1 })
      .limit(limit * 5)
      .toArray();

    const userIds: string[] = [];
    const seen = new Set<string>();
    for (const sub of recentSubs) {
      const uid = sub?.metadata?.user_id as string | undefined;
      if (!uid || seen.has(uid)) continue;
      seen.add(uid);
      userIds.push(uid);
      if (userIds.length >= limit) break;
    }

    if (!userIds.length) {
      return NextResponse.json({
        success: true,
        message: "No recent subscription users found.",
        scanned: 0,
        updated: 0,
      });
    }

    const fetchResult = await tryFetchAttributionRows(ga4, userIds);
    const rows = fetchResult.rows ?? [];
    const attributionMap = new Map<
      string,
      { source: string | null; medium: string | null; campaign: string | null }
    >();

    for (const row of rows) {
      const rowUserId = row.userId;
      if (!rowUserId) continue;
      attributionMap.set(rowUserId, {
        source: row.source || null,
        medium: row.medium || null,
        campaign: row.campaign || null,
      });
    }

    const now = new Date();
    const gaAttributionCollection = db.collection("ga_user_attribution");

    const operations = userIds.map((userId) => {
      const attribution = attributionMap.get(userId) || {
        source: null,
        medium: null,
        campaign: null,
      };

      return {
        updateOne: {
          filter: { userId },
          update: {
            $set: {
              userId,
              source: attribution.source,
              medium: attribution.medium,
              campaign: attribution.campaign,
              updatedAt: now,
            },
            $setOnInsert: {
              createdAt: now,
            },
          },
          upsert: true,
        },
      };
    });

    if (operations.length) {
      await gaAttributionCollection.bulkWrite(operations);
    }

    return NextResponse.json({
      success: true,
      scanned: userIds.length,
      updated: operations.length,
      matchedInGa: attributionMap.size,
      missingInGa: userIds.length - attributionMap.size,
      schemaUsed: fetchResult.schemaUsed,
      warning:
        !fetchResult.schemaUsed && fetchResult.error
          ? "GA dimensions for per-user attribution are unavailable in this property. Configure user_id/custom dimension in GA4."
          : null,
    });
  } catch (error) {
    console.error("GA source sync failed:", error);
    return NextResponse.json(
      { error: "Failed to sync GA source attribution" },
      { status: 500 }
    );
  }
}
