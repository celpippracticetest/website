import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import client from "@/lib/mongodb";
import * as XLSX from "xlsx";

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const currentUserData = await currentUser();
    if (!currentUserData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const authenticate = await auth();

    const isAdmin =
      authenticate.sessionClaims?.metadata?.roles?.includes("admin");
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
    const minTokens = searchParams.get("minTokens");
    const maxTokens = searchParams.get("maxTokens");
    const search = searchParams.get("search");

    const db = client.db();
    const userActivityCollection = db.collection("useractivities");

    // Build filter (same as in the GET route)
    const filter: any = {
      $or: [{ userId: params.userId }, { email: params.userId }],
    };

    if (startDate || endDate) {
      filter.timestampUtc = {};
      if (startDate) {
        filter.timestampUtc.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.timestampUtc.$lte = new Date(endDate);
      }
    }

    if (eventType) {
      filter.eventType = { $in: eventType.split(",") };
    }

    if (context) {
      filter.context = { $in: context.split(",") };
    }

    if (skill) {
      filter.skill = { $in: skill.split(",") };
    }

    if (status) {
      filter.status = { $in: status.split(",") };
    }

    if (hasScore === "yes") {
      filter.scoreOverall = { $exists: true, $ne: null };
    } else if (hasScore === "no") {
      filter.scoreOverall = { $exists: false };
    }

    if (minTokens || maxTokens) {
      filter.$expr = {};
      const tokenSum = {
        $add: [
          { $ifNull: ["$llmTokensPrompt", 0] },
          { $ifNull: ["$llmTokensCompletion", 0] },
        ],
      };

      if (minTokens && maxTokens) {
        filter.$expr.$and = [
          { $gte: [tokenSum, parseInt(minTokens)] },
          { $lte: [tokenSum, parseInt(maxTokens)] },
        ];
      } else if (minTokens) {
        filter.$expr.$gte = [tokenSum, parseInt(minTokens)];
      } else if (maxTokens) {
        filter.$expr.$lte = [tokenSum, parseInt(maxTokens)];
      }
    }

    if (search) {
      filter.$or = [
        { attemptId: { $regex: search, $options: "i" } },
        { contentId: { $regex: search, $options: "i" } },
        { notes: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { userId: { $regex: search, $options: "i" } },
      ];
    }

    // Get all activities (no pagination for export)
    const activities = await userActivityCollection
      .find(filter)
      .sort({ timestampUtc: -1 })
      .toArray();

    // Calculate summary statistics
    const summaryPipeline = [
      { $match: filter },
      {
        $group: {
          _id: null,
          practiceAttempted: {
            $sum: {
              $cond: [
                { $eq: ["$eventType", "practice_attempt_started"] },
                1,
                0,
              ],
            },
          },
          practiceCompleted: {
            $sum: {
              $cond: [
                { $eq: ["$eventType", "practice_attempt_completed"] },
                1,
                0,
              ],
            },
          },
          mockAttempted: {
            $sum: {
              $cond: [{ $eq: ["$eventType", "mock_attempt_started"] }, 1, 0],
            },
          },
          mockCompleted: {
            $sum: {
              $cond: [{ $eq: ["$eventType", "mock_attempt_completed"] }, 1, 0],
            },
          },
          practiceTokens: {
            $sum: {
              $cond: [
                { $eq: ["$context", "practice"] },
                { $add: ["$llmTokensPrompt", "$llmTokensCompletion"] },
                0,
              ],
            },
          },
          mockTokens: {
            $sum: {
              $cond: [
                { $eq: ["$context", "mock"] },
                { $add: ["$llmTokensPrompt", "$llmTokensCompletion"] },
                0,
              ],
            },
          },
          learningTokens: {
            $sum: {
              $cond: [
                { $eq: ["$context", "learning"] },
                { $add: ["$llmTokensPrompt", "$llmTokensCompletion"] },
                0,
              ],
            },
          },
          lastActive: { $max: "$timestampUtc" },
        },
      },
    ];

    const summaryResult = await userActivityCollection
      .aggregate(summaryPipeline)
      .toArray();
    const summary = summaryResult[0] || {
      practiceAttempted: 0,
      practiceCompleted: 0,
      mockAttempted: 0,
      mockCompleted: 0,
      practiceTokens: 0,
      mockTokens: 0,
      learningTokens: 0,
      lastActive: null,
    };

    // Create Excel workbook
    const workbook = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ["User Activity Summary"],
      ["Generated at (UTC)", new Date().toISOString()],
      ["User ID", params.userId],
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
        summary.lastActive ? new Date(summary.lastActive).toISOString() : "N/A",
      ],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

    // Activities sheet
    const activitiesData = activities.map((activity) => [
      activity.timestampUtc
        ? new Date(activity.timestampUtc).toISOString()
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

    // Generate Excel buffer
    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    // Generate filename
    const startDateStr = startDate
      ? new Date(startDate).toISOString().split("T")[0]
      : "all";
    const endDateStr = endDate
      ? new Date(endDate).toISOString().split("T")[0]
      : "present";
    const filename = `user-${params?.userId}-activity-${startDateStr}-${endDateStr}-UTC.xlsx`;

    // Return Excel file
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
