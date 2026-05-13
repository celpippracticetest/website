import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/appDocumentsClient";
import { LeagueRepository } from "@/repositories/league.repo";
import { auth } from "@/lib/auth/server-auth";

type LeagueGroupUserEntry = { userId: string } & Record<string, unknown>;
type LeagueGroupForDebug = {
  groupNumber?: number;
  maxUsers?: number;
  users?: LeagueGroupUserEntry[];
};

type SeasonLeagueEntry = {
  leagueType: string;
  groups: unknown[];
};
type LeagueSeasonForDebug = {
  leagues?: SeasonLeagueEntry[];
};


export async function GET(request: NextRequest) {
  try {


    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const seasonId = searchParams.get("seasonId");

    const db = await getDb();
    const leagueRepo = new LeagueRepository(db);

    switch (action) {
      case "get_seasons": {
        // Get all seasons
        const seasons = await db
          .collection("league_seasons")
          .find({})
          .sort({ createdAt: -1 })
          .limit(20)
          .toArray();

        return NextResponse.json({ seasons });
      }

      case "get_season_stats": {
        if (!seasonId) {
          return NextResponse.json(
            { error: "seasonId is required" },
            { status: 400 }
          );
        }

        const stats = await leagueRepo.getSeasonStatistics(seasonId);
        return NextResponse.json({ stats });
      }

      case "get_eligible_winners": {
        if (!seasonId) {
          return NextResponse.json(
            { error: "seasonId is required" },
            { status: 400 }
          );
        }

        const eligibleWinners = await leagueRepo.getGoldLeagueEligibleWinners(seasonId);
        return NextResponse.json({ eligibleWinners });
      }

      case "get_raffle_winners": {
        if (!seasonId) {
          return NextResponse.json(
            { error: "seasonId is required" },
            { status: 400 }
          );
        }

        const raffleWinners = await leagueRepo.getRaffleWinners(seasonId);
        return NextResponse.json({ raffleWinners });
      }

      case "get_detailed_league_info": {
        if (!seasonId) {
          return NextResponse.json(
            { error: "seasonId is required" },
            { status: 400 }
          );
        }

        const detailedInfo = await leagueRepo.getDetailedLeagueInfo(seasonId);
        return NextResponse.json({ detailedInfo });
      }

      case "debug_groups": {
        if (!seasonId) {
          return NextResponse.json(
            { error: "seasonId is required" },
            { status: 400 }
          );
        }

        // Debug: Get all groups for this season
        const season = await db
          .collection("league_seasons")
          .findOne({ seasonId });
        
        if (!season) {
          return NextResponse.json({ error: "Season not found" }, { status: 404 });
        }

        const seasonTyped = season as LeagueSeasonForDebug;
        const seasonLeagues = Array.isArray(seasonTyped.leagues) ? seasonTyped.leagues : [];

        const debugInfo = {
          seasonId,
          season,
          groups: [] as any[],
        };

        /** Supabase-backed admin bridge; `getUser` accepts legacy Clerk id or Supabase UUID. */
        const { appUserAdmin } = await import("@/lib/auth/app-user-admin");
        const authAdmin = await appUserAdmin();

        for (const league of seasonLeagues) {
          const groupIds = Array.isArray(league.groups) ? league.groups : [];
          for (const groupId of groupIds) {
            const groupDoc = await db
              .collection("league_groups")
              .findOne({ _id: groupId });

            if (groupDoc) {
              const group = groupDoc as LeagueGroupForDebug;
              const groupUsers: LeagueGroupUserEntry[] = Array.isArray(group.users)
                ? group.users
                : [];

              const usersWithNames = await Promise.all(
                groupUsers.map(async (user) => {
                  try {
                    const appUser = await authAdmin.users.getUser(user.userId);
                    return {
                      ...user,
                      name:
                        appUser.firstName && appUser.lastName
                          ? `${appUser.firstName} ${appUser.lastName}`.trim()
                          : appUser.firstName ||
                            appUser.emailAddresses[0]?.emailAddress?.split("@")[0] ||
                            "User",
                      email: appUser.emailAddresses[0]?.emailAddress,
                    };
                  } catch (error) {
                    console.log("Error fetching user name for:", user.userId, error);
                    return {
                      ...user,
                      name: user.userId.slice(-8),
                      email: null,
                    };
                  }
                })
              );

              debugInfo.groups.push({
                leagueType: league.leagueType,
                groupId: String(groupId),
                groupNumber: group.groupNumber,
                maxUsers: group.maxUsers,
                userCount: groupUsers.length,
                users: usersWithNames,
              });
            }
          }
        }

        return NextResponse.json({ debugInfo });
      }

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error("Error in admin league API:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error?.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await auth();



    const body = await request.json();
    const { action, seasonId, winnerUserIds, updates } = body;

    const db = await getDb();
    const leagueRepo = new LeagueRepository(db);

    switch (action) {
      case "set_raffle_winners": {
        if (!seasonId || !winnerUserIds || !Array.isArray(winnerUserIds)) {
          return NextResponse.json(
            { error: "seasonId and winnerUserIds (array) are required" },
            { status: 400 }
          );
        }

        const success = await leagueRepo.setRaffleWinners(seasonId, winnerUserIds);
        return NextResponse.json({ success });
      }

      case "update_winner_status": {
        if (!seasonId || !body.userId || !updates) {
          return NextResponse.json(
            { error: "seasonId, userId, and updates are required" },
            { status: 400 }
          );
        }

        const success = await leagueRepo.updateRaffleWinnerStatus(
          seasonId,
          body.userId,
          updates
        );
        return NextResponse.json({ success });
      }

      case "end_season": {
        if (!seasonId) {
          return NextResponse.json(
            { error: "seasonId is required" },
            { status: 400 }
          );
        }

        const season = await db
          .collection("league_seasons")
          .findOne({ seasonId });

        if (!season) {
          return NextResponse.json(
            { error: "Season not found" },
            { status: 404 }
          );
        }

        // 1) Process promotions/demotions on the selected season
        await leagueRepo.processSeasonEnd(season as any);

        // 2) Mark this season as ended
        await db.collection("league_seasons").updateOne(
          { seasonId },
          { $set: { isActive: false, endedAt: new Date() } }
        );

        // 3) Ensure there is an active season to migrate users to
        let targetSeason = await db
          .collection("league_seasons")
          .findOne({ isActive: true });

        if (!targetSeason) {
          // Create new season
          const newSeasonId = `season_${Date.now()}`;
          const startDate = new Date();
          const endDate = new Date();
          endDate.setDate(endDate.getDate() + 7);

          const seasonLeagues = (season as any).leagues.map((l: any) => ({
            leagueType: l.leagueType,
            groups: [],
          }));

          await leagueRepo.createSeason({
            seasonId: newSeasonId,
            startDate,
            endDate,
            isActive: true,
            leagues: seasonLeagues,
          });

          targetSeason = await db
            .collection("league_seasons")
            .findOne({ seasonId: newSeasonId });
        }

        // 4) Migrate all user_league_points records from ENDED season → ACTIVE target season
        if (targetSeason && (targetSeason as any).seasonId !== seasonId) {
          await db.collection("user_league_points").updateMany(
            { seasonId },
            {
              $set: {
                seasonId: (targetSeason as any).seasonId,
                totalPoints: 0, // Reset season points for new season
                groupId: null, // Reset group assignment for new season
                updatedAt: new Date(),
              },
            }
          );
        }

        return NextResponse.json({ 
          success: true, 
          message: "Selected season ended and users migrated to new season" 
        });
      }

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error("Error in admin league API POST:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error?.message },
      { status: 500 }
    );
  }
}

