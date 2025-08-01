import { NextResponse } from "next/server";
import { CheckoutRepository } from "@/repositories/checkout.repo";
import mongoClient from "@/lib/mongodb";

export async function GET() {
  const repo = new CheckoutRepository(mongoClient);
  const expired = await repo.findExpiredOneTimers();

  for (const { sessionId, userId } of expired) {
    await repo.updateStatus(sessionId, "cancelled");
  }

  return NextResponse.json({ success: true });
}
