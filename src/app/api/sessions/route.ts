import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json([]);

  const clerk = await clerkClient();
  const { data: sessions } = await clerk.sessions.getSessionList({
    userId,
  });
  const activeSessions = sessions.filter((s) => s.status === "active");
  return NextResponse.json(activeSessions);
}
