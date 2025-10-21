import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { LeagueRepository } from "@/repositories/league.repo";

export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron job request
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const secret = process.env.CRON_SECRET;
    const authorized = (
      (authHeader && secret && authHeader === `Bearer ${secret}`) ||
      (token && secret && token === secret)
    );
    if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = await getDb();
    const leagueRepo = new LeagueRepository(db);

    // Check if current season should end
    const currentSeason = await leagueRepo.getCurrentSeason();
    if (!currentSeason) {
      return NextResponse.json({ message: "No active season" });
    }

    const now = new Date();
    if (now >= currentSeason.endDate) {
      // End the season
      const success = await leagueRepo.endCurrentSeason();
      if (success) {
        return NextResponse.json({ 
          success: true, 
          message: "Season ended and new season started" 
        });
      } else {
        return NextResponse.json({ error: "Failed to end season" }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      message: "Season not ready to end yet",
      endDate: currentSeason.endDate 
    });

  } catch (error) {
    console.error("Error in cron job:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
