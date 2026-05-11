import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { LeagueRepository } from "@/repositories/league.repo";
import { auth } from "@clerk/nextjs/server";
import { ObjectId } from "bson";

// Helper function to get league level for comparison
function getLeagueLevel(leagueType: string): number {
  switch (leagueType) {
    case "bronze": return 1;
    case "silver": return 2;
    case "gold": return 3;
    default: return 0;
  }
}
import { TUserLeaguePoints } from "@/models/league.model";

export async function GET(request: NextRequest) {
  try {
    console.log("League API GET request received");

    let userId;
    try {
      const authResult = await auth();
      userId = authResult.userId;
      console.log("League API GET: Authenticated userId:", userId);
      console.log("Auth result details:", { userId: userId ? "present" : "missing" });
    } catch (authError) {
      console.error("Auth error:", authError);
      // Don't return error, just continue without userId
      userId = null;
    }

    const db = await getDb();
    const leagueRepo = new LeagueRepository(db);

    // Initialize default leagues if they don't exist
    await leagueRepo.initializeDefaultLeagues();

    // Ensure there is an active season (mirror GET bootstrap logic)
    try {
      let currentSeason = await leagueRepo.getCurrentSeason();
      if (!currentSeason) {
        const seasonId = `season_${Date.now()}`;
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 7);

        const leagues = await leagueRepo.getAllLeagues();
        const seasonLeagues: { leagueType: "bronze" | "silver" | "gold"; groups: ObjectId[] }[] = [];

        for (const league of leagues) {
          const groupId = await leagueRepo.createLeagueGroup({
            leagueId: league._id,
            groupNumber: 1,
            seasonId,
            startDate,
            endDate,
            status: "active",
            maxUsers: 10,
            users: [],
          });

          seasonLeagues.push({
            leagueType: league.type as "bronze" | "silver" | "gold",
            groups: [new ObjectId(groupId)],
          });
        }

        await leagueRepo.createSeason({
          seasonId,
          startDate,
          endDate,
          isActive: true,
          leagues: seasonLeagues,
        });
      }
    } catch (bootstrapErr) {
      console.error("Failed to ensure active season in POST /api/league:", bootstrapErr);
    }

    // Clean up any duplicate users in groups
    await leagueRepo.cleanupDuplicateUsers();

    // Get current season or create one
    let currentSeason = await leagueRepo.getCurrentSeason();
    // Failsafe: if season passed endDate but still active (cron missed), end it now
    if (currentSeason && currentSeason.endDate && new Date() >= new Date(currentSeason.endDate)) {
      try {
        await leagueRepo.endCurrentSeason();
      } catch (e) {
        console.error("Auto endCurrentSeason failed in GET /api/league:", e);
      }
      currentSeason = await leagueRepo.getCurrentSeason();
    }
    if (!currentSeason) {
      // Auto-create season
      const seasonId = `season_${Date.now()}`;
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7); // 7 days from now

      const leagues = await leagueRepo.getAllLeagues();
      const seasonLeagues = [];

      for (const league of leagues) {
        // Create initial group for each league
        const groupId = await leagueRepo.createLeagueGroup({
          leagueId: league._id,
          groupNumber: 1,
          seasonId,
          startDate,
          endDate,
          status: "active",
          maxUsers: 10,
          users: [],
        });

        seasonLeagues.push({
          leagueType: league.type,
          groups: [new ObjectId(groupId)],
        });
      }

      await leagueRepo.createSeason({
        seasonId,
        startDate,
        endDate,
        isActive: true,
        leagues: seasonLeagues,
      });

      currentSeason = await leagueRepo.getCurrentSeason();
    }

    // Ensure current season has all leagues (Bronze, Silver, Gold)
    // This fixes the issue where seasons created before all leagues existed are missing some
    if (currentSeason) {
      const allLeagues = await leagueRepo.getAllLeagues();
      const existingTypes = new Set(currentSeason.leagues.map(l => l.leagueType));
      let seasonUpdated = false;

      for (const league of allLeagues) {
        if (!existingTypes.has(league.type as any)) {
          console.log(`Adding missing league ${league.type} to season ${currentSeason.seasonId}`);
          // Create a group for this missing league
          const groupId = await leagueRepo.createLeagueGroup({
            leagueId: league._id,
            groupNumber: 1,
            seasonId: currentSeason.seasonId,
            startDate: new Date(currentSeason.startDate),
            endDate: new Date(currentSeason.endDate),
            status: "active",
            maxUsers: 10,
            users: [],
          });

          currentSeason.leagues.push({
            leagueType: league.type as any,
            groups: [new ObjectId(groupId)],
          });
          seasonUpdated = true;
        }
      }

      if (seasonUpdated) {
        await db.collection("league_seasons").updateOne(
          { seasonId: currentSeason.seasonId },
          { $set: { leagues: currentSeason.leagues } }
        );
      }
    }

    // Get user's league points (only if user is authenticated)
    let userPoints = null;
    if (userId) {
      userPoints = await leagueRepo.getUserLeaguePoints(
        userId,
        currentSeason!.seasonId
      );
      console.log("League API GET: User points record:", {
        userId,
        seasonId: currentSeason!.seasonId,
        hasPointsRecord: !!userPoints,
        hasLastSeasonResult: !!userPoints?.lastSeasonResult,
        viewed: userPoints?.lastSeasonResult?.viewed
      });
    }

    // Get all leagues
    const leagues = await leagueRepo.getAllLeagues();

    // Auto-assign user to appropriate league if not already assigned (only if user is authenticated)
    if (userId && !userPoints) {
      console.log("User not in league, checking for auto-assignment...");
      const overallPoints = await leagueRepo.getUserOverallPoints(userId);
      console.log("User overall points:", overallPoints);

      // Only assign users to leagues if they have points
      if (overallPoints > 0) {
        let targetLeagueType = "bronze";

        console.log("Target league type:", targetLeagueType);
        // Use the improved auto-assignment method
        const autoAssignResult = await leagueRepo.autoAssignUserToLeague(userId);
        console.log("Auto-assignment result:", autoAssignResult);

        if (autoAssignResult) {
          // Refresh user points after assignment
          userPoints = await leagueRepo.getUserLeaguePoints(
            userId,
            currentSeason!.seasonId
          );
          console.log("User points after assignment:", userPoints);
        }
      } else {
        console.log("User has no points, not assigning to league");
      }
    }

    // Determine user's current league
    let currentLeague = null;
    let userGroup = null;

    if (userId && userPoints) {
      // Find user's active group by checking their groupId directly
      if (userPoints.groupId) {
        const group = await leagueRepo.getGroupLeaderboard(
          userPoints.groupId.toString()
        );
        if (group) {
          // Find the league type for this group
          for (const league of currentSeason!.leagues) {
            if (league.groups.some(gId => gId.toString() === userPoints.groupId.toString())) {
              currentLeague = leagues.find((l) => l.type === league.leagueType);
              userGroup = group;
              break;
            }
          }
        }
      }

      // Fallback: search all groups if not found above
      if (!currentLeague) {
        for (const league of currentSeason!.leagues) {
          for (const groupId of league.groups) {
            const group = await leagueRepo.getGroupLeaderboard(
              groupId.toString()
            );
            if (group && group.users.some((u: any) => u.userId === userId)) {
              currentLeague = leagues.find((l) => l.type === league.leagueType);
              userGroup = group;
              break;
            }
          }
          if (currentLeague) break;
        }
      }
    }

    // Prepare sample groups for public view (one per league type)
    let sampleGroup: any = null; // kept for backward compatibility
    let sampleLeagueType: string | null = null; // kept for backward compatibility
    const sampleGroupsByType: Record<string, any> = {};

    try {
      if (currentSeason && Array.isArray(currentSeason.leagues)) {
        for (const league of currentSeason.leagues) {
          if (!league) continue;
          // If we already found a sample for this type, skip
          if (sampleGroupsByType[league.leagueType]) continue;

          // OPTIMIZATION: Instead of fetching ALL groups and sorting in memory,
          // find ONE active group that has users.
          // We prefer a group with users, but any active group will do as a base.
          // Since we can't easily sort by array length in MongoDB without aggregation,
          // we'll try to find a group with at least one user first.

          let chosenGroupId: string | null = null;

          // Try to find a group with users first
          const activeGroupWithUsers = await db.collection("league_groups").findOne({
            seasonId: currentSeason.seasonId,
            // We need to map leagueType back to leagueId if possible, or use the groups array from season
            _id: { $in: league.groups.map(id => new ObjectId(id)) },
            status: "active",
            "users.0": { $exists: true }
          });

          if (activeGroupWithUsers) {
            chosenGroupId = activeGroupWithUsers._id.toString();
          } else if (league.groups.length > 0) {
            // Fallback to the first group if no group has users yet
            chosenGroupId = league.groups[0].toString();
          }

          let chosen: any = null;

          if (chosenGroupId) {
            // Only fetch leaderboard for the ONE chosen group
            chosen = await leagueRepo.getGroupLeaderboard(chosenGroupId);
          }

          // If chosen group is small (less than 5 users), fetch top users to fill it
          if (chosen && chosen.users.length < 5) {
            const topUsers = await leagueRepo.getTopUsersForLeague(league.leagueType, 10);
            // Merge top users into the group, avoiding duplicates
            const existingIds = new Set(chosen.users.map((u: any) => u.userId));
            for (const user of topUsers) {
              if (!existingIds.has(user.userId)) {
                chosen.users.push({
                  ...user,
                  position: chosen.users.length + 1,
                  status: "safe"
                });
                existingIds.add(user.userId);
              }
            }
            // Re-sort and re-position
            chosen.users.sort((a: any, b: any) => b.points - a.points);
            chosen.users.forEach((u: any, i: number) => u.position = i + 1);
          } else if (!chosen) {
            // If no group found at all, create a virtual group from top users
            const topUsers = await leagueRepo.getTopUsersForLeague(league.leagueType, 10);
            if (topUsers.length > 0) {
              chosen = {
                _id: "virtual_sample",
                leagueId: "virtual",
                groupNumber: 1,
                seasonId: currentSeason.seasonId,
                status: "active",
                maxUsers: 10,
                users: topUsers.map((u, i) => ({
                  ...u,
                  position: i + 1,
                  status: "safe"
                }))
              };
            }
          }

          if (chosen) {
            sampleGroupsByType[league.leagueType] = chosen;
            if (!sampleGroup) {
              sampleGroup = chosen;
              sampleLeagueType = league.leagueType;
            }
          }
        }
      }
    } catch (err) {
      console.error("Error finding sample group for public view:", err);
      sampleGroup = null;
      sampleLeagueType = null;
    }

    // Get skills tried by user (if authenticated)
    let skillsTried: string[] = [];
    if (userId) {
      try {
        // Query user activities to find which skills they've practiced
        // Only get activities from the current season to avoid old data
        const currentSeasonStart = currentSeason?.startDate ? new Date(currentSeason.startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago as fallback

        // OPTIMIZATION: Use distinct to get unique skills directly from DB
        const uniqueSkills = await db.collection("useractivities").distinct("skill", {
          userId: userId,
          eventType: "practice_attempt_completed",
          status: "completed",
          timestampUtc: { $gte: currentSeasonStart },
          skill: { $ne: null }
        });

        skillsTried = uniqueSkills as string[];
        console.log("Skills tried extracted (current season - optimized):", skillsTried);
      } catch (error) {
        console.error("Error fetching skills tried:", error);
        skillsTried = [];
      }
    }

    return NextResponse.json({
      currentSeason,
      leagues,
      userPoints,
      currentLeague,
      userGroup,
      sampleGroupsByType,
      sampleGroup,
      sampleLeagueType,
      pointsBreakdown: userPoints?.pointsBreakdown || {},
      tasksCompleted: userPoints?.tasksCompleted || [],
      skillsTried: skillsTried,
      debug: {
        skillsTriedCount: skillsTried.length,
        skillsTriedArray: skillsTried,
        currentSeasonStart: currentSeason?.startDate,
        userActivitiesCount: userId ? (await db.collection("useractivities").countDocuments({
          userId: userId,
          eventType: "practice_attempt_completed",
          status: "completed",
          timestampUtc: { $gte: currentSeason?.startDate ? new Date(currentSeason.startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        })) : 0
      }
    });
  } catch (error: any) {
    console.error("Error fetching league data:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));
    return NextResponse.json(
      { error: "Internal server error", details: error?.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("League API POST request received");

    let userId;
    try {
      const authResult = await auth();
      userId = authResult.userId;
      console.log("Auth result:", { userId: userId ? "present" : "missing" });
    } catch (authError) {
      console.error("Auth error:", authError);
      // Don't return error, just continue without userId
      userId = null;
    }

    let body;
    try {
      body = await request.json();
      console.log("Request body received:", body);
    } catch (jsonError) {
      console.error("JSON parsing error:", jsonError);
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { action, leagueType, points: rawPoints, pointsType } = body;
    const points =
      typeof rawPoints === "number"
        ? rawPoints
        : typeof rawPoints === "string"
          ? Number(rawPoints)
          : rawPoints;
    console.log("Extracted parameters:", { action, leagueType, points, pointsType });

    let db;
    try {
      db = await getDb();
      console.log("Database connected successfully");
    } catch (dbError) {
      console.error("Database connection error:", dbError);
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      );
    }

    const leagueRepo = new LeagueRepository(db);

    // Initialize default leagues if they don't exist
    await leagueRepo.initializeDefaultLeagues();

    if (action === "auto_assign_league") {
      if (!userId) {
        return NextResponse.json(
          { error: "User ID is required for auto-assignment" },
          { status: 400 }
        );
      }

      // Get current season
      const currentSeason = await leagueRepo.getCurrentSeason();
      if (!currentSeason) {
        return NextResponse.json(
          { error: "No active season" },
          { status: 404 }
        );
      }

      // Get user's current points
      const userPoints = await leagueRepo.getUserLeaguePoints(
        userId,
        currentSeason.seasonId
      );
      const totalPoints = userPoints?.totalPoints || 0;

      // Only assign users to leagues if they have points
      if (totalPoints === 0) {
        return NextResponse.json({
          success: false,
          message: "User needs to earn points before joining a league",
        });
      }

      // Use the improved auto-assignment method
      const autoAssignResult = await leagueRepo.autoAssignUserToLeague(userId);

      if (autoAssignResult) {
        return NextResponse.json({
          success: true,
          message: "User assigned to league successfully"
        });
      } else {
        return NextResponse.json({
          success: false,
          message: "Failed to assign user to league",
        });
      }
    } else if (action === "add_points") {
      if (!userId) {
        return NextResponse.json(
          { error: "User ID is required for adding points" },
          { status: 400 }
        );
      }

      console.log("Adding points:", { userId, points, pointsType });

      // Validate required parameters
      if (points === undefined || points === null) {
        console.error("Points is undefined or null");
        return NextResponse.json(
          { error: "Points is required" },
          { status: 400 }
        );
      }

      if (
        typeof points !== "number" ||
        !Number.isFinite(points) ||
        points <= 0
      ) {
        console.error("Invalid points value:", points, "type:", typeof points);
        return NextResponse.json(
          { error: "Invalid points value - must be a positive number" },
          { status: 400 }
        );
      }

      if (!pointsType || typeof pointsType !== 'string') {
        console.error("Invalid pointsType:", pointsType, "type:", typeof pointsType);
        return NextResponse.json(
          { error: "pointsType is required and must be a string" },
          { status: 400 }
        );
      }

      // Validate pointsType is one of the allowed values
      const validPointsTypes = ['mockExams', 'practiceSessions', 'aiFeedback', 'skillsTried', 'timeSpent'];
      if (!validPointsTypes.includes(pointsType)) {
        console.error("Invalid pointsType value:", pointsType, "valid types:", validPointsTypes);
        return NextResponse.json(
          { error: `Invalid pointsType. Must be one of: ${validPointsTypes.join(', ')}` },
          { status: 400 }
        );
      }

      // Get current season
      const currentSeason = await leagueRepo.getCurrentSeason();
      if (!currentSeason) {
        console.error("No active season found");
        return NextResponse.json(
          { error: "No active season" },
          { status: 404 }
        );
      }

      console.log("Current season:", currentSeason.seasonId);

      // Add points to user (both overall and season points)
      console.log("Calling addPointsToUser with:", {
        userId,
        seasonId: currentSeason.seasonId,
        pointsType,
        points
      });

      const success = await leagueRepo.addPointsToUser(
        userId,
        currentSeason.seasonId,
        pointsType as keyof TUserLeaguePoints["pointsBreakdown"],
        points
      );

      console.log("Add points result:", success);

      // After adding points, try to auto-assign user to league if not already assigned
      if (success) {
        console.log("Points added successfully, checking for league assignment...");
        const currentLeague = await leagueRepo.getUserCurrentLeague(userId);
        if (!currentLeague) {
          console.log("User not in league, attempting auto-assignment...");
          const autoAssignResult = await leagueRepo.autoAssignUserToLeague(userId);
          console.log("Auto-assignment result after points:", autoAssignResult);
        }
      }

      if (!success) {
        console.error("addPointsToUser returned false - checking user league status...");

        // Check if user has any league record
        const userPoints = await leagueRepo.getUserLeaguePoints(userId, currentSeason.seasonId);
        console.log("User league points record:", userPoints);

        // Check if user has overall points
        const overallPoints = await leagueRepo.getUserOverallPoints(userId);
        console.log("User overall points:", overallPoints);

        return NextResponse.json(
          {
            error: "Failed to add points",
            details: {
              hasLeagueRecord: Boolean(userPoints),
              overallPoints:
                typeof overallPoints === "number" && Number.isFinite(overallPoints)
                  ? overallPoints
                  : Number(overallPoints) || 0,
              seasonId: String(currentSeason.seasonId),
            },
          },
          { status: 400 }
        );
      }

      // Update group leaderboard with season points (guard missing groupId)
      const userPoints = await leagueRepo.getUserLeaguePoints(
        userId,
        currentSeason.seasonId
      );

      let groupIdToUpdate: string | null = null;
      const seasonPointsToApply = userPoints?.totalPoints ?? points;

      if (userPoints && (userPoints as any).groupId) {
        groupIdToUpdate = (userPoints as any).groupId.toString();
      } else {
        const inferred = await leagueRepo.getUserCurrentLeague(userId);
        if (inferred?.groupId) groupIdToUpdate = inferred.groupId;
      }

      if (groupIdToUpdate) {
        await leagueRepo.updateUserPointsInGroup(
          userId,
          groupIdToUpdate,
          seasonPointsToApply
        );
      }

      // Check if user should change league based on overall points
      const overallPoints = await leagueRepo.getUserOverallPoints(userId);
      console.log("Checking for league change. Overall points:", overallPoints);

      // Determine target league based on overall points
      // Align thresholds with autoAssignUserToLeague to prevent immediate demotion
      let targetLeagueType = "bronze";
      if (overallPoints >= 150) {
        targetLeagueType = "gold";
      } else if (overallPoints >= 100) {
        targetLeagueType = "silver";
      } else if (overallPoints > 0) {
        targetLeagueType = "bronze"; // any positive points keep user in Bronze
      } else {
        targetLeagueType = "none";
      }

      // Check if user is already in the correct league
      const currentLeague = await leagueRepo.getUserCurrentLeague(userId);
      // NO IMMEDIATE LEAGUE CHANGES - Users stay in their current league until season end
      // League progression only happens at season end (every 7 days)
      console.log("Points added successfully. League changes will be processed at season end.");

      return NextResponse.json({
        success: true,
        message: "Points added successfully",
        points: points,
        pointsType: pointsType,
        leagueChanged: false, // No immediate league changes
        action: null, // No immediate action
        newLeague: null, // No immediate league change
        previousLeague: currentLeague?.type || null
      });
    } else if (action === "complete_task") {
      if (!userId) {
        return NextResponse.json(
          { error: "User ID is required for completing tasks" },
          { status: 400 }
        );
      }

      // Get current season
      const currentSeason = await leagueRepo.getCurrentSeason();
      if (!currentSeason) {
        return NextResponse.json(
          { error: "No active season" },
          { status: 404 }
        );
      }

      // Get user points
      const userPoints = await leagueRepo.getUserLeaguePoints(
        userId,
        currentSeason.seasonId
      );
      if (!userPoints) {
        return NextResponse.json(
          { error: "User not in league" },
          { status: 400 }
        );
      }

      // Find task in league requirements
      const { taskId } = body;
      if (!taskId) {
        return NextResponse.json(
          { error: "Task ID is required" },
          { status: 400 }
        );
      }

      // Determine league type from user's current league
      const currentLeague = await leagueRepo.getUserCurrentLeague(userId);
      if (!currentLeague) {
        return NextResponse.json(
          { error: "User not in any league" },
          { status: 400 }
        );
      }

      const league = await leagueRepo.getLeagueByType(currentLeague.type as "bronze" | "silver" | "gold");
      if (!league) {
        return NextResponse.json(
          { error: "League not found" },
          { status: 404 }
        );
      }

      const task = league.requirements.tasks.find((t) => t.id === taskId);
      if (!task) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }

      // Check if task already completed
      if (userPoints.tasksCompleted.includes(task.id)) {
        return NextResponse.json(
          { error: "Task already completed" },
          { status: 400 }
        );
      }

      // Add task completion
      await leagueRepo.updateUserLeaguePoints(userId, currentSeason.seasonId, {
        tasksCompleted: [...userPoints.tasksCompleted, task.id],
      });

      // Add points for task completion
      await leagueRepo.addPointsToUser(
        userId,
        currentSeason.seasonId,
        "practiceSessions",
        task.points
      );

      return NextResponse.json({ success: true, points: task.points });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error in league API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
