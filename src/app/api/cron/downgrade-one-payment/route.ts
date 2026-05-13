import { NextResponse } from "next/server";
import { CheckoutRepository } from "@/repositories/checkout.repo";
import documentsClient from "@/lib/appDocumentsClient";

export async function GET() {
  const repo = new CheckoutRepository(documentsClient);
  const expired = await repo.findExpiredOneTimers();

  for (const { sessionId, userId } of expired) {
    await repo.updateStatus(sessionId, "cancelled");
  }

  return NextResponse.json({ success: true });
}
