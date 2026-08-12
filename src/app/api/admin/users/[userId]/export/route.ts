import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser, sessionClaimsHasAdminRole } from "@/lib/auth/server-auth";
import { getSql } from "@/lib/pg/pool";
import {
  userActivityRowToDocument,
  type UserActivityRow,
} from "@/lib/userActivity/userActivitiesPg";
import { resolveActivityUserIds } from "@/lib/users/resolveActivityUserIds";
import * as XLSX from "xlsx";

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
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const eventType = searchParams.get("eventType");
    const context = searchParams.get("context");
    const skill = searchParams.get("skill");
    const status = searchParams.get("status");
    const hasScore = searchParams.get("hasScore");
    const search = (searchParams.get("search") || "").trim();

    const activityUserIds = await resolveActivityUserIds(resolvedParams.userId);
    const sql = getSql();
    const eventTypes = eventType
      ? eventType.split(",").map((s) => s.trim()).filter(Boolean)
      : null;
    const contexts = context
      ? context.split(",").map((s) => s.trim()).filter(Boolean)
      : null;
    const skills = skill
      ? skill.split(",").map((s) => s.trim()).filter(Boolean)
      : null;
    const statuses = status
      ? status.split(",").map((s) => s.trim()).filter(Boolean)
      : null;
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    const searchLike = search
      ? `%${search.replace(/%/g, "\\%").replace(/_/g, "\\_")}%`
      : null;

    const rows = await sql<UserActivityRow[]>`
      SELECT *
      FROM public.user_activities
      WHERE user_id = ANY(${activityUserIds})
        AND (${start}::timestamptz IS NULL OR timestamp_utc >= ${start})
        AND (${end}::timestamptz IS NULL OR timestamp_utc <= ${end})
        AND (${eventTypes}::text[] IS NULL OR event_type = ANY(${eventTypes}))
        AND (${contexts}::text[] IS NULL OR context = ANY(${contexts}))
        AND (${skills}::text[] IS NULL OR skill = ANY(${skills}))
        AND (${statuses}::text[] IS NULL OR status = ANY(${statuses}))
        AND (
          ${hasScore}::text IS NULL
          OR ${hasScore}::text = ''
          OR (${hasScore}::text = 'yes' AND score_overall IS NOT NULL)
          OR (${hasScore}::text = 'no' AND score_overall IS NULL)
        )
        AND (
          ${searchLike}::text IS NULL
          OR attempt_id ILIKE ${searchLike}
          OR content_id ILIKE ${searchLike}
          OR notes ILIKE ${searchLike}
          OR email ILIKE ${searchLike}
          OR user_id ILIKE ${searchLike}
        )
      ORDER BY timestamp_utc DESC
      LIMIT 50000
    `;

    const activities = rows.map(userActivityRowToDocument);

    const [summaryRow] = await sql<{
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
        MAX(timestamp_utc) FILTER (
          WHERE event_type IN (
            'practice_attempt_started',
            'practice_attempt_completed',
            'mock_attempt_started',
            'mock_attempt_completed',
            'login'
          )
        ) AS last_active
      FROM public.user_activities
      WHERE user_id = ANY(${activityUserIds})
        AND (${start}::timestamptz IS NULL OR timestamp_utc >= ${start})
        AND (${end}::timestamptz IS NULL OR timestamp_utc <= ${end})
    `;

    const summary = {
      practiceAttempted: summaryRow?.practice_attempted || 0,
      practiceCompleted: summaryRow?.practice_completed || 0,
      mockAttempted: summaryRow?.mock_attempted || 0,
      mockCompleted: summaryRow?.mock_completed || 0,
      practiceTokens: summaryRow?.practice_tokens || 0,
      mockTokens: summaryRow?.mock_tokens || 0,
      learningTokens: summaryRow?.learning_tokens || 0,
      lastActive: summaryRow?.last_active || null,
    };

    const workbook = XLSX.utils.book_new();

    const summaryData = [
      ["User Activity Summary"],
      ["Generated at (UTC)", new Date().toISOString()],
      ["User ID", resolvedParams.userId],
      ["Resolved activity user IDs", activityUserIds.join(", ")],
      ["Date Range", `${startDate || "All time"} - ${endDate || "Present"}`],
      [""],
      ["Practice Attempted", summary.practiceAttempted],
      ["Practice Completed", summary.practiceCompleted],
      ["Mock Exam Attempted", summary.mockAttempted],
      ["Mock Exam Completed", summary.mockCompleted],
      [""],
      ["LLM Tokens - Practice", summary.practiceTokens],
      ["LLM Tokens - Mock Exams", summary.mockTokens],
      ["LLM Tokens - Learning", summary.learningTokens],
      [
        "Last Active (UTC)",
        summary.lastActive != null && summary.lastActive !== ""
          ? new Date(String(summary.lastActive)).toISOString()
          : "N/A",
      ],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

    const activitiesData = activities.map((activity) => [
      activity.timestampUtc
        ? new Date(String(activity.timestampUtc)).toISOString()
        : "",
      activity.eventType || "",
      activity.context || "",
      activity.skill || "",
      activity.attemptId || "",
      activity.contentId || "",
      activity.status || "",
      activity.durationSeconds || "",
      activity.scoreOverall || "",
      activity.scoreBreakdownJson || "",
      activity.llmTokensPrompt || 0,
      activity.llmTokensCompletion || 0,
      activity.ipAddress || "",
      activity.deviceUaHash || "",
      activity.notes || "",
    ]);

    const headers = [
      "Timestamp (UTC)",
      "Event Type",
      "Context",
      "Skill",
      "Attempt ID",
      "Content ID",
      "Status",
      "Duration (seconds)",
      "Score Overall",
      "Score Breakdown (JSON)",
      "LLM Tokens Prompt",
      "LLM Tokens Completion",
      "IP Address",
      "Device UA Hash",
      "Notes",
    ];

    const activitiesSheet = XLSX.utils.aoa_to_sheet([
      headers,
      ...activitiesData,
    ]);
    XLSX.utils.book_append_sheet(workbook, activitiesSheet, "Activity Log");

    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    const startDateStr = startDate
      ? new Date(startDate).toISOString().split("T")[0]
      : "all";
    const endDateStr = endDate
      ? new Date(endDate).toISOString().split("T")[0]
      : "present";
    const filename = `user-${resolvedParams?.userId}-activity-${startDateStr}-${endDateStr}-UTC.xlsx`;

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": excelBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error exporting user activities:", error);
    return NextResponse.json(
      { error: "Failed to export user activities" },
      { status: 500 }
    );
  }
}
