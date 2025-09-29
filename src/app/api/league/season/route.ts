import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { LeagueRepository } from "@/repositories/league.repo";
import { ObjectId } from "mongodb";

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

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error("Error in season API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
