import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server-auth";
import { getDb } from "@/lib/appDocumentsClient";
import { LeagueRepository } from "@/repositories/league.repo";

export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const db = await getDb();
        const leagueRepo = new LeagueRepository(db);

        // Get current season to make sure we update the right record
        const currentSeason = await leagueRepo.getCurrentSeason();
        if (!currentSeason) {
            return NextResponse.json({ error: "No active season found" }, { status: 404 });
        }

        // Update user_league_points for the current season
        const result = await db.collection("user_league_points").updateOne(
            { userId, seasonId: currentSeason.seasonId },
            {
                $set: {
                    lastSeasonResult: {
                        leagueType: "bronze",
                        status: "promoted",
                        viewed: false,
                        processedAt: new Date()
                    },
                    updatedAt: new Date()
                },
                $setOnInsert: {
                    createdAt: new Date(),
                    totalPoints: 0,
                    overallPoints: 0,
                    pointsBreakdown: {
                        mockExams: 0,
                        practiceSessions: 0,
                        aiFeedback: 0,
                        skillsTried: 0,
                        timeSpent: 0
                    },
                    tasksCompleted: []
                }
            },
            { upsert: true }
        );

        return NextResponse.json({
            success: true,
            message: `Rank up message triggered for season ${currentSeason.seasonId}. Please refresh the page.`,
            dbResult: result
        });
    } catch (error) {
        console.error("Error triggering test rank up:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
