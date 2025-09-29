import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { LeagueRepository } from "@/repositories/league.repo";

export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const leagueRepo = new LeagueRepository(db);

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
        groups: [groupId],
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

  } catch (error) {
    console.error("Error creating season:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
