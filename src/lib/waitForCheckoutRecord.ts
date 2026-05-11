import type { CompatMongoClient as MongoClient } from "@/lib/pg/types";
import { CheckoutRepository } from "@/repositories/checkout.repo";

/** Brief wait for Stripe webhook to persist checkout (guest flow). */
export async function waitForCheckoutRecord(
  mongoClient: MongoClient,
  sessionId: string,
  options?: { attempts?: number; delayMs?: number }
) {
  const attempts = options?.attempts ?? 14;
  const delayMs = options?.delayMs ?? 400;
  const repo = new CheckoutRepository(mongoClient);
  for (let i = 0; i < attempts; i++) {
    const row = await repo.findCheckoutBySessionId(sessionId);
    if (row) return row;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return null;
}
