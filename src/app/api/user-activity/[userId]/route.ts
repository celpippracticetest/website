import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import client from "@/lib/mongodb";

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

    // Check if user is admin (you can implement your own admin check)
    const authenticate = await auth();

    const isAdmin =
      authenticate.sessionClaims?.metadata?.roles?.includes("admin");
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
    const hasScore = searchParams.get("hasScore");
    const minTokens = searchParams.get("minTokens");
    const maxTokens = searchParams.get("maxTokens");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const db = client.db();
    const userActivityCollection = db.collection("useractivities");

    // Build filter
    const filter: any = { userId: resolvedParams?.userId };

    // Date range filter
    if (startDate || endDate) {
      filter.timestampUtc = {};
      if (startDate) {
        filter.timestampUtc.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.timestampUtc.$lte = new Date(endDate);
      }
    }

    // Event type filter
    if (eventType) {
      filter.eventType = { $in: eventType.split(",") };
    }

    // Context filter
    if (context) {
      filter.context = { $in: context.split(",") };
    }

    // Skill filter
    if (skill) {
      filter.skill = { $in: skill.split(",") };
    }

    // Status filter
    if (status) {
      filter.status = { $in: status.split(",") };
    }

    // Has score filter
    if (hasScore === "yes") {
      filter.scoreOverall = { $exists: true, $ne: null };
    } else if (hasScore === "no") {
      filter.scoreOverall = { $exists: false };
    }

    // Token range filter
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

    // Search filter
    if (search) {
      filter.$or = [
        { attemptId: { $regex: search, $options: "i" } },
        { contentId: { $regex: search, $options: "i" } },
        { notes: { $regex: search, $options: "i" } },
      ];
    }

    // Get total count
    const totalCount = await userActivityCollection.countDocuments(filter);

    // Get paginated results
    const skip = (page - 1) * limit;
    const activities = await userActivityCollection
      .find(filter)
      .sort({ timestampUtc: -1 })
      .skip(skip)
      .limit(limit)
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

    return NextResponse.json({
      activities,
      summary,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching user activities:", error);
    return NextResponse.json(
      { error: "Failed to fetch user activities" },
      { status: 500 }
    );
  }
}
