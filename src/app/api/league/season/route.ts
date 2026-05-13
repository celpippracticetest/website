import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/appDocumentsClient";
import { LeagueRepository } from "@/repositories/league.repo";
import { ObjectId } from "bson";

export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const leagueRepo = new LeagueRepository(db);

    const body = await request.json();
    const { action } = body;

    if (action === "create_season") {
      // Initialize default leagues if they don't exist
      await leagueRepo.initializeDefaultLeagues();

      // Create new season
      const seasonId = `season_${Date.now()}`;
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7); // 7 days from now

      // Get all leagues
      const leagues = await leagueRepo.getAllLeagues();
      
      // Create groups for each league
      const seasonLeagues = [];
      for (const league of leagues) {
        const groups = [];
        
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
        
        groups.push(groupId);
        seasonLeagues.push({
          leagueType: league.type,
          groups: [new ObjectId(groupId)],
        });
      }

      // Create season
      const season = await leagueRepo.createSeason({
        seasonId,
        startDate,
        endDate,
        isActive: true,
        leagues: seasonLeagues,
      });

      return NextResponse.json({ 
        success: true, 
        season: {
          id: season,
          seasonId,
          startDate,
          endDate,
        }
      });
    }

    if (action === "end_season") {
      const success = await leagueRepo.endCurrentSeason();
      if (success) {
        return NextResponse.json({ success: true, message: "Season ended successfully" });
      } else {
        return NextResponse.json({ error: "Failed to end season" }, { status: 400 });
      }
    }

    if (action === "preview_process") {
      // Read-only preview of statuses if season ends now
      const currentSeason = await leagueRepo.getCurrentSeason();
      if (!currentSeason) return NextResponse.json({ error: "No active season" }, { status: 404 });
      const db = await getDb();
      const repo = new LeagueRepository(db);
      const season = currentSeason;
      const preview: any[] = [];
      for (const league of season.leagues) {
        for (const groupId of league.groups) {
          const group = await repo.getGroupLeaderboard(groupId.toString());
          if (!group) continue;
          const sorted = [...group.users].sort((a, b) => b.points - a.points);
          const total = sorted.length;
          let promotion = 0, demotion = 0;
          if (league.leagueType === "bronze") promotion = Math.ceil(total * 0.3);
          if (league.leagueType === "silver") { promotion = Math.ceil(total * 0.25); demotion = Math.ceil(total * 0.3); }
          if (league.leagueType === "gold") { promotion = 0; demotion = Math.ceil(total * 0.4); }
          const rows = await Promise.all(sorted.map(async (u: any, i: number) => {
            let status: "promotion" | "safe" | "demotion" = "safe";
            if (i < promotion && league.leagueType !== "gold") {
              const hasTasks = await repo.checkUserCompletedLeagueTasks(u.userId, league.leagueType);
              const hasMin = u.points >= repo.getMinimumPointsForLeague(league.leagueType);
              status = hasTasks && hasMin ? "promotion" : "safe";
            } else if (i >= total - demotion && league.leagueType !== "bronze") {
              status = "demotion";
            }
            return { userId: u.userId, points: u.points, status };
          }));
          preview.push({ league: league.leagueType, groupId: groupId.toString(), users: rows });
        }
      }
      return NextResponse.json({ preview });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error("Error in season API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
