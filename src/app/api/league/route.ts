import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { LeagueRepository } from "@/repositories/league.repo";
import { auth } from "@clerk/nextjs/server";
import { ObjectId } from "mongodb";
import { TUserLeaguePoints } from "@/models/league.model";

export async function GET(request: NextRequest) {
  try {
    console.log("League API GET request received");
    
    let userId;
    try {
      const authResult = await auth();
      userId = authResult.userId;
      console.log("Auth result:", { userId: userId ? "present" : "missing" });
    } catch (authError) {
      console.error("Auth error:", authError);
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
    }
    
    if (!userId) {
      console.error("No userId found in auth");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();
    const leagueRepo = new LeagueRepository(db);

    // Initialize default leagues if they don't exist
    await leagueRepo.initializeDefaultLeagues();
    
    // Clean up any duplicate users in groups
    await leagueRepo.cleanupDuplicateUsers();

    // Get current season or create one
    let currentSeason = await leagueRepo.getCurrentSeason();
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

    // Get user's league points
    let userPoints = await leagueRepo.getUserLeaguePoints(
      userId,
      currentSeason!.seasonId
    );

    // Get all leagues
    const leagues = await leagueRepo.getAllLeagues();

    // Auto-assign user to appropriate league if not already assigned
    if (!userPoints) {
      const overallPoints = await leagueRepo.getUserOverallPoints(userId);
      
      // Only assign users to leagues if they have points
      if (overallPoints > 0) {
        let targetLeagueType = "bronze";
        if (overallPoints >= 150) {
          // 3+ trophies
          targetLeagueType = "gold";
        } else if (overallPoints >= 100) {
          // 2+ trophies
          targetLeagueType = "silver";
        }

        // Use the improved auto-assignment method
        const autoAssignResult = await leagueRepo.autoAssignUserToLeague(userId);
        if (autoAssignResult) {
          // Refresh user points after assignment
          userPoints = await leagueRepo.getUserLeaguePoints(
            userId,
            currentSeason!.seasonId
          );
        }
      }
    }

    // Determine user's current league
    let currentLeague = null;
    let userGroup = null;

    if (userPoints) {
      // Find user's active group
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

    return NextResponse.json({
      currentSeason,
      leagues,
      userPoints,
      currentLeague,
      userGroup,
    });
  } catch (error) {
    console.error("Error fetching league data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
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
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
    }
    
    if (!userId) {
      console.error("No userId found in auth");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    
    const { action, leagueType, points, pointsType } = body;
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
      console.log("Adding points:", { userId, points, pointsType });
      
      // Validate required parameters
      if (points === undefined || points === null) {
        console.error("Points is undefined or null");
        return NextResponse.json(
          { error: "Points is required" },
          { status: 400 }
        );
      }
      
      if (typeof points !== 'number' || points <= 0) {
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
              hasLeagueRecord: !!userPoints,
              overallPoints,
              seasonId: currentSeason.seasonId
            }
          },
          { status: 400 }
        );
      }

      // Update group leaderboard with season points
      const userPoints = await leagueRepo.getUserLeaguePoints(
        userId,
        currentSeason.seasonId
      );
      if (userPoints) {
        await leagueRepo.updateUserPointsInGroup(
          userId,
          userPoints.groupId.toString(),
          userPoints.totalPoints // This is season points
        );
      }

      // Check if user should be promoted to higher league based on overall points
      const overallPoints = await leagueRepo.getUserOverallPoints(userId);
      let targetLeagueType = "bronze";
      if (overallPoints >= 150) {
        // 3+ trophies
        targetLeagueType = "gold";
      } else if (overallPoints >= 100) {
        // 2+ trophies
        targetLeagueType = "silver";
      }

      // Auto-promote if needed
      const userCurrentLeague = await leagueRepo.getActiveGroupForUser(
        userId,
        targetLeagueType as any
      );
      if (!userCurrentLeague) {
        await leagueRepo.promoteUserToLeague(
          userId,
          targetLeagueType as any,
          currentSeason.seasonId
        );
      }

      return NextResponse.json({ success: true });
    } else if (action === "complete_task") {
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
      const league = await leagueRepo.getLeagueByType(leagueType);
      if (!league) {
        return NextResponse.json(
          { error: "League not found" },
          { status: 404 }
        );
      }

      const task = league.requirements.tasks.find((t) => t.id === body.taskId);
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
