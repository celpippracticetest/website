import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { LeagueRepository } from "@/repositories/league.repo";
import { auth } from "@clerk/nextjs/server";


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

        const debugInfo = {
          seasonId,
          season,
          groups: [] as any[],
        };

        for (const league of season.leagues) {
          for (const groupId of league.groups) {
            const group = await db
              .collection("league_groups")
              .findOne({ _id: groupId });
            
            if (group) {
              // Fetch user names from Clerk
              const usersWithNames = await Promise.all(
                group.users.map(async (user: any) => {
                  try {
                    const { clerkClient } = await import("@clerk/nextjs/server");
                    const client = await clerkClient();
                    const clerkUser = await client.users.getUser(user.userId);
                    return {
                      ...user,
                      name: clerkUser.firstName && clerkUser.lastName 
                        ? `${clerkUser.firstName} ${clerkUser.lastName}`.trim()
                        : clerkUser.firstName || clerkUser.emailAddresses[0]?.emailAddress?.split('@')[0] || 'User',
                      email: clerkUser.emailAddresses[0]?.emailAddress,
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
                groupId: groupId.toString(),
                groupNumber: group.groupNumber,
                maxUsers: group.maxUsers,
                userCount: group.users.length,
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

        // 1) Process promotions/demotions on the selected season exactly
        await leagueRepo.processSeasonEnd(season as any);

        // 2) Mark this season as ended (idempotent)
        await db.collection("league_seasons").updateOne(
          { seasonId },
          { $set: { isActive: false, endedAt: new Date() } }
        );

        // 3) Ensure there is an active season to migrate INTO
        let targetSeason = await db
          .collection("league_seasons")
          .findOne({ isActive: true });

        if (!targetSeason) {
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
                totalPoints: 0,
                groupId: null,
                updatedAt: new Date(),
              },
            }
          );
        }

        return NextResponse.json({ success: true });
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

