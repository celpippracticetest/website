import "server-only";

/**
 * Guests (not signed in) may get AI scoring for FREE Writing/Speaking
 * practices, like they can finish free Reading/Listening. Each AI score costs
 * money, so guests get a small daily allowance per IP; signed-in users are
 * unaffected. Guest results are returned but not saved (no account to save to).
 */

import { NextResponse } from "next/server";
import documentsClient, { getDb } from "@/lib/appDocumentsClient";
import { PracticeRepository } from "@/repositories/practice.repo";

/** AI scores per IP per UTC day for guests (Writing + Speaking combined). */
export const GUEST_AI_DAILY_LIMIT = 5;

function clientIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip")?.trim() || null;
}

/**
 * Returns an error response when the guest may not be scored, or null when
 * scoring may go ahead (one allowance is used up on success).
 */
export async function guestScoringBlockedResponse(
  req: Request,
  practiceId: string,
): Promise<NextResponse | null> {
  const signIn = (message: string) =>
    NextResponse.json({ message, requiresSignIn: true }, { status: 401 });

  if (!practiceId) return signIn("Sign in to get your score.");
  const practice = await new PracticeRepository(documentsClient).findPractice(practiceId);
  if (!practice?.isFree) return signIn("Sign in to practise this prompt.");

  const ip = clientIp(req);
  if (!ip) return null;
  const day = new Date().toISOString().slice(0, 10);
  const key = `${ip}:${day}`;
  try {
    const db = await getDb();
    const usage = db.collection("guest_ai_usage");
    const existing = await usage.findOne({ key });
    const used = Number((existing as { count?: number } | null)?.count ?? 0);
    if (used >= GUEST_AI_DAILY_LIMIT) {
      return NextResponse.json(
        {
          message: "You've used today's free guest scores. Create a free account to keep practising.",
          requiresSignIn: true,
          limitReached: true,
        },
        { status: 429 },
      );
    }
    await usage.updateOne(
      { key },
      { $inc: { count: 1 }, $setOnInsert: { key, day, createdAt: new Date() } },
      { upsert: true },
    );
  } catch (error) {
    // Never block a free score on the counter itself.
    console.error("[guest-ai] usage counter failed", error);
  }
  return null;
}

/** Saves the answer for signed-in users; guests get the same shape back, unsaved. */
export async function createAnswerUnlessGuest<D extends { userId?: string | null }>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- repos type userId as required
  repo: { createAnswer(doc: any): Promise<unknown> },
  doc: D,
): Promise<Record<string, unknown>> {
  if (!doc.userId) return { ...doc, guest: true };
  return (await repo.createAnswer(doc)) as Record<string, unknown>;
}
