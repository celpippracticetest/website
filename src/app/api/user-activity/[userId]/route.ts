import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser, sessionClaimsHasAdminRole } from "@/lib/auth/server-auth";
import { getSql } from "@/lib/pg/pool";
import {
  userActivityRowToDocument,
  type UserActivityRow,
} from "@/lib/userActivity/userActivitiesPg";
import documentsClient from "@/lib/appDocumentsClient";
import { matchUsersCollectionByWebUserIds } from "@/lib/users/userDocumentIdentity";

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ userId: string }> }
) {
  const resolvedParams = await props.params;
  try {
    const currentUserData = await currentUser();
    if (!currentUserData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authenticate = await auth();
    const isAdmin = sessionClaimsHasAdminRole(authenticate.sessionClaims);
    if (!isAdmin && currentUserData.id !== resolvedParams.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const eventType = searchParams.get("eventType");
    const context = searchParams.get("context");
    const skill = searchParams.get("skill");
    const status = searchParams.get("status");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10) || 50));
    const offset = (page - 1) * limit;
    const userId = resolvedParams.userId;

    const sql = getSql();
    const eventTypes = eventType ? eventType.split(",").map((s) => s.trim()).filter(Boolean) : null;
    const contexts = context ? context.split(",").map((s) => s.trim()).filter(Boolean) : null;
    const skills = skill ? skill.split(",").map((s) => s.trim()).filter(Boolean) : null;
    const statuses = status ? status.split(",").map((s) => s.trim()).filter(Boolean) : null;
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    const [{ c: totalCount }] = await sql<{ c: number }[]>`
      SELECT COUNT(*)::int AS c
      FROM public.user_activities
      WHERE user_id = ${userId}
        AND (${start}::timestamptz IS NULL OR timestamp_utc >= ${start})
        AND (${end}::timestamptz IS NULL OR timestamp_utc <= ${end})
        AND (${eventTypes}::text[] IS NULL OR event_type = ANY(${eventTypes}))
        AND (${contexts}::text[] IS NULL OR context = ANY(${contexts}))
        AND (${skills}::text[] IS NULL OR skill = ANY(${skills}))
        AND (${statuses}::text[] IS NULL OR status = ANY(${statuses}))
    `;

    const rows = await sql<UserActivityRow[]>`
      SELECT *
      FROM public.user_activities
      WHERE user_id = ${userId}
        AND (${start}::timestamptz IS NULL OR timestamp_utc >= ${start})
        AND (${end}::timestamptz IS NULL OR timestamp_utc <= ${end})
        AND (${eventTypes}::text[] IS NULL OR event_type = ANY(${eventTypes}))
        AND (${contexts}::text[] IS NULL OR context = ANY(${contexts}))
        AND (${skills}::text[] IS NULL OR skill = ANY(${skills}))
        AND (${statuses}::text[] IS NULL OR status = ANY(${statuses}))
      ORDER BY timestamp_utc DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [summary] = await sql<{
      practice_attempted: number;
      practice_completed: number;
      mock_attempted: number;
      mock_completed: number;
      practice_tokens: number;
      mock_tokens: number;
      learning_tokens: number;
      last_active: Date | null;
    }[]>`
      SELECT
        COUNT(*) FILTER (WHERE event_type = 'practice_attempt_started')::int AS practice_attempted,
        COUNT(*) FILTER (WHERE event_type = 'practice_attempt_completed')::int AS practice_completed,
        COUNT(*) FILTER (WHERE event_type = 'mock_attempt_started')::int AS mock_attempted,
        COUNT(*) FILTER (WHERE event_type = 'mock_attempt_completed')::int AS mock_completed,
        COALESCE(SUM(CASE WHEN context = 'practice' THEN COALESCE(llm_tokens_prompt,0)+COALESCE(llm_tokens_completion,0) ELSE 0 END),0)::int AS practice_tokens,
        COALESCE(SUM(CASE WHEN context = 'mock' THEN COALESCE(llm_tokens_prompt,0)+COALESCE(llm_tokens_completion,0) ELSE 0 END),0)::int AS mock_tokens,
        COALESCE(SUM(CASE WHEN context = 'learning' THEN COALESCE(llm_tokens_prompt,0)+COALESCE(llm_tokens_completion,0) ELSE 0 END),0)::int AS learning_tokens,
        MAX(timestamp_utc) AS last_active
      FROM public.user_activities
      WHERE user_id = ${userId}
        AND (${start}::timestamptz IS NULL OR timestamp_utc >= ${start})
        AND (${end}::timestamptz IS NULL OR timestamp_utc <= ${end})
    `;

    let userDoc: Record<string, unknown> | null = null;
    try {
      const db = documentsClient.db();
      userDoc = (await db
        .collection("users")
        .findOne(matchUsersCollectionByWebUserIds(userId))) as Record<string, unknown> | null;
    } catch {
      userDoc = null;
    }

    return NextResponse.json({
      activities: rows.map(userActivityRowToDocument),
      pagination: {
        page,
        limit,
        totalCount: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit),
      },
      summary: {
        practiceAttempted: summary?.practice_attempted || 0,
        practiceCompleted: summary?.practice_completed || 0,
        mockAttempted: summary?.mock_attempted || 0,
        mockCompleted: summary?.mock_completed || 0,
        practiceTokens: summary?.practice_tokens || 0,
        mockTokens: summary?.mock_tokens || 0,
        learningTokens: summary?.learning_tokens || 0,
        lastActive: summary?.last_active || null,
      },
      user: userDoc,
    });
  } catch (error) {
    console.error("Error fetching user activity:", error);
    return NextResponse.json(
      { error: "Failed to fetch user activity" },
      { status: 500 }
    );
  }
}
