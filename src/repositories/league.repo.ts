import { Db, ObjectId } from "mongodb";
import {
  TLeague,
  TLeagueGroup,
  TUserLeaguePoints,
  TLeagueSeason,
  TLeagueType,
  TGroupStatus,
  TUserLeagueStatus,
} from "../models/league.model";

export class LeagueRepository {
  private db: Db;
  private leaguesCollection = "leagues";
  private leagueGroupsCollection = "league_groups";
  private userLeaguePointsCollection = "user_league_points";
  private leagueSeasonsCollection = "league_seasons";
  private leagueGroupCountersCollection = "league_group_counters";

  constructor(db: Db) {
    this.db = db;
  }

  // Atomic group numbering to avoid duplicates under concurrency
  private async getNextGroupNumber(
    seasonId: string,
    leagueType: TLeagueType
  ): Promise<number> {
    const result = await this.db
      .collection(this.leagueGroupCountersCollection)
      .findOneAndUpdate(
        { seasonId, leagueType },
        {
          $inc: { seq: 1 },
          $setOnInsert: { seasonId, leagueType, createdAt: new Date() },
          $set: { updatedAt: new Date() },
        },
        { upsert: true, returnDocument: "after" as any }
      );
    const doc: any = (result && (result as any).value) ? (result as any).value : null;
    const seq = doc && typeof doc.seq === "number" ? doc.seq : 1;
    return seq;
  }

  private async ensureGroupCounterAtLeast(
    seasonId: string,
    leagueType: TLeagueType,
    minValue: number
  ): Promise<void> {
    await this.db
      .collection(this.leagueGroupCountersCollection)
      .updateOne(
        { seasonId, leagueType },
        {
          $max: { seq: minValue },
          $setOnInsert: { seasonId, leagueType, createdAt: new Date() },
          $set: { updatedAt: new Date() },
        } as any,
        { upsert: true }
      );
  }

  // League Management
  async createLeague(
    league: Omit<TLeague, "_id" | "createdAt" | "updatedAt">
  ): Promise<string> {
    const result = await this.db.collection(this.leaguesCollection).insertOne({
      ...league,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return result.insertedId.toString();
  }

  async getLeagueByType(type: TLeagueType): Promise<TLeague | null> {
    const league = await this.db
      .collection(this.leaguesCollection)
      .findOne({ type, isActive: true });
    return league as TLeague | null;
  }

  async getAllLeagues(): Promise<TLeague[]> {
    const leagues = await this.db
      .collection(this.leaguesCollection)
      .find({ isActive: true })
      .toArray();
    return leagues as TLeague[];
  }

  // League Groups Management
  async createLeagueGroup(
    group: Omit<TLeagueGroup, "_id" | "createdAt" | "updatedAt">
  ): Promise<string> {
    const result = await this.db
      .collection(this.leagueGroupsCollection)
      .insertOne({
        ...group,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    return result.insertedId.toString();
  }

  async getActiveGroupForUser(
    userId: string,
    leagueType: TLeagueType
  ): Promise<TLeagueGroup | null> {
    const currentSeason = await this.getCurrentSeason();
    if (!currentSeason) return null;

    // Find the league
    const seasonLeague = currentSeason.leagues.find(
      (l) => l.leagueType === leagueType
    );
    if (!seasonLeague) return null;

    // Check all groups in this league
    for (const groupId of seasonLeague.groups) {
      const group = await this.db
        .collection(this.leagueGroupsCollection)
        .findOne({
          _id: new ObjectId(groupId),
          seasonId: currentSeason.seasonId,
          status: "active",
          "users.userId": userId,
        });

      if (group) {
        console.log("Found existing group for user:", groupId);
        return group as TLeagueGroup;
      }
    }

    return null;
  }

  async addUserToGroup(
    userId: string,
    groupId: string,
    leagueType: TLeagueType
  ): Promise<boolean> {
    try {
      console.log("addUserToGroup called:", { userId, groupId, leagueType });

      const group = await this.db
        .collection(this.leagueGroupsCollection)
        .findOne({ _id: new ObjectId(groupId) });
      if (!group) {
        console.log("Group not found:", groupId);
        return false;
      }

      console.log("Group found:", groupId, "with users:", group.users.length);

      // Check if user is already in the group
      if (group.users.some((u: any) => u.userId === userId)) {
        console.log("User already in group");
        return false; // User already in group
      }

      // Check if group is full
      if (group.users.length >= group.maxUsers) {
        console.log("Group is full");
        return false;
      }

      // Get user's current points
      const userPoints = await this.getUserOverallPoints(userId);
      console.log("User points for group assignment:", userPoints);

      // Add user to group
      console.log("Adding user to group...");
      const result = await this.db
        .collection(this.leagueGroupsCollection)
        .updateOne(
          { _id: new ObjectId(groupId) },
          {
            $push: {
              users: {
                userId,
                points: userPoints, // Use actual user points instead of 0
                position: group.users.length + 1,
                status: "safe" as const,
                joinedAt: new Date(),
              },
            } as any,
          }
        );

      console.log("Add user to group result:", { modifiedCount: result.modifiedCount });

      if (result.modifiedCount > 0) {
        // Ensure user has a linked user_league_points record with league and group
        const existingUserPoints = await this.db
          .collection(this.userLeaguePointsCollection)
          .findOne({
            userId,
            seasonId: group.seasonId,
          });

        if (!existingUserPoints) {
          const overallPoints = await this.getUserOverallPoints(userId);
          await this.createUserLeaguePoints({
            userId,
            leagueId: group.leagueId,
            groupId: new ObjectId(groupId),
            seasonId: group.seasonId,
            totalPoints: 0,
            overallPoints: overallPoints,
            pointsBreakdown: {
              mockExams: 0,
              practiceSessions: 0,
              aiFeedback: 0,
              skillsTried: 0,
              timeSpent: 0,
            },
            tasksCompleted: [],
            lastActivityAt: new Date(),
          });
        } else {
          // Update existing record to reflect latest league and group assignment
          await this.db
            .collection(this.userLeaguePointsCollection)
            .updateOne(
              { userId, seasonId: group.seasonId },
              {
                $set: {
                  leagueId: group.leagueId,
                  groupId: new ObjectId(groupId),
                  updatedAt: new Date(),
                },
              }
            );
        }
      }

      return result.modifiedCount > 0;
    } catch (error) {
      console.error("Error adding user to group:", error);
      return false;
    }
  }

  async updateUserPointsInGroup(
    userId: string,
    groupId: string,
    points: number
  ): Promise<boolean> {
    console.log("updateUserPointsInGroup called:", { userId, groupId, points });

    // First check if user is already in the group
    const group = await this.db
      .collection(this.leagueGroupsCollection)
      .findOne({ _id: new ObjectId(groupId) });

    if (!group) {
      console.log("Group not found:", groupId);
      return false;
    }

    const userInGroup = group.users.some((u: any) => u.userId === userId);
    console.log("User in group:", userInGroup);

    if (userInGroup) {
      // Update existing user's points
      console.log("Updating existing user's points...");
      const result = await this.db
        .collection(this.leagueGroupsCollection)
        .updateOne(
          {
            _id: new ObjectId(groupId),
            "users.userId": userId,
          },
          {
            $set: {
              "users.$.points": points,
              "users.$.lastActivityAt": new Date(),
            },
          }
        );
      console.log("Update result:", { modifiedCount: result.modifiedCount });

      if (result.modifiedCount > 0) {
        // Ensure user's user_league_points is linked to this group/league
        await this.db
          .collection(this.userLeaguePointsCollection)
          .updateOne(
            { userId, seasonId: group.seasonId },
            {
              $set: {
                leagueId: group.leagueId,
                groupId: group._id,
                updatedAt: new Date(),
                lastActivityAt: new Date(),
              },
              $setOnInsert: {
                totalPoints: 0,
                overallPoints: await this.getUserOverallPoints(userId),
                pointsBreakdown: {
                  mockExams: 0,
                  practiceSessions: 0,
                  aiFeedback: 0,
                  skillsTried: 0,
                  timeSpent: 0,
                },
                tasksCompleted: [],
                createdAt: new Date(),
              },
            } as any,
            { upsert: true }
          );
      }

      return result.modifiedCount > 0;
    } else {
      // Add user to group if not already there
      console.log("Adding user to group...");
      const result = await this.db
        .collection(this.leagueGroupsCollection)
        .updateOne(
          { _id: new ObjectId(groupId) },
          {
            $push: {
              users: {
                userId,
                points,
                position: group.users.length + 1,
                lastActivityAt: new Date(),
              },
            },
          } as any
        );
      console.log("Add user result:", { modifiedCount: result.modifiedCount });
      if (result.modifiedCount > 0) {
        // Create or link user_league_points for this user/group
        await this.db
          .collection(this.userLeaguePointsCollection)
          .updateOne(
            { userId, seasonId: group.seasonId },
            {
              $set: {
                leagueId: group.leagueId,
                groupId: group._id,
                updatedAt: new Date(),
                lastActivityAt: new Date(),
              },
              $setOnInsert: {
                totalPoints: 0,
                overallPoints: await this.getUserOverallPoints(userId),
                pointsBreakdown: {
                  mockExams: 0,
                  practiceSessions: 0,
                  aiFeedback: 0,
                  skillsTried: 0,
                  timeSpent: 0,
                },
                tasksCompleted: [],
                createdAt: new Date(),
              },
            } as any,
            { upsert: true }
          );
      }

      return result.modifiedCount > 0;
    }
  }

  async getGroupLeaderboard(groupId: string): Promise<TLeagueGroup | null> {
    const group = await this.db
      .collection(this.leagueGroupsCollection)
      .findOne({ _id: new ObjectId(groupId) });
    if (!group) {
      console.log("Group not found:", groupId);
      return null;
    }

    console.log("Group found:", groupId, "with users:", group.users.length);

    // Get current season to fetch real user points
    const currentSeason = await this.getCurrentSeason();
    if (!currentSeason) return group as TLeagueGroup;

    console.log("Getting group leaderboard for group:", groupId);
    console.log("Current season:", currentSeason.seasonId);

    // OPTIMIZATION: Batch fetch user points instead of N+1 queries
    const userIds = group.users.map((u: any) => u.userId);
    const allUserPoints = await this.db
      .collection(this.userLeaguePointsCollection)
      .find({
        userId: { $in: userIds },
        seasonId: currentSeason.seasonId,
      })
      .toArray();

    // Create a map for faster lookup
    const userPointsMap = new Map();
    allUserPoints.forEach((p: any) => {
      userPointsMap.set(p.userId, p);
    });

    console.log(`Fetched points for ${allUserPoints.length} users in batch`);

    // Update user points from UserLeaguePoints collection and fetch user names
    const updatedUsers = [];

    // OPTIMIZATION: Batch fetch user details from local DB to avoid N+1 Clerk calls
    const userDetailsMap = new Map();
    try {
      const usersCollection = this.db.collection("users");
      const localUsers = await usersCollection
        .find({ clerkUserId: { $in: userIds } })
        .toArray();

      localUsers.forEach((u: any) => {
        userDetailsMap.set(u.clerkUserId, u);
      });
      console.log(`Fetched details for ${localUsers.length} users from local DB`);
    } catch (error) {
      console.error("Error fetching local user details:", error);
    }

    for (const user of group.users) {
      // console.log("Checking user:", user.userId);
      const userPoints = userPointsMap.get(user.userId);

      // console.log("User points found:", userPoints ? "yes" : "no");

      if (userPoints) {
        // Update user points in group
        user.points = userPoints.totalPoints;
        user.lastActivityAt = userPoints.lastActivityAt;
        // console.log("Updated user points:", user.userId, "totalPoints:", userPoints.totalPoints);
      } else {
        // console.log("No user points found for:", user.userId);
        // Keep user in group even if no points found
        user.points = user.points || 0;
      }

      // Fetch user name from local DB first, fallback to Clerk if missing
      const localUser = userDetailsMap.get(user.userId);

      if (localUser) {
        user.name = localUser.firstName && localUser.lastName
          ? `${localUser.firstName} ${localUser.lastName}`.trim()
          : localUser.firstName || localUser.email?.split('@')[0] || 'User';
        user.email = localUser.email;
        user.avatar = localUser.imageUrl;
      } else {
        // Fallback to Clerk only if not found locally (should be rare)
        try {
          const { clerkClient } = await import("@clerk/nextjs/server");
          const client = await clerkClient();
          const clerkUser = await client.users.getUser(user.userId);
          user.name = clerkUser.firstName && clerkUser.lastName
            ? `${clerkUser.firstName} ${clerkUser.lastName}`.trim()
            : clerkUser.firstName || clerkUser.emailAddresses[0]?.emailAddress?.split('@')[0] || 'User';
          user.email = clerkUser.emailAddresses[0]?.emailAddress;
          user.avatar = clerkUser.imageUrl;
        } catch (error: any) {
          if (error.status === 404) {
            console.log(`User ${user.userId} not found in Clerk, using fallback.`);
          } else {
            console.log("Error fetching user name for:", user.userId, error);
          }
          user.name = user.userId.slice(-8); // Fallback to last 8 chars of userId
          user.email = null;
        }
      }

      updatedUsers.push(user);
    }

    // Sort users by points (descending)
    updatedUsers.sort((a: any, b: any) => b.points - a.points);

    // Update positions
    updatedUsers.forEach((user: any, index: number) => {
      user.position = index + 1;
    });

    console.log("Final updated users:", updatedUsers);

    // Update positions in database
    await this.db
      .collection(this.leagueGroupsCollection)
      .updateOne(
        { _id: new ObjectId(groupId) },
        { $set: { users: updatedUsers } }
      );

    group.users = updatedUsers;
    return group as TLeagueGroup;
  }

  // User League Points Management
  async createUserLeaguePoints(
    points: Omit<TUserLeaguePoints, "_id" | "createdAt" | "updatedAt">
  ): Promise<string> {
    const result = await this.db
      .collection(this.userLeaguePointsCollection)
      .insertOne({
        ...points,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    return result.insertedId.toString();
  }

  async getUserLeaguePoints(
    userId: string,
    seasonId: string
  ): Promise<TUserLeaguePoints | null> {
    const points = await this.db
      .collection(this.userLeaguePointsCollection)
      .findOne({
        userId,
        seasonId,
      });
    return points as TUserLeaguePoints | null;
  }

  async updateUserLeaguePoints(
    userId: string,
    seasonId: string,
    pointsUpdate: Partial<TUserLeaguePoints>
  ): Promise<boolean> {
    const result = await this.db
      .collection(this.userLeaguePointsCollection)
      .updateOne(
        { userId, seasonId },
        {
          $set: {
            ...pointsUpdate,
            updatedAt: new Date(),
          },
        }
      );
    return result.modifiedCount > 0;
  }

  async addPointsToUser(
    userId: string,
    seasonId: string,
    pointsType: keyof TUserLeaguePoints["pointsBreakdown"],
    points: number
  ): Promise<boolean> {
    try {
      console.log("addPointsToUser called with:", { userId, seasonId, pointsType, points });

      // Check if user has a league record for this season
      const existingRecord = await this.db
        .collection(this.userLeaguePointsCollection)
        .findOne({
          userId,
          seasonId,
        });

      console.log("Existing record found:", !!existingRecord);

      if (!existingRecord) {
        console.log("No existing user points record yet; will handle league assignment after points update.");
      }

      // Ensure base document exists before increment
      if (!existingRecord) {
        console.log("Creating base user_league_points document before increment...");
        await this.createUserLeaguePoints({
          userId,
          leagueId: new ObjectId(), // placeholder, will be updated on assignment
          groupId: new ObjectId(), // placeholder, will be updated on assignment
          seasonId,
          totalPoints: 0,
          overallPoints: 0,
          pointsBreakdown: {
            mockExams: 0,
            practiceSessions: 0,
            aiFeedback: 0,
            skillsTried: 0,
            timeSpent: 0,
          },
          tasksCompleted: [],
          lastActivityAt: new Date(),
        });
      }

      // Now add points
      console.log("Updating points in database...");
      const result = await this.db
        .collection(this.userLeaguePointsCollection)
        .updateOne(
          { userId, seasonId },
          {
            $inc: {
              totalPoints: points, // Season points
              overallPoints: points, // Overall points (never reset)
              [`pointsBreakdown.${pointsType}`]: points,
            },
            $set: {
              lastActivityAt: new Date(),
              updatedAt: new Date(),
            },
          }
        );

      const upsertedId = (result as any).upsertedId;
      console.log("Database update result:", { modifiedCount: result.modifiedCount, upsertedId });

      if (result.modifiedCount > 0 || upsertedId) {
        console.log("Points updated successfully, checking if user needs league assignment...");

        // Check if user is already in a group
        const userRecord = await this.db
          .collection(this.userLeaguePointsCollection)
          .findOne({ userId, seasonId });

        // Validate that the stored groupId actually exists
        let groupIsValid = false;
        if (userRecord && (userRecord as any).groupId) {
          const existingGroup = await this.db
            .collection(this.leagueGroupsCollection)
            .findOne({ _id: typeof (userRecord as any).groupId === 'string' ? new ObjectId((userRecord as any).groupId) : (userRecord as any).groupId });
          groupIsValid = !!existingGroup;
        }

        if (userRecord && (userRecord as any).groupId && groupIsValid) {
          console.log("User already in group, updating group leaderboard...");
          const updateResult = await this.updateUserPointsInGroup(
            userId,
            (userRecord as any).groupId.toString(),
            (userRecord as any).totalPoints
          );
          console.log("Group leaderboard update result:", updateResult);
        } else {
          console.log("User not in any group, using auto-assign logic...");
          const assigned = await this.autoAssignUserToLeague(userId);
          console.log("Auto-assign after points result:", assigned);

          if (assigned) {
            // Refresh record and update leaderboard
            const refreshed = await this.db
              .collection(this.userLeaguePointsCollection)
              .findOne({ userId, seasonId });
            if (refreshed && (refreshed as any).groupId) {
              await this.updateUserPointsInGroup(
                userId,
                (refreshed as any).groupId.toString(),
                (refreshed as any).totalPoints || 0
              );
            }
          }
        }
      } else {
        console.log("No documents were modified (possible upsert without modification)");
      }

      const successUpdate = result.acknowledged === true;
      return !!successUpdate;
    } catch (error) {
      console.error("Error adding points to user:", error);
      return false;
    }
  }

  // Get user's overall points across all seasons
  async getUserOverallPoints(userId: string): Promise<number> {
    // First try to get from current season
    const currentSeason = await this.getCurrentSeason();
    if (currentSeason) {
      const currentSeasonPoints = await this.db
        .collection(this.userLeaguePointsCollection)
        .findOne({
          userId,
          seasonId: currentSeason.seasonId
        });

      if (currentSeasonPoints) {
        const overallPoints = currentSeasonPoints.overallPoints || 0;
        console.log("getUserOverallPoints from current season:", overallPoints);
        return overallPoints;
      }
    }

    // Fallback to aggregation across all seasons
    const result = await this.db
      .collection(this.userLeaguePointsCollection)
      .aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: null,
            totalOverallPoints: { $sum: { $ifNull: ["$overallPoints", 0] } }
          },
        },
      ])
      .toArray();

    console.log("getUserOverallPoints result:", result);
    return result.length > 0 ? result[0].totalOverallPoints : 0;
  }

  // Get user's current league type
  async getUserCurrentLeague(userId: string): Promise<{ type: string; groupId: string } | null> {
    try {
      const currentSeason = await this.getCurrentSeason();
      if (!currentSeason) return null;

      // First check user_league_points to see their assigned league
      const userPoints = await this.db
        .collection(this.userLeaguePointsCollection)
        .findOne({
          userId,
          seasonId: currentSeason.seasonId
        });

      if (userPoints && (userPoints as any).leagueId) {
        // Get league type from leagueId
        const league = await this.db
          .collection(this.leaguesCollection)
          .findOne({ _id: (userPoints as any).leagueId });

        if (league) {
          return {
            type: league.type,
            groupId: (userPoints as any).groupId?.toString() || null
          };
        }
      }

      // Fallback: Check all leagues to find where user is currently assigned in groups
      for (const seasonLeague of currentSeason.leagues) {
        for (const groupId of seasonLeague.groups) {
          const group = await this.db
            .collection(this.leagueGroupsCollection)
            .findOne({ _id: groupId });

          if (group && group.users.some((u: any) => u.userId === userId)) {
            return {
              type: seasonLeague.leagueType,
              groupId: groupId.toString()
            };
          }
        }
      }

      return null;
    } catch (error) {
      console.error("Error getting user current league:", error);
      return null;
    }
  }

  // Remove user from all leagues (demotion to no league)
  async removeUserFromLeague(userId: string): Promise<boolean> {
    try {
      const currentSeason = await this.getCurrentSeason();
      if (!currentSeason) return false;

      // Remove user from all groups in current season
      for (const seasonLeague of currentSeason.leagues) {
        for (const groupId of seasonLeague.groups) {
          await this.db
            .collection(this.leagueGroupsCollection)
            .updateOne(
              { _id: groupId },
              { $pull: { users: { userId: userId } } } as any
            );
        }
      }

      // Remove user's league points record for current season
      await this.db
        .collection(this.userLeaguePointsCollection)
        .deleteOne({
          userId,
          seasonId: currentSeason.seasonId
        });

      console.log(`User ${userId} removed from all leagues`);
      return true;
    } catch (error) {
      console.error("Error removing user from league:", error);
      return false;
    }
  }

  // Check if user meets league requirements
  async checkUserMeetsLeagueRequirements(userId: string, league: any): Promise<boolean> {
    try {
      // Get user's league points to check requirements
      const userPoints = await this.db
        .collection(this.userLeaguePointsCollection)
        .findOne({ userId });

      if (!userPoints) {
        console.log("No user points found for requirement check");
        return false;
      }

      // For bronze league, only check if user has any points (bronze is entry level)
      if (league.type === "bronze") {
        return userPoints.overallPoints > 0;
      }

      // Check minimum trophies requirement for higher leagues
      const requiredTrophies = league.requirements?.minTrophies || 0;
      const userTrophies = Math.floor(userPoints.overallPoints / 50); // Assuming 50 points = 1 trophy

      if (userTrophies < requiredTrophies) {
        console.log(`User has ${userTrophies} trophies, needs ${requiredTrophies}`);
        return false;
      }

      // Check specific task requirements for higher leagues
      const requiredTasks = league.requirements?.tasks || [];
      const completedTasks = userPoints.tasksCompleted || [];

      for (const task of requiredTasks) {
        if (!completedTasks.includes(task.id)) {
          console.log(`User has not completed required task: ${task.id}`);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error("Error checking league requirements:", error);
      return false;
    }
  }

  // Check if user completed league tasks
  async checkUserCompletedLeagueTasks(userId: string, leagueType: string): Promise<boolean> {
    try {
      // Get current season to check tasks for current season only
      const currentSeason = await this.getCurrentSeason();
      if (!currentSeason) return false;

      const userPoints = await this.db
        .collection(this.userLeaguePointsCollection)
        .findOne({
          userId,
          seasonId: currentSeason.seasonId
        });

      if (!userPoints) return false;

      // Define tasks for each league (using task IDs that match the league requirements)
      const leagueTasks = {
        bronze: [
          "mock-exam",
          "skills-tried",
          "ai-feedback"
        ],
        silver: [
          "mock-exams-5",
          "clb-improvement",
          "writing-feedback-3",
          "speaking-feedback-3"
        ],
        gold: [
          "mock-exams-10",
          "clb-improvement-3-skills",
          "practice-consistency",
          "referral",
          "celpip-champion"
        ]
      };

      const requiredTasks = leagueTasks[leagueType as keyof typeof leagueTasks] || [];
      const completedTasks = userPoints.tasksCompleted || [];

      console.log(`Checking tasks for user ${userId} in ${leagueType} league:`, {
        requiredTasks,
        completedTasks,
        hasAllTasks: requiredTasks.every(task => completedTasks.includes(task))
      });

      // Check if all required tasks are completed
      const hasAllTasks = requiredTasks.every(task => completedTasks.includes(task));

      return hasAllTasks;
    } catch (error) {
      console.error("Error checking league tasks:", error);
      return false;
    }
  }

  // Get minimum points required for league progression
  getMinimumPointsForLeague(leagueType: string): number {
    const minimumPoints = {
      bronze: 50,   // Minimum points to progress from Bronze
      silver: 100,  // Minimum points to progress from Silver
      gold: 150     // Minimum points to stay in Gold
    };

    return minimumPoints[leagueType as keyof typeof minimumPoints] || 0;
  }

  // Reset all users to Bronze League (for new season)
  async resetAllUsersToBronzeLeague(): Promise<boolean> {
    try {
      console.log("Resetting all users to Bronze League...");

      const currentSeason = await this.getCurrentSeason();
      if (!currentSeason) {
        console.log("No current season found");
        return false;
      }

      // Get Bronze League
      const bronzeLeague = await this.getLeagueByType("bronze");
      if (!bronzeLeague) {
        console.log("Bronze League not found");
        return false;
      }

      // Get all users currently in Silver and Gold leagues
      const silverLeague = await this.getLeagueByType("silver");
      const goldLeague = await this.getLeagueByType("gold");

      const allUsersToMove = [];

      if (silverLeague) {
        const silverUsers = await this.db.collection(this.userLeaguePointsCollection).find({
          leagueId: silverLeague._id,
          seasonId: currentSeason.seasonId
        }).toArray();
        allUsersToMove.push(...silverUsers);
      }

      if (goldLeague) {
        const goldUsers = await this.db.collection(this.userLeaguePointsCollection).find({
          leagueId: goldLeague._id,
          seasonId: currentSeason.seasonId
        }).toArray();
        allUsersToMove.push(...goldUsers);
      }

      console.log(`Found ${allUsersToMove.length} users to move to Bronze League`);

      // Move all users to Bronze League
      for (const user of allUsersToMove) {
        // Remove from current group
        await this.db.collection(this.leagueGroupsCollection).updateOne(
          { _id: new ObjectId(user.groupId.toString()) },
          { $pull: { users: user.userId } }
        );

        // Add to Bronze League group
        const bronzeGroup = await this.getAvailableGroup(bronzeLeague._id.toString(), currentSeason.seasonId);
        if (bronzeGroup) {
          await this.db.collection(this.leagueGroupsCollection).updateOne(
            { _id: new ObjectId(bronzeGroup._id.toString()) },
            { $push: { users: user.userId } }
          );

          // Update user's league and group
          await this.db.collection(this.userLeaguePointsCollection).updateOne(
            { _id: user._id },
            {
              $set: {
                leagueId: bronzeLeague._id,
                groupId: bronzeGroup._id
              }
            }
          );
        }
      }

      console.log("Successfully moved all users to Bronze League");
      return true;
    } catch (error) {
      console.error("Error resetting users to Bronze League:", error);
      return false;
    }
  }

  // Auto assign user to appropriate league
  async autoAssignUserToLeague(userId: string): Promise<boolean> {
    try {
      console.log("autoAssignUserToLeague called for user:", userId);

      // Get current season
      const currentSeason = await this.getCurrentSeason();
      if (!currentSeason) {
        console.log("No current season found");
        return false;
      }

      // Check if user is already in any league group
      const currentLeague = await this.getUserCurrentLeague(userId);
      if (currentLeague && currentLeague.groupId && currentLeague.groupId !== null && currentLeague.groupId !== "" && currentLeague.groupId !== "null") {
        console.log("User already in league group:", currentLeague.groupId);
        return true;
      }

      // Get user's overall points to determine league
      const overallPoints = await this.getUserOverallPoints(userId);
      console.log("User overall points:", overallPoints);

      // Only assign users to leagues if they have points
      if (overallPoints === 0) {
        console.log("User has no points, not assigning to league");
        return false;
      }

      // ALL users start in Bronze League regardless of previous assignments
      // This is the fundamental rule - everyone starts from Bronze
      let targetLeagueType = "bronze";
      console.log("Assigning user to Bronze League (entry level for all users)");

      const targetLeague = await this.getLeagueByType(targetLeagueType as any);
      if (!targetLeague) {
        console.log("Target League not found:", targetLeagueType);
        return false;
      }

      const seasonLeague = currentSeason.leagues.find(
        (l) => l.leagueType === targetLeagueType
      );
      if (!seasonLeague) return false;

      // Try to add user to best available group
      let added = false;
      let groupId = null;

      const bestGroupId = await this.findBestGroupForUser(
        targetLeagueType as any
      );
      if (bestGroupId) {
        console.log("Found best group for user:", bestGroupId);
        added = await this.addUserToGroup(
          userId,
          bestGroupId,
          targetLeagueType as any
        );
        if (added) {
          groupId = bestGroupId;
          console.log("User successfully added to group:", groupId);
        } else {
          console.log("Failed to add user to group:", bestGroupId);
        }
      } else {
        console.log("No available group found, will create new group");
      }

      if (!added) {
        // Create new group
        const nextNumber = await this.getNextGroupNumber(
          currentSeason.seasonId,
          targetLeagueType as any
        );
        const newGroup = {
          leagueId: new ObjectId(targetLeague._id),
          groupNumber: nextNumber,
          seasonId: currentSeason.seasonId,
          startDate: new Date(),
          endDate: currentSeason.endDate,
          status: "active" as const,
          maxUsers: 10,
          users: [
            {
              userId,
              points: overallPoints, // Use actual user points instead of 0
              position: 1,
              status: "safe" as const,
              joinedAt: new Date(),
            },
          ],
        };

        groupId = await this.createLeagueGroup(newGroup);

        // Create user league points record for new group
        await this.createUserLeaguePoints({
          userId,
          leagueId: new ObjectId(targetLeague._id),
          groupId: new ObjectId(groupId!),
          seasonId: currentSeason.seasonId,
          totalPoints: 0,
          overallPoints: overallPoints,
          pointsBreakdown: {
            mockExams: 0,
            practiceSessions: 0,
            aiFeedback: 0,
            skillsTried: 0,
            timeSpent: 0,
          },
          tasksCompleted: [],
          lastActivityAt: new Date(),
        });

        // Update season league groups
        await this.db.collection(this.leagueSeasonsCollection).updateOne(
          { _id: new ObjectId(currentSeason._id) },
          {
            $push: {
              "leagues.$[league].groups": new ObjectId(groupId!),
            } as any,
          },
          { arrayFilters: [{ "league.leagueType": targetLeagueType }] }
        );
      }

      return true;
    } catch (error) {
      console.error("Error auto assigning user to league:", error);
      return false;
    }
  }

  // Get available group for a league
  async getAvailableGroup(leagueId: string, seasonId: string): Promise<TLeagueGroup | null> {
    try {
      const currentSeason = await this.getCurrentSeason();
      if (!currentSeason) return null;

      // Find the league by ID
      const league = await this.db.collection(this.leaguesCollection).findOne({ _id: new ObjectId(leagueId) });
      if (!league) return null;

      const seasonLeague = currentSeason.leagues.find(
        (l) => l.leagueType === league.type
      );
      if (!seasonLeague) return null;

      // Find groups that are not full
      for (const groupId of seasonLeague.groups) {
        const group = await this.getGroupLeaderboard(groupId.toString());
        if (group && group.users.length < group.maxUsers) {
          return group;
        }
      }

      return null;
    } catch (error) {
      console.error("Error getting available group:", error);
      return null;
    }
  }

  // Find best group for user (prefer groups with more users for better competition)
  async findBestGroupForUser(
    targetLeagueType: TLeagueType
  ): Promise<string | null> {
    try {
      const currentSeason = await this.getCurrentSeason();
      if (!currentSeason) return null;

      const seasonLeague = currentSeason.leagues.find(
        (l) => l.leagueType === targetLeagueType
      );
      if (!seasonLeague) return null;

      // Sort groups by user count (ascending) to prefer groups with more users
      const groupsWithCounts = await Promise.all(
        seasonLeague.groups.map(async (groupId) => {
          const group = await this.getGroupLeaderboard(groupId.toString());
          return {
            groupId: groupId.toString(),
            userCount: group?.users.length || 0,
            group,
          };
        })
      );

      // Find groups that are not full and have the most users
      const availableGroups = groupsWithCounts
        .filter((g) => g.group && g.userCount < g.group.maxUsers)
        .sort((a, b) => b.userCount - a.userCount); // Sort by user count descending

      return availableGroups.length > 0 ? availableGroups[0].groupId : null;
    } catch (error) {
      console.error("Error finding best group for user:", error);
      return null;
    }
  }


  // Promote user to a different league
  async promoteUserToLeague(
    userId: string,
    targetLeagueType: TLeagueType,
    seasonId: string
  ): Promise<boolean> {
    const targetLeague = await this.getLeagueByType(targetLeagueType);
    if (!targetLeague) return false;

    // Find or create group in target league
    const currentSeason = await this.getCurrentSeason();
    if (!currentSeason) return false;

    const seasonLeague = currentSeason.leagues.find(
      (l) => l.leagueType === targetLeagueType
    );
    if (!seasonLeague) return false;

    // Try to add user to existing group
    let added = false;
    for (const groupId of seasonLeague.groups) {
      const group = await this.getGroupLeaderboard(groupId.toString());
      if (group && group.users.length < group.maxUsers) {
        added = await this.addUserToGroup(
          userId,
          groupId.toString(),
          targetLeagueType
        );
        if (added) {
          // Link user's user_league_points to the new league/group
          await this.db.collection(this.userLeaguePointsCollection).updateOne(
            { userId, seasonId },
            {
              $set: {
                leagueId: new ObjectId(targetLeague._id),
                groupId: new ObjectId(groupId.toString()),
                updatedAt: new Date(),
              },
            }
          );
          break;
        }
      }
    }

    if (!added) {
      // Create new group
      const nextNumber = await this.getNextGroupNumber(
        currentSeason.seasonId,
        targetLeagueType
      );
      const newGroup = {
        leagueId: new ObjectId(targetLeague._id),
        groupNumber: nextNumber,
        seasonId: currentSeason.seasonId,
        startDate: new Date(),
        endDate: currentSeason.endDate,
        status: "active" as const,
        maxUsers: 10,
        users: [
          {
            userId,
            points: 0, // Season points start from 0
            position: 1,
            status: "safe" as const,
            joinedAt: new Date(),
          },
        ],
      };

      const groupId = await this.createLeagueGroup(newGroup);

      // Update user's league assignment, preserve existing season points
      await this.db.collection(this.userLeaguePointsCollection).updateOne(
        { userId, seasonId },
        {
          $set: {
            leagueId: new ObjectId(targetLeague._id),
            groupId: new ObjectId(groupId),
            updatedAt: new Date(),
          },
        }
      );
    }

    return true;
  }

  // League Seasons Management
  async createSeason(
    season: Omit<TLeagueSeason, "_id" | "createdAt" | "updatedAt">
  ): Promise<string> {
    const result = await this.db
      .collection(this.leagueSeasonsCollection)
      .insertOne({
        ...season,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    return result.insertedId.toString();
  }

  async getCurrentSeason(): Promise<TLeagueSeason | null> {
    const now = new Date();
    const season = await this.db
      .collection(this.leagueSeasonsCollection)
      .findOne({
        startDate: { $lte: now },
        endDate: { $gte: now },
        isActive: true,
      });
    return season as TLeagueSeason | null;
  }

  async endSeason(seasonId: string): Promise<boolean> {
    const result = await this.db
      .collection(this.leagueSeasonsCollection)
      .updateOne(
        { seasonId },
        {
          $set: {
            isActive: false,
            updatedAt: new Date(),
          },
        }
      );
    return result.modifiedCount > 0;
  }

  // League Progression Logic
  async processLeagueProgression(groupId: string): Promise<boolean> {
    const group = await this.getGroupLeaderboard(groupId);
    if (!group) return false;

    const totalUsers = group.users.length;
    const league = await this.getLeagueByType(
      group.leagueId.toString() as TLeagueType
    );
    if (!league) return false;

    // Minimum users required for meaningful progression
    const MIN_USERS_FOR_PROGRESSION = 5;

    if (totalUsers < MIN_USERS_FOR_PROGRESSION) {
      // Not enough users for progression - mark all as safe
      const updatedUsers = group.users.map((user: any) => ({
        ...user,
        status: "safe" as const,
      }));

      await this.db
        .collection(this.leagueGroupsCollection)
        .updateOne(
          { _id: new ObjectId(groupId) },
          { $set: { users: updatedUsers, status: "completed" } }
        );

      return true;
    }

    // Calculate promotion and demotion zones
    let promotionZone: number;
    let demotionZone: number;
    let safeZone: number;

    switch (league.type) {
      case "bronze":
        // Bronze: Entry level - can only promote up, no demotion
        promotionZone = Math.max(1, Math.ceil(totalUsers * 0.3)); // Top 30% promote to Silver
        demotionZone = 0; // No demotion from Bronze (lowest league)
        safeZone = totalUsers - promotionZone; // Remaining 70% stay in Bronze
        break;
      case "silver":
        // Silver: Middle tier - can promote to Gold or demote to Bronze
        promotionZone = Math.max(1, Math.ceil(totalUsers * 0.25)); // Top 25% promote to Gold
        demotionZone = Math.max(1, Math.floor(totalUsers * 0.3)); // Bottom 30% demote to Bronze
        safeZone = totalUsers - promotionZone - demotionZone; // Middle 45% stay in Silver
        break;
      case "gold":
        // Gold: Highest tier - no promotion, staying is winning!
        promotionZone = 0; // No promotion from Gold (highest league)
        demotionZone = Math.max(1, Math.floor(totalUsers * 0.4)); // Bottom 40% demote to Silver
        safeZone = totalUsers - demotionZone; // Top 60% stay in Gold (winners!)
        break;
    }

    // Update user statuses
    const updatedUsers = group.users.map((user: any, index: number) => {
      let status: TUserLeagueStatus = "safe";

      if (index < promotionZone && league.type !== "gold") {
        status = "promoted";
      } else if (
        index >= totalUsers - demotionZone &&
        league.type !== "bronze"
      ) {
        status = "demoted";
      }

      return { ...user, status };
    });

    // Update group with new statuses
    await this.db
      .collection(this.leagueGroupsCollection)
      .updateOne(
        { _id: new ObjectId(groupId) },
        { $set: { users: updatedUsers, status: "completed" } }
      );

    return true;
  }

  // Check if league has enough users for meaningful competition
  async hasEnoughUsersForCompetition(
    leagueType: TLeagueType
  ): Promise<boolean> {
    try {
      const currentSeason = await this.getCurrentSeason();
      if (!currentSeason) return false;

      const seasonLeague = currentSeason.leagues.find(
        (l) => l.leagueType === leagueType
      );
      if (!seasonLeague) return false;

      // Count total users across all groups in this league
      let totalUsers = 0;
      for (const groupId of seasonLeague.groups) {
        const group = await this.getGroupLeaderboard(groupId.toString());
        if (group) {
          totalUsers += group.users.length;
        }
      }

      return totalUsers >= 5; // Minimum 5 users for meaningful competition
    } catch (error) {
      console.error("Error checking if league has enough users:", error);
      return false;
    }
  }

  // Clean up duplicate users in groups
  async cleanupDuplicateUsers(): Promise<void> {
    try {
      const groups = await this.db
        .collection(this.leagueGroupsCollection)
        .find({})
        .toArray();

      for (const group of groups) {
        if (!group.users || !Array.isArray(group.users)) continue;

        // Create a map to track unique users
        const uniqueUsers = new Map();
        const cleanedUsers = [];

        for (const user of group.users) {
          if (!uniqueUsers.has(user.userId)) {
            uniqueUsers.set(user.userId, true);
            cleanedUsers.push(user);
          }
        }

        // Update the group if duplicates were found
        if (cleanedUsers.length !== group.users.length) {
          await this.db
            .collection(this.leagueGroupsCollection)
            .updateOne(
              { _id: group._id },
              { $set: { users: cleanedUsers } }
            );
          console.log(`Cleaned up ${group.users.length - cleanedUsers.length} duplicate users from group ${group._id}`);
        }
      }
    } catch (error) {
      console.error("Error cleaning up duplicate users:", error);
    }
  }

  // Initialize default leagues
  async initializeDefaultLeagues(): Promise<void> {
    const existingLeagues = await this.db
      .collection(this.leaguesCollection)
      .countDocuments();
    if (existingLeagues > 0) return;

    const defaultLeagues = [
      {
        name: "Bronze League",
        type: "bronze" as TLeagueType,
        description: "Entry level league for new players",
        requirements: {
          minTrophies: 1,
          tasks: [
            {
              id: "mock-exam",
              title: "1 Mock Exam Completed",
              points: 50,
              description: "Complete a full mock exam",
            },
            {
              id: "skills-tried",
              title: "4 Skills Tried (L, R, W, S)",
              points: 30,
              description: "Practice all four CELPIP skills",
            },
            {
              id: "ai-feedback",
              title: "1 Writing or Speaking with AI Feedback",
              points: 40,
              description: "Get AI feedback on writing or speaking",
            },
          ],
        },
        rewards: {
          promotionPoints: 30,
          demotionPoints: 20,
        },
        isActive: true,
      },
      {
        name: "Silver League",
        type: "silver" as TLeagueType,
        description: "Intermediate league for experienced players",
        requirements: {
          minTrophies: 2,
          tasks: [
            {
              id: "mock-exams-5",
              title: "5 Mock Exams Completed",
              points: 100,
              description: "Complete 5 mock exams",
            },
            {
              id: "clb-improvement",
              title: "+1 CLB Improvement (any skill)",
              points: 80,
              description: "Improve CLB score in any skill",
            },
            {
              id: "writing-feedback-3",
              title: "3 Writing with Feedback",
              points: 60,
              description: "Complete 3 writing tasks with AI feedback",
            },
            {
              id: "speaking-feedback-3",
              title: "3 Speaking with Feedback",
              points: 60,
              description: "Complete 3 speaking tasks with AI feedback",
            },
          ],
        },
        rewards: {
          promotionPoints: 25,
          demotionPoints: 30,
        },
        isActive: true,
      },
      {
        name: "Gold League",
        type: "gold" as TLeagueType,
        description: "Elite league with gift card rewards",
        requirements: {
          minTrophies: 3,
          tasks: [
            {
              id: "mock-exams-10",
              title: "10 Mock Exams Completed",
              points: 200,
              description: "Complete 10 mock exams",
            },
            {
              id: "clb-improvement-3-skills",
              title: "+1 CLB in 3 Skills",
              points: 150,
              description: "Improve CLB score in 3 different skills",
            },
            {
              id: "practice-consistency",
              title: "Practice 3x/Week (4 Weeks)",
              points: 150,
              description: "Maintain consistent practice schedule",
            },
            {
              id: "referral",
              title: "1 Friend Referred (paid plan)",
              points: 100,
              description: "Refer a friend who purchases a plan",
            },
            {
              id: "celpip-champion",
              title: "CELPIP Champion",
              points: 500,
              description: "Complete all champion requirements",
              subTasks: [
                { id: "champion-mocks", title: "10 mocks", points: 100 },
                { id: "champion-clb", title: "+2 CLB in 1 skill", points: 100 },
                { id: "champion-writing", title: "5 Writing", points: 100 },
                {
                  id: "champion-speaking",
                  title: "+5 Speaking improved",
                  points: 100,
                },
                {
                  id: "champion-skills",
                  title: "all skills practiced",
                  points: 50,
                },
                { id: "champion-referral", title: "1 referral", points: 50 },
              ],
            },
          ],
        },
        rewards: {
          promotionPoints: 0,
          demotionPoints: 40,
          giftCardAmount: 100,
        },
        isActive: true,
      },
    ];

    for (const league of defaultLeagues) {
      await this.createLeague(league);
    }
  }

  // End current season and start new one
  async endCurrentSeason(): Promise<boolean> {
    try {
      const currentSeason = await this.getCurrentSeason();
      if (!currentSeason) {
        console.log("No current season found");
        return false;
      }

      console.log(`Ending season: ${currentSeason.seasonId}`);

      // Process league promotions/demotions and move users
      await this.processSeasonEnd(currentSeason);

      // Mark current season as ended
      await this.db.collection(this.leagueSeasonsCollection).updateOne(
        { seasonId: currentSeason.seasonId },
        {
          $set: {
            status: "ended",
            endDate: new Date(),
            updatedAt: new Date(),
          },
        }
      );

      // Create new season
      const newSeasonId = `season_${Date.now()}`;
      const newSeason = {
        seasonId: newSeasonId,
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        status: "active" as const,
        isActive: true,
        leagues: currentSeason.leagues.map((league) => ({
          ...league,
          groups: [], // Start with empty groups
        })),
      };

      console.log(`Creating new season: ${newSeasonId}`);
      await this.createSeason(newSeason);

      // Update all user_league_points records to use new season
      // Only update users who were processed in processSeasonEnd
      console.log(`Migrating users from season ${currentSeason.seasonId} to ${newSeasonId}`);
      const processedUsers = await this.db.collection(this.userLeaguePointsCollection)
        .find({ seasonId: currentSeason.seasonId })
        .toArray();

      console.log(`Found ${processedUsers.length} users to migrate`);

      for (const user of processedUsers) {
        try {
          await this.db.collection(this.userLeaguePointsCollection).updateOne(
            { _id: user._id },
            {
              $set: {
                seasonId: newSeasonId,
                totalPoints: 0, // Reset season points for new season
                groupId: null, // Reset group assignment for new season
                updatedAt: new Date(),
              },
            }
          );
        } catch (userError) {
          console.error(`Failed to migrate user ${user.userId}:`, userError);
        }
      }

      return true;
    } catch (error) {
      console.error("Error in endCurrentSeason:", error);
      return false;
    }
  }

  // Get raffle winners for a season
  async getRaffleWinners(seasonId: string): Promise<any> {
    const winners = await this.db
      .collection("league_raffle_winners")
      .findOne({ seasonId });
    return winners;
  }

  // Get detailed league information for admin panel
  async getDetailedLeagueInfo(seasonId: string): Promise<any> {
    console.log("Getting detailed league info for season:", seasonId);

    const season = await this.db
      .collection(this.leagueSeasonsCollection)
      .findOne({ seasonId });

    if (!season) {
      console.log("Season not found:", seasonId);
      return null;
    }

    console.log("Season found:", season);

    const detailedInfo = {
      seasonId,
      startDate: season.startDate,
      endDate: season.endDate,
      isActive: season.isActive,
      leagues: [] as any[],
    };

    for (const league of season.leagues) {
      console.log("Processing league:", league.leagueType);
      const leagueDetails = await this.getLeagueByType(league.leagueType);
      if (!leagueDetails) {
        console.log("League details not found for:", league.leagueType);
        continue;
      }

      const leagueInfo = {
        type: league.leagueType,
        name: leagueDetails.name,
        description: leagueDetails.description,
        groups: [] as any[],
        totalUsers: 0,
      };

      console.log("League groups:", league.groups);

      for (const groupId of league.groups) {
        console.log("Processing group:", groupId.toString());
        const group = await this.getGroupLeaderboard(groupId.toString());
        if (!group) {
          console.log("Group not found:", groupId.toString());
          continue;
        }

        console.log("Group found:", group.groupNumber, "with", group.users.length, "users");
        const sortedUsers = [...group.users].sort((a, b) => b.points - a.points);
        leagueInfo.totalUsers += sortedUsers.length;

        leagueInfo.groups.push({
          groupId: groupId.toString(),
          groupNumber: group.groupNumber,
          maxUsers: group.maxUsers,
          userCount: sortedUsers.length,
          users: sortedUsers.map((user, index) => ({
            userId: user.userId,
            name: user.name || user.userId.slice(-8),
            email: user.email,
            points: user.points,
            position: index + 1,
            joinedAt: user.joinedAt,
            status: user.status || "safe",
          })),
        });
      }

      detailedInfo.leagues.push(leagueInfo);
    }

    console.log("Final detailed info:", detailedInfo);
    return detailedInfo;
  }

  // Select 3 random winners from Gold League top performers
  async selectGoldLeagueWinners(seasonId: string): Promise<string[]> {
    const currentSeason = await this.getCurrentSeason();
    if (!currentSeason || currentSeason.seasonId !== seasonId) return [];

    const goldLeague = currentSeason.leagues.find(l => l.leagueType === "gold");
    if (!goldLeague) return [];

    // Collect all winners (top 60%) from all gold groups
    const allWinners: Array<{ userId: string; points: number; groupId: string }> = [];

    for (const groupId of goldLeague.groups) {
      const group = await this.getGroupLeaderboard(groupId.toString());
      if (!group) continue;

      const sortedUsers = [...group.users].sort((a, b) => b.points - a.points);
      const totalUsers = sortedUsers.length;
      const winnerCount = totalUsers - Math.ceil(totalUsers * 0.4); // Top 60%

      // Add top 60% to winners list
      for (let i = 0; i < winnerCount; i++) {
        allWinners.push({
          userId: sortedUsers[i].userId,
          points: sortedUsers[i].points,
          groupId: groupId.toString(),
        });
      }
    }

    // Randomly select 3 winners
    const selectedWinners: string[] = [];
    const winnersCopy = [...allWinners];

    for (let i = 0; i < 3 && winnersCopy.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * winnersCopy.length);
      selectedWinners.push(winnersCopy[randomIndex].userId);
      winnersCopy.splice(randomIndex, 1); // Remove selected winner to avoid duplicates
    }

    // Store winners in a collection for tracking
    if (selectedWinners.length > 0) {
      await this.db.collection("league_raffle_winners").insertOne({
        seasonId,
        winners: selectedWinners.map(userId => ({
          userId,
          selectedAt: new Date(),
        })),
        createdAt: new Date(),
      });
    }

    return selectedWinners;
  }

  // Process season end - promotions, demotions, reset points, and move users
  async processSeasonEnd(season: TLeagueSeason): Promise<void> {
    console.log(`Processing season end for: ${season.seasonId}`);

    // Step 1: Process each league and determine user statuses
    // Note: Raffle winners are selected manually by admin, not automatically
    const usersToMove: Array<{
      userId: string;
      currentLeague: TLeagueType;
      targetLeague: TLeagueType;
      status: "promoted" | "safe" | "demoted";
      isRaffleWinner: boolean;
    }> = [];

    for (const league of season.leagues) {
      const leagueDetails = await this.getLeagueByType(league.leagueType);
      if (!leagueDetails) continue;

      for (const groupId of league.groups) {
        const group = await this.getGroupLeaderboard(groupId.toString());
        if (!group) continue;

        // Sort users by season points
        const sortedUsers = [...group.users].sort((a, b) => b.points - a.points);
        const totalUsers = sortedUsers.length;

        // Calculate promotion/demotion zones based on league type
        let promotionCount: number;
        let demotionCount: number;

        switch (league.leagueType) {
          case "bronze":
            promotionCount = Math.ceil(totalUsers * 0.3); // Top 30% promote to Silver
            demotionCount = 0; // No demotion from Bronze
            break;
          case "silver":
            promotionCount = Math.ceil(totalUsers * 0.25); // Top 25% promote to Gold
            demotionCount = Math.ceil(totalUsers * 0.3); // Bottom 30% demote to Bronze
            break;
          case "gold":
            promotionCount = 0; // No promotion from Gold
            demotionCount = Math.ceil(totalUsers * 0.4); // Bottom 40% demote to Silver
            break;
        }

        for (let i = 0; i < totalUsers; i++) {
          const user = sortedUsers[i];
          let newStatus: "promoted" | "safe" | "demoted" = "safe";
          let targetLeague = league.leagueType;

          // Check if user completed league tasks and has minimum points
          const hasCompletedTasks = await this.checkUserCompletedLeagueTasks(user.userId, league.leagueType);
          const hasMinimumPoints = user.points >= this.getMinimumPointsForLeague(league.leagueType);

          // Determine status and target league
          if (i < promotionCount && league.leagueType !== "gold" && hasCompletedTasks && hasMinimumPoints) {
            // Promote only if tasks completed + minimum points
            newStatus = "promoted";
            targetLeague = league.leagueType === "bronze" ? "silver" : "gold";
          } else if (i >= totalUsers - demotionCount && league.leagueType !== "bronze") {
            // Demote if in demotion zone (regardless of tasks)
            newStatus = "demoted";
            targetLeague = league.leagueType === "gold" ? "silver" : "bronze";
          } else {
            // Stay in same league
            newStatus = "safe";
            targetLeague = league.leagueType;
          }

          // Update user status in current group
          await this.db
            .collection(this.leagueGroupsCollection)
            .updateOne(
              { _id: new ObjectId(groupId), "users.userId": user.userId },
              { $set: { "users.$.status": newStatus } }
            );

          // Track users to move to next season
          usersToMove.push({
            userId: user.userId,
            currentLeague: league.leagueType,
            targetLeague,
            status: newStatus,
            isRaffleWinner: false, // Admin will select raffle winners manually
          });

          // Update user status in user_league_points as well
          await this.db.collection(this.userLeaguePointsCollection).updateOne(
            { userId: user.userId, seasonId: season.seasonId },
            {
              $set: {
                status: newStatus, // Store the calculated status
                totalPoints: 0, // Reset season points
                updatedAt: new Date(),
              },
            }
          );
        }
      }
    }

    // Step 2: Move users to their new leagues for next season
    console.log(`Moving ${usersToMove.length} users to new leagues...`);

    for (const userMove of usersToMove) {
      console.log(`Processing user ${userMove.userId}: ${userMove.currentLeague} -> ${userMove.targetLeague} (${userMove.status})`);

      // Remove user from current league group (regardless of league change)
      await this.db.collection(this.leagueGroupsCollection).updateMany(
        { "users.userId": userMove.userId },
        { $pull: { users: { userId: userMove.userId } } } as any
      );

      // Update user's league assignment in user_league_points
      const targetLeague = await this.getLeagueByType(userMove.targetLeague);
      if (targetLeague) {
        await this.db.collection(this.userLeaguePointsCollection).updateOne(
          { userId: userMove.userId },
          {
            $set: {
              leagueId: targetLeague._id,
              groupId: null, // Will be assigned to group when they earn points
              updatedAt: new Date(),
              lastSeasonResult: {
                leagueType: userMove.currentLeague,
                status: userMove.status,
                viewed: false,
                processedAt: new Date()
              }
            },
          }
        );
      } else {
        console.error(`Target league not found: ${userMove.targetLeague} for user ${userMove.userId}`);
      }
    }

    // Step 3: Mark current season as ended
    await this.db.collection(this.leagueSeasonsCollection).updateOne(
      { seasonId: season.seasonId },
      { $set: { isActive: false, endedAt: new Date() } }
    );

    console.log(`Season ${season.seasonId} ended. ${usersToMove.length} users processed.`);
  }

  // Get season statistics for admin dashboard
  async getSeasonStatistics(seasonId: string): Promise<any> {
    const season = await this.db
      .collection(this.leagueSeasonsCollection)
      .findOne({ seasonId });

    if (!season) return null;

    const stats = {
      seasonId,
      startDate: season.startDate,
      endDate: season.endDate,
      isActive: season.isActive,
      leagues: [] as any[],
    };

    for (const league of season.leagues) {
      const leagueDetails = await this.getLeagueByType(league.leagueType);
      if (!leagueDetails) continue;

      const leagueStats = {
        type: league.leagueType,
        groups: [] as any[],
        totalUsers: 0,
        promoted: [] as any[],
        demoted: [] as any[],
        safe: [] as any[],
      };

      for (const groupId of league.groups) {
        const group = await this.getGroupLeaderboard(groupId.toString());
        if (!group) continue;

        const sortedUsers = [...group.users].sort((a, b) => b.points - a.points);
        leagueStats.totalUsers += sortedUsers.length;

        // Calculate zones
        let promotionCount = 0;
        let demotionCount = 0;

        switch (league.leagueType) {
          case "bronze":
            promotionCount = Math.ceil(sortedUsers.length * 0.3);
            demotionCount = 0;
            break;
          case "silver":
            promotionCount = Math.ceil(sortedUsers.length * 0.25);
            demotionCount = Math.ceil(sortedUsers.length * 0.3);
            break;
          case "gold":
            promotionCount = 0;
            demotionCount = Math.ceil(sortedUsers.length * 0.4);
            break;
        }

        // Categorize users
        for (let i = 0; i < sortedUsers.length; i++) {
          const user = sortedUsers[i];
          const userInfo = {
            userId: user.userId,
            points: user.points,
            position: i + 1,
            groupId: groupId.toString(),
          };

          if (i < promotionCount && league.leagueType !== "gold") {
            leagueStats.promoted.push(userInfo);
          } else if (i >= sortedUsers.length - demotionCount && league.leagueType !== "bronze") {
            leagueStats.demoted.push(userInfo);
          } else {
            leagueStats.safe.push(userInfo);
          }
        }

        leagueStats.groups.push({
          groupId: groupId.toString(),
          groupNumber: group.groupNumber,
          users: sortedUsers.length,
        });
      }

      stats.leagues.push(leagueStats);
    }

    return stats;
  }

  // Get eligible raffle candidates (Top 60% of Gold League)
  async getGoldLeagueEligibleWinners(seasonId: string): Promise<any[]> {
    const season = await this.db
      .collection(this.leagueSeasonsCollection)
      .findOne({ seasonId });

    if (!season) return [];

    const goldLeague = season.leagues.find((l: any) => l.leagueType === "gold");
    if (!goldLeague) return [];

    const eligibleWinners: any[] = [];

    for (const groupId of goldLeague.groups) {
      const group = await this.getGroupLeaderboard(groupId.toString());
      if (!group) continue;

      const sortedUsers = [...group.users].sort((a, b) => b.points - a.points);
      const totalUsers = sortedUsers.length;
      const winnerCount = totalUsers - Math.ceil(totalUsers * 0.4); // Top 60%

      for (let i = 0; i < winnerCount; i++) {
        // Get user details from database
        const userDetails = await this.db
          .collection("users")
          .findOne({ clerkUserId: sortedUsers[i].userId });

        eligibleWinners.push({
          userId: sortedUsers[i].userId,
          points: sortedUsers[i].points,
          position: i + 1,
          groupId: groupId.toString(),
          email: userDetails?.email || "Unknown",
          name: userDetails?.fullName || userDetails?.firstName || "Unknown",
        });
      }
    }

    // Sort by points descending
    eligibleWinners.sort((a, b) => b.points - a.points);

    return eligibleWinners;
  }

  // Manually set raffle winners (by admin)
  async setRaffleWinners(seasonId: string, winnerUserIds: string[]): Promise<boolean> {
    try {
      // Check if already exists
      const existing = await this.db
        .collection("league_raffle_winners")
        .findOne({ seasonId });

      if (existing) {
        // Update existing
        await this.db
          .collection("league_raffle_winners")
          .updateOne(
            { seasonId },
            {
              $set: {
                winners: winnerUserIds.map(userId => ({
                  userId,
                  selectedAt: new Date(),
                  notified: false,
                  prizeAwarded: false,
                })),
                updatedAt: new Date(),
              },
            }
          );
      } else {
        // Insert new
        await this.db
          .collection("league_raffle_winners")
          .insertOne({
            seasonId,
            winners: winnerUserIds.map(userId => ({
              userId,
              selectedAt: new Date(),
              notified: false,
              prizeAwarded: false,
            })),
            createdAt: new Date(),
          });
      }

      return true;
    } catch (error) {
      console.error("Error setting raffle winners:", error);
      return false;
    }
  }

  // Mark raffle winners as notified or prize awarded
  async updateRaffleWinnerStatus(
    seasonId: string,
    userId: string,
    updates: { notified?: boolean; prizeAwarded?: boolean }
  ): Promise<boolean> {
    try {
      const updateFields: any = {};

      if (updates.notified !== undefined) {
        updateFields["winners.$[elem].notified"] = updates.notified;
      }
      if (updates.prizeAwarded !== undefined) {
        updateFields["winners.$[elem].prizeAwarded"] = updates.prizeAwarded;
      }

      const result = await this.db
        .collection("league_raffle_winners")
        .updateOne(
          { seasonId },
          { $set: updateFields },
          { arrayFilters: [{ "elem.userId": userId }] }
        );

      return result.modifiedCount > 0;
    } catch (error) {
      console.error("Error updating raffle winner status:", error);
      return false;
    }
  }

  // Get top users for a specific league type (for filling gaps)
  async getTopUsersForLeague(leagueType: TLeagueType, limit: number = 10): Promise<any[]> {
    try {
      const currentSeason = await this.getCurrentSeason();
      if (!currentSeason) return [];

      // Find all leagues of this type in the current season
      const seasonLeague = currentSeason.leagues.find(l => l.leagueType === leagueType);
      if (!seasonLeague) return [];

      // Get all users in groups of this league type
      const groupIds = seasonLeague.groups;

      // Aggregate users from all groups of this type, sort by points, and take top N
      const pipeline = [
        {
          $match: {
            _id: { $in: groupIds }
          }
        },
        { $unwind: "$users" },
        {
          $project: {
            userId: "$users.userId",
            points: "$users.points",
            league: { $literal: leagueType }
          }
        },
        { $sort: { points: -1 } },
        { $limit: limit }
      ];

      let topUsers = await this.db
        .collection(this.leagueGroupsCollection)
        .aggregate(pipeline)
        .toArray();

      // If we have fewer users than the limit, fill the rest with all-time top users
      if (topUsers.length < limit) {
        console.log(`Found only ${topUsers.length} users in current season for ${leagueType}, filling gaps with all-time top users`);

        const existingUserIds = new Set(topUsers.map(u => u.userId));
        const needed = limit - topUsers.length;

        // Generate fake users to fill the gap with realistic names
        const firstNames = ["Alex", "Jordan", "Sam", "Taylor", "Casey", "Morgan", "Riley", "Avery", "Quinn", "Dakota", "Jamie", "Skyler", "Charlie", "Drew", "Reese"];
        const lastNames = ["Chen", "Smith", "Kim", "Lee", "Garcia", "Patel", "Johnson", "Martinez", "Singh", "Wong", "Davis", "Rodriguez", "Brown", "Wilson", "Lopez"];

        // Generic avatar URLs (using DiceBear API for consistent, diverse avatars)
        const avatarStyles = ["avataaars", "bottts", "shapes", "beam", "pixel-art"];

        // Create a seeded random number generator for consistency across refreshes
        // Seed based on league type and season ID to ensure same users for same league/season
        const seedString = `${leagueType}_${currentSeason.seasonId}`;
        let seedValue = 0;
        for (let i = 0; i < seedString.length; i++) {
          seedValue = ((seedValue << 5) - seedValue) + seedString.charCodeAt(i);
          seedValue = seedValue & seedValue; // Convert to 32bit integer
        }

        // Simple seeded random function (mulberry32 algorithm)
        const seededRandom = (seed: number) => {
          return () => {
            seed = (seed + 0x6D2B79F5) | 0;
            let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
          };
        };

        const random = seededRandom(seedValue);

        let fakeUserIndex = 0;
        while (topUsers.length < limit) {
          const firstName = firstNames[Math.floor(random() * firstNames.length)];
          const lastName = lastNames[Math.floor(random() * lastNames.length)];
          const fullName = `${firstName} ${lastName}`; // Use proper name format with space

          // Generate realistic points based on league type (ensure non-zero)
          let basePoints = 0;
          if (leagueType === "bronze") basePoints = Math.floor(random() * 400) + 5; // 5-405
          else if (leagueType === "silver") basePoints = Math.floor(random() * 800) + 600; // 600-1400
          else if (leagueType === "gold") basePoints = Math.floor(random() * 1500) + 1200; // 1200-2700

          // Ensure points are somewhat sorted (less than the last user)
          const lastPoints = topUsers.length > 0 ? topUsers[topUsers.length - 1].points : basePoints + 100;
          const fakePoints = Math.min(basePoints, Math.max(50, lastPoints - Math.floor(random() * 50))); // Minimum 50 XP

          // 60% of users have avatars, 40% don't (will show default)
          const hasAvatar = random() < 0.6;
          const avatarStyle = avatarStyles[Math.floor(random() * avatarStyles.length)];
          // Use consistent seed for avatar based on name and league
          const avatarSeed = `${fullName.replace(' ', '')}_${leagueType}_${fakeUserIndex}`;
          const avatarUrl = hasAvatar ? `https://api.dicebear.com/7.x/${avatarStyle}/svg?seed=${avatarSeed}` : null;

          const fakeUser = {
            userId: `user_${leagueType}_${currentSeason.seasonId}_${fakeUserIndex}`,
            points: fakePoints,
            league: leagueType,
            name: fullName,
            avatar: avatarUrl,
            email: null,
            isFake: true
          };

          topUsers.push(fakeUser);
          fakeUserIndex++;
        }
      }

      // Enrich with user details (name, avatar) for real users only
      const enrichedUsers = [];
      const { clerkClient } = await import("@clerk/nextjs/server");
      const client = await clerkClient();

      for (const u of topUsers) {
        if ((u as any).isFake) {
          enrichedUsers.push(u);
          continue;
        }

        try {
          const clerkUser = await client.users.getUser(u.userId);
          // Use full name (firstName + lastName), fallback to firstName, then "User"
          let displayName = "User";
          if (clerkUser.firstName && clerkUser.lastName) {
            displayName = `${clerkUser.firstName} ${clerkUser.lastName}`;
          } else if (clerkUser.firstName) {
            displayName = clerkUser.firstName;
          }

          enrichedUsers.push({
            ...u,
            name: displayName,
            avatar: clerkUser.imageUrl || null,
            email: null // Never expose email
          });
        } catch (e) {
          enrichedUsers.push({
            ...u,
            name: "User",
            avatar: null,
            email: null
          });
        }
      }

      return enrichedUsers;
    } catch (error) {
      console.error("Error getting top users for league:", error);
      return [];
    }
  }

  // Mark last season result as viewed
  async markSeasonResultViewed(userId: string): Promise<boolean> {
    try {
      const result = await this.db.collection(this.userLeaguePointsCollection).updateOne(
        { userId },
        {
          $set: {
            "lastSeasonResult.viewed": true,
            updatedAt: new Date()
          }
        }
      );
      return result.modifiedCount > 0;
    } catch (error) {
      console.error("Error marking season result as viewed:", error);
      return false;
    }
  }
}
