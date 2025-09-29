import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { LeagueRepository } from "@/repositories/league.repo";
import { auth } from "@clerk/nextjs/server";
import { ObjectId } from "mongodb";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();
    const leagueRepo = new LeagueRepository(db);

    // Get current season
    const currentSeason = await leagueRepo.getCurrentSeason();
    if (!currentSeason) {
      return NextResponse.json({ error: "No active season" }, { status: 404 });
    }

    // Get user's league points
    const userPoints = await leagueRepo.getUserLeaguePoints(userId, currentSeason.seasonId);
    
    // Get all leagues
    const leagues = await leagueRepo.getAllLeagues();

    // Determine user's current league
    let currentLeague = null;
    let userGroup = null;
    
    if (userPoints) {
      // Find user's active group
      for (const league of currentSeason.leagues) {
        for (const groupId of league.groups) {
          const group = await leagueRepo.getGroupLeaderboard(groupId.toString());
          if (group && group.users.some((u: any) => u.userId === userId)) {
            currentLeague = leagues.find(l => l.type === league.leagueType);
            userGroup = group;
            break;
          }
        }
        if (currentLeague) break;
      }
    }

    return NextResponse.json({
      currentSeason,
      leagues,
      userPoints,
      currentLeague,
      userGroup,
    });

  } catch (error) {
    console.error("Error fetching league data:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, leagueType, points, pointsType } = body;

    const db = await getDb();
    const leagueRepo = new LeagueRepository(db);

    // Initialize default leagues if they don't exist
    await leagueRepo.initializeDefaultLeagues();

    if (action === "auto_assign_league") {
      // Get current season
      const currentSeason = await leagueRepo.getCurrentSeason();
      if (!currentSeason) {
        return NextResponse.json({ error: "No active season" }, { status: 404 });
      }

      // Get user's current points
      const userPoints = await leagueRepo.getUserLeaguePoints(userId, currentSeason.seasonId);
      const totalPoints = userPoints?.totalPoints || 0;
      
      // Determine appropriate league based on points
      let targetLeagueType = "bronze";
      if (totalPoints >= 150) { // 3+ trophies
        targetLeagueType = "gold";
      } else if (totalPoints >= 100) { // 2+ trophies
        targetLeagueType = "silver";
      }

      // Check if user is already in the correct league
      const existingGroup = await leagueRepo.getActiveGroupForUser(userId, targetLeagueType as any);
      if (existingGroup) {
        return NextResponse.json({ success: true, message: "Already in correct league" });
      }

      // Find league
      const league = await leagueRepo.getLeagueByType(targetLeagueType as any);
      if (!league) {
        return NextResponse.json({ error: "League not found" }, { status: 404 });
      }

      // Find or create a group
      const seasonLeague = currentSeason.leagues.find(l => l.leagueType === targetLeagueType);
      if (!seasonLeague) {
        return NextResponse.json({ error: "League not in current season" }, { status: 404 });
      }

      // Try to add user to existing group
      let added = false;
      for (const groupId of seasonLeague.groups) {
        const group = await leagueRepo.getGroupLeaderboard(groupId.toString());
        if (group && group.users.length < group.maxUsers) {
          added = await leagueRepo.addUserToGroup(userId, groupId.toString(), targetLeagueType as any);
          if (added) break;
        }
      }

      if (!added) {
        // Create new group
        const newGroup = {
          leagueId: new ObjectId(league._id),
          groupNumber: seasonLeague.groups.length + 1,
          seasonId: currentSeason.seasonId,
          startDate: new Date(),
          endDate: currentSeason.endDate,
          status: "active" as const,
          maxUsers: 10,
          users: [{
            userId,
            points: totalPoints,
            position: 1,
            status: "safe" as const,
            joinedAt: new Date(),
          }],
        };
        
        const groupId = await leagueRepo.createLeagueGroup(newGroup);
        
        // Create or update user league points record
        if (userPoints) {
          await leagueRepo.updateUserLeaguePoints(userId, currentSeason.seasonId, {
            leagueId: new ObjectId(league._id),
            groupId: new ObjectId(groupId),
          });
        } else {
          await leagueRepo.createUserLeaguePoints({
            userId,
            leagueId: new ObjectId(league._id),
            groupId: new ObjectId(groupId),
            seasonId: currentSeason.seasonId,
            totalPoints,
            pointsBreakdown: {
              mockExams: 0,
              practiceSessions: 0,
              aiFeedback: 0,
              skillsTried: 0,
              timeSpent: 0,
            },
            tasksCompleted: [],
          });
        }
      }

      return NextResponse.json({ success: true, leagueType: targetLeagueType });

    } else if (action === "add_points") {
      // Get current season
      const currentSeason = await leagueRepo.getCurrentSeason();
      if (!currentSeason) {
        return NextResponse.json({ error: "No active season" }, { status: 404 });
      }

      // Add points to user
      const success = await leagueRepo.addPointsToUser(
        userId,
        currentSeason.seasonId,
        pointsType,
        points
      );

      if (!success) {
        return NextResponse.json({ error: "Failed to add points" }, { status: 400 });
      }

      // Update group leaderboard
      const userPoints = await leagueRepo.getUserLeaguePoints(userId, currentSeason.seasonId);
      if (userPoints) {
        await leagueRepo.updateUserPointsInGroup(
          userId,
          userPoints.groupId.toString(),
          userPoints.totalPoints
        );
      }

      return NextResponse.json({ success: true });

    } else if (action === "complete_task") {
      // Get current season
      const currentSeason = await leagueRepo.getCurrentSeason();
      if (!currentSeason) {
        return NextResponse.json({ error: "No active season" }, { status: 404 });
      }

      // Get user points
      const userPoints = await leagueRepo.getUserLeaguePoints(userId, currentSeason.seasonId);
      if (!userPoints) {
        return NextResponse.json({ error: "User not in league" }, { status: 400 });
      }

      // Find task in league requirements
      const league = await leagueRepo.getLeagueByType(leagueType);
      if (!league) {
        return NextResponse.json({ error: "League not found" }, { status: 404 });
      }

      const task = league.requirements.tasks.find(t => t.id === body.taskId);
      if (!task) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }

      // Check if task already completed
      if (userPoints.tasksCompleted.includes(task.id)) {
        return NextResponse.json({ error: "Task already completed" }, { status: 400 });
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
