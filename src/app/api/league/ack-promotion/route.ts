import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDb } from "@/lib/mongodb";
import { LeagueRepository } from "@/repositories/league.repo";

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();
    const leagueRepo = new LeagueRepository(db);

    const success = await leagueRepo.markSeasonResultViewed(userId);

    return NextResponse.json({ success });
  } catch (error) {
    console.error("Error acknowledging promotion:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
