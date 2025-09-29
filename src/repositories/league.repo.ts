import { Db, ObjectId } from "mongodb";
import { 
  TLeague, 
  TLeagueGroup, 
  TUserLeaguePoints, 
  TLeagueSeason,
  TLeagueType,
  TGroupStatus,
  TUserLeagueStatus 
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
  async createLeague(league: Omit<TLeague, "_id" | "createdAt" | "updatedAt">): Promise<string> {
    const result = await this.db.collection(this.leaguesCollection).insertOne({
      ...league,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return result.insertedId.toString();
  }

  async getLeagueByType(type: TLeagueType): Promise<TLeague | null> {
    const league = await this.db.collection(this.leaguesCollection).findOne({ type, isActive: true });
    return league as TLeague | null;
  }

  async getAllLeagues(): Promise<TLeague[]> {
    const leagues = await this.db.collection(this.leaguesCollection).find({ isActive: true }).toArray();
    return leagues as TLeague[];
  }

  // League Groups Management
  async createLeagueGroup(group: Omit<TLeagueGroup, "_id" | "createdAt" | "updatedAt">): Promise<string> {
    const result = await this.db.collection(this.leagueGroupsCollection).insertOne({
      ...group,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return result.insertedId.toString();
  }

  async getActiveGroupForUser(userId: string, leagueType: TLeagueType): Promise<TLeagueGroup | null> {
    const currentSeason = await this.getCurrentSeason();
    if (!currentSeason) return null;

    const group = await this.db.collection(this.leagueGroupsCollection).findOne({
      leagueId: new ObjectId(currentSeason.leagues.find(l => l.leagueType === leagueType)?.groups[0]),
      seasonId: currentSeason.seasonId,
      status: "active",
      "users.userId": userId,
    });
    return group as TLeagueGroup | null;
  }

  async addUserToGroup(userId: string, groupId: string, leagueType: TLeagueType): Promise<boolean> {
    const group = await this.db.collection(this.leagueGroupsCollection).findOne({ _id: new ObjectId(groupId) });
    if (!group) return false;

    // Check if group is full
    if (group.users.length >= group.maxUsers) return false;

    // Add user to group
    const result = await this.db.collection(this.leagueGroupsCollection).updateOne(
      { _id: new ObjectId(groupId) },
      {
        $push: {
          users: {
            userId,
            points: 0,
            position: group.users.length + 1,
            status: "safe",
            joinedAt: new Date(),
          }
        }
      }
    );

    return result.modifiedCount > 0;
  }

  async updateUserPointsInGroup(userId: string, groupId: string, points: number): Promise<boolean> {
    const result = await this.db.collection(this.leagueGroupsCollection).updateOne(
      { 
        _id: new ObjectId(groupId),
        "users.userId": userId 
      },
      {
        $set: {
          "users.$.points": points,
          "users.$.lastActivityAt": new Date(),
        }
      }
    );

    return result.modifiedCount > 0;
  }

  async getGroupLeaderboard(groupId: string): Promise<TLeagueGroup | null> {
    const group = await this.db.collection(this.leagueGroupsCollection).findOne({ _id: new ObjectId(groupId) });
    if (!group) return null;

    // Sort users by points (descending)
    group.users.sort((a: any, b: any) => b.points - a.points);
    
    // Update positions
    group.users.forEach((user: any, index: number) => {
      user.position = index + 1;
    });

    // Update positions in database
    await this.db.collection(this.leagueGroupsCollection).updateOne(
      { _id: new ObjectId(groupId) },
      { $set: { users: group.users } }
    );

    return group as TLeagueGroup;
  }

  // User League Points Management
  async createUserLeaguePoints(points: Omit<TUserLeaguePoints, "_id" | "createdAt" | "updatedAt">): Promise<string> {
    const result = await this.db.collection(this.userLeaguePointsCollection).insertOne({
      ...points,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return result.insertedId.toString();
  }

  async getUserLeaguePoints(userId: string, seasonId: string): Promise<TUserLeaguePoints | null> {
    const points = await this.db.collection(this.userLeaguePointsCollection).findOne({
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
    const result = await this.db.collection(this.userLeaguePointsCollection).updateOne(
      { userId, seasonId },
      {
        $set: {
          ...pointsUpdate,
          updatedAt: new Date(),
        }
      }
    );
    return result.modifiedCount > 0;
  }

  async addPointsToUser(
    userId: string, 
    seasonId: string, 
    pointsType: keyof TUserLeaguePoints['pointsBreakdown'],
    points: number
  ): Promise<boolean> {
    const result = await this.db.collection(this.userLeaguePointsCollection).updateOne(
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
        }
      }
    );
    return result.modifiedCount > 0;
  }

  // Get user's overall points across all seasons
  async getUserOverallPoints(userId: string): Promise<number> {
    const userPoints = await this.db.collection(this.userLeaguePointsCollection).findOne(
      { userId },
      { sort: { updatedAt: -1 } }
    );
    return userPoints?.overallPoints || 0;
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

    const seasonLeague = currentSeason.leagues.find(l => l.leagueType === targetLeagueType);
    if (!seasonLeague) return false;

    // Try to add user to existing group
    let added = false;
    for (const groupId of seasonLeague.groups) {
      const group = await this.getGroupLeaderboard(groupId.toString());
      if (group && group.users.length < group.maxUsers) {
        added = await this.addUserToGroup(userId, groupId.toString(), targetLeagueType);
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
        users: [{
          userId,
          points: 0, // Season points start from 0
          position: 1,
          status: "safe" as const,
          joinedAt: new Date(),
        }],
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
          }
        }
      );
    }

    return true;
  }

  // League Seasons Management
  async createSeason(season: Omit<TLeagueSeason, "_id" | "createdAt" | "updatedAt">): Promise<string> {
    const result = await this.db.collection(this.leagueSeasonsCollection).insertOne({
      ...season,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return result.insertedId.toString();
  }

  async getCurrentSeason(): Promise<TLeagueSeason | null> {
    const now = new Date();
    const season = await this.db.collection(this.leagueSeasonsCollection).findOne({
      startDate: { $lte: now },
      endDate: { $gte: now },
      isActive: true,
    });
    return season as TLeagueSeason | null;
  }

  async endSeason(seasonId: string): Promise<boolean> {
    const result = await this.db.collection(this.leagueSeasonsCollection).updateOne(
      { seasonId },
      {
        $set: {
          isActive: false,
          updatedAt: new Date(),
        }
      }
    );
    return result.modifiedCount > 0;
  }

  // League Progression Logic
  async processLeagueProgression(groupId: string): Promise<boolean> {
    const group = await this.getGroupLeaderboard(groupId);
    if (!group) return false;

    const totalUsers = group.users.length;
    const league = await this.getLeagueByType(group.leagueId.toString() as TLeagueType);
    if (!league) return false;

    // Calculate promotion and demotion zones
    let promotionZone: number;
    let demotionZone: number;

    switch (league.type) {
      case "bronze":
        promotionZone = Math.ceil(totalUsers * 0.3);
        demotionZone = Math.floor(totalUsers * 0.2);
        break;
      case "silver":
        promotionZone = Math.ceil(totalUsers * 0.25);
        demotionZone = Math.floor(totalUsers * 0.3);
        break;
      case "gold":
        promotionZone = 0;
        demotionZone = Math.floor(totalUsers * 0.4);
        break;
    }

    // Update user statuses
    const updatedUsers = group.users.map((user: any, index: number) => {
      let status: TUserLeagueStatus = "safe";
      
      if (index < promotionZone && league.type !== "gold") {
        status = "promoted";
      } else if (index >= totalUsers - demotionZone && league.type !== "bronze") {
        status = "demoted";
      }

      return { ...user, status };
    });

    // Update group with new statuses
    await this.db.collection(this.leagueGroupsCollection).updateOne(
      { _id: new ObjectId(groupId) },
      { $set: { users: updatedUsers, status: "completed" } }
    );

    return true;
  }

  // Initialize default leagues
  async initializeDefaultLeagues(): Promise<void> {
    const existingLeagues = await this.db.collection(this.leaguesCollection).countDocuments();
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
              description: "Complete a full mock exam"
            },
            {
              id: "skills-tried",
              title: "4 Skills Tried (L, R, W, S)",
              points: 30,
              description: "Practice all four CELPIP skills"
            },
            {
              id: "ai-feedback",
              title: "1 Writing or Speaking with AI Feedback",
              points: 40,
              description: "Get AI feedback on writing or speaking"
            }
          ]
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
              description: "Complete 5 mock exams"
            },
            {
              id: "clb-improvement",
              title: "+1 CLB Improvement (any skill)",
              points: 80,
              description: "Improve CLB score in any skill"
            },
            {
              id: "writing-feedback-3",
              title: "3 Writing with Feedback",
              points: 60,
              description: "Complete 3 writing tasks with AI feedback"
            },
            {
              id: "speaking-feedback-3",
              title: "3 Speaking with Feedback",
              points: 60,
              description: "Complete 3 speaking tasks with AI feedback"
            }
          ]
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
              description: "Complete 10 mock exams"
            },
            {
              id: "clb-improvement-3-skills",
              title: "+1 CLB in 3 Skills",
              points: 150,
              description: "Improve CLB score in 3 different skills"
            },
            {
              id: "practice-consistency",
              title: "Practice 3x/Week (4 Weeks)",
              points: 150,
              description: "Maintain consistent practice schedule"
            },
            {
              id: "referral",
              title: "1 Friend Referred (paid plan)",
              points: 100,
              description: "Refer a friend who purchases a plan"
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
                { id: "champion-speaking", title: "+5 Speaking improved", points: 100 },
                { id: "champion-skills", title: "all skills practiced", points: 50 },
                { id: "champion-referral", title: "1 referral", points: 50 }
              ]
            }
          ]
        },
        rewards: {
          promotionPoints: 0,
          demotionPoints: 40,
          giftCardAmount: 100,
        },
        isActive: true,
      }
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
          updatedAt: new Date()
        } 
      }
    );

    // Create new season
    const newSeasonId = `season_${Date.now()}`;
    const newSeason = {
      seasonId: newSeasonId,
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      status: "active" as const,
      leagues: currentSeason.leagues.map(league => ({
        ...league,
        groups: [] // Start with empty groups
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
          await this.db.collection(this.leagueGroupsCollection).updateOne(
            { _id: new ObjectId(groupId), "users.userId": user.userId },
            { $set: { "users.$.status": newStatus } }
          );

          // Reset season points for next season
          await this.db.collection(this.userLeaguePointsCollection).updateOne(
            { userId: user.userId, seasonId: season.seasonId },
            { 
              $set: { 
                totalPoints: 0, // Reset season points
                updatedAt: new Date()
              } 
            }
          );
        }
      }
    }
  }
}
