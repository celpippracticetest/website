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
          totalPoints: points,
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
}
