import { NextResponse } from "next/server";
import { countActiveOnlineUsers } from "@/lib/pg/userActivityPresence";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/analytics/active-users
 * Returns the count of users active in the last 5 minutes
 */
export async function GET() {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const activeUsersCount = await countActiveOnlineUsers(fiveMinutesAgo);

    return NextResponse.json({
      success: true,
      activeUsers: activeUsersCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching active users:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch active users" },
      { status: 500 },
    );
  }
}
