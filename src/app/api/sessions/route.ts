import { clerkClient } from "@clerk/express";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json([]);

  const { data: sessions } = await clerkClient.sessions.getSessionList({
    userId,
  });
  const activeSessions = sessions.filter((s) => s.status === "active");
  return NextResponse.json(activeSessions);
}
