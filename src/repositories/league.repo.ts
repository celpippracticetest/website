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

  constructor(db: Db) {
    this.db = db;
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

    const group = await this.db
      .collection(this.leagueGroupsCollection)
      .findOne({
        leagueId: new ObjectId(
          currentSeason.leagues.find(
            (l) => l.leagueType === leagueType
          )?.groups[0]
        ),
        seasonId: currentSeason.seasonId,
        status: "active",
        "users.userId": userId,
      });
    return group as TLeagueGroup | null;
  }

  async addUserToGroup(
    userId: string,
    groupId: string,
    leagueType: TLeagueType
  ): Promise<boolean> {
    try {
      const group = await this.db
        .collection(this.leagueGroupsCollection)
        .findOne({ _id: new ObjectId(groupId) });
      if (!group) return false;

      // Check if user is already in the group
      if (group.users.some((u: any) => u.userId === userId)) {
        return false; // User already in group
      }

      // Check if group is full
      if (group.users.length >= group.maxUsers) return false;

      // Add user to group
      const result = await this.db
        .collection(this.leagueGroupsCollection)
        .updateOne(
          { _id: new ObjectId(groupId) },
          {
            $push: {
              users: {
                userId,
                points: 0,
                position: group.users.length + 1,
                status: "safe" as const,
                joinedAt: new Date(),
              },
            } as any,
          }
        );

      if (result.modifiedCount > 0) {
        // Also create user league points record if it doesn't exist
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

    return result.modifiedCount > 0;
  }

  async getGroupLeaderboard(groupId: string): Promise<TLeagueGroup | null> {
    const group = await this.db
      .collection(this.leagueGroupsCollection)
      .findOne({ _id: new ObjectId(groupId) });
    if (!group) return null;

    // Sort users by points (descending)
    group.users.sort((a: any, b: any) => b.points - a.points);

    // Update positions
    group.users.forEach((user: any, index: number) => {
      user.position = index + 1;
    });

    // Update positions in database
    await this.db
      .collection(this.leagueGroupsCollection)
      .updateOne(
        { _id: new ObjectId(groupId) },
        { $set: { users: group.users } }
      );

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
        console.log("No existing record, attempting auto assign...");
        // Auto assign user to league first
        const autoAssignResult = await this.autoAssignUserToLeague(userId);
        console.log("Auto assign result:", autoAssignResult);
        if (!autoAssignResult) {
          console.error("Failed to auto assign user to league");
          return false;
        }
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

      console.log("Database update result:", { modifiedCount: result.modifiedCount });

      if (result.modifiedCount > 0) {
        console.log("Points updated successfully, updating group leaderboard...");
        // Also update the group leaderboard
        const userRecord = await this.db
          .collection(this.userLeaguePointsCollection)
          .findOne({ userId, seasonId });

        if (userRecord && userRecord.groupId) {
          console.log("Updating group leaderboard for group:", userRecord.groupId.toString());
          await this.updateUserPointsInGroup(
            userId,
            userRecord.groupId.toString(),
            userRecord.totalPoints
          );
        } else {
          console.log("No group ID found for user record");
        }
      } else {
        console.log("No documents were modified");
      }

      return result.modifiedCount > 0;
    } catch (error) {
      console.error("Error adding points to user:", error);
      return false;
    }
  }

  // Get user's overall points across all seasons
  async getUserOverallPoints(userId: string): Promise<number> {
    const result = await this.db
      .collection(this.userLeaguePointsCollection)
      .aggregate([
        { $match: { userId } },
        {
          $group: { _id: null, totalOverallPoints: { $sum: "$overallPoints" } },
        },
      ])
      .toArray();

    return result.length > 0 ? result[0].totalOverallPoints : 0;
  }

  // Auto assign user to appropriate league
  async autoAssignUserToLeague(userId: string): Promise<boolean> {
    try {
      // Get current season
      const currentSeason = await this.getCurrentSeason();
      if (!currentSeason) return false;

      // Get user's overall points to determine league
      const overallPoints = await this.getUserOverallPoints(userId);
      
      // Only assign users to leagues if they have points
      if (overallPoints === 0) {
        return false;
      }
      
      let targetLeagueType = "bronze";
      if (overallPoints >= 150) {
        targetLeagueType = "gold";
      } else if (overallPoints >= 100) {
        targetLeagueType = "silver";
      }

      // Find target league
      const targetLeague = await this.getLeagueByType(targetLeagueType as any);
      if (!targetLeague) return false;

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
        added = await this.addUserToGroup(
          userId,
          bestGroupId,
          targetLeagueType as any
        );
        if (added) {
          groupId = bestGroupId;
        }
      }

      if (!added) {
        // Create new group
        const newGroup = {
          leagueId: new ObjectId(targetLeague._id),
          groupNumber: seasonLeague.groups.length + 1,
          seasonId: currentSeason.seasonId,
          startDate: new Date(),
          endDate: currentSeason.endDate,
          status: "active" as const,
          maxUsers: 10,
          users: [
            {
              userId,
              points: 0,
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
        if (added) break;
      }
    }

    if (!added) {
      // Create new group
      const newGroup = {
        leagueId: new ObjectId(targetLeague._id),
        groupNumber: seasonLeague.groups.length + 1,
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

      // Update user's league assignment
      await this.db.collection(this.userLeaguePointsCollection).updateOne(
        { userId, seasonId },
        {
          $set: {
            leagueId: new ObjectId(targetLeague._id),
            groupId: new ObjectId(groupId),
            totalPoints: 0, // Reset season points
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

    switch (league.type) {
      case "bronze":
        promotionZone = Math.max(1, Math.ceil(totalUsers * 0.3)); // At least 1, max 30%
        demotionZone = Math.max(0, Math.floor(totalUsers * 0.2)); // At least 0, max 20%
        break;
      case "silver":
        promotionZone = Math.max(1, Math.ceil(totalUsers * 0.25)); // At least 1, max 25%
        demotionZone = Math.max(1, Math.floor(totalUsers * 0.3)); // At least 1, max 30%
        break;
      case "gold":
        promotionZone = 0; // No promotion from Gold
        demotionZone = Math.max(1, Math.floor(totalUsers * 0.4)); // At least 1, max 40%
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
    const currentSeason = await this.getCurrentSeason();
    if (!currentSeason) return false;

    // Process league promotions/demotions
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

    await this.createSeason(newSeason);
    return true;
  }

  // Process season end - promotions, demotions, and reset season points
  async processSeasonEnd(season: TLeagueSeason): Promise<void> {
    for (const league of season.leagues) {
      for (const groupId of league.groups) {
        const group = await this.getGroupLeaderboard(groupId.toString());
        if (!group) continue;

        // Sort users by season points
        const sortedUsers = group.users.sort((a, b) => b.points - a.points);
        const totalUsers = sortedUsers.length;

        // Calculate promotion/demotion zones
        const promotionCount = Math.ceil(totalUsers * 0.3); // Top 30%
        const demotionCount = Math.ceil(totalUsers * 0.3); // Bottom 30%

        for (let i = 0; i < totalUsers; i++) {
          const user = sortedUsers[i];
          let newStatus: "promotion" | "safe" | "demotion" = "safe";

          if (i < promotionCount) {
            newStatus = "promotion";
          } else if (i >= totalUsers - demotionCount) {
            newStatus = "demotion";
          }

          // Update user status
          await this.db
            .collection(this.leagueGroupsCollection)
            .updateOne(
              { _id: new ObjectId(groupId), "users.userId": user.userId },
              { $set: { "users.$.status": newStatus } }
            );

          // Reset season points for next season
          await this.db.collection(this.userLeaguePointsCollection).updateOne(
            { userId: user.userId, seasonId: season.seasonId },
            {
              $set: {
                totalPoints: 0, // Reset season points
                updatedAt: new Date(),
              },
            }
          );
        }
      }
    }
  }
}
