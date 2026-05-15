import { getDb } from "@/lib/appDocumentsClient";
import { randomBytes } from "crypto";

const TELEGRAM_LINKS = "telegram_links";
const LINKING_TOKENS = "telegram_linking_tokens";

export type TelegramLinkRow = {
  clerkUserId: string;
  telegramChatId: string;
  telegramUsername?: string | null;
  linkedAt: Date;
  updatedAt: Date;
};

export async function getTelegramLinkByUserId(
  userId: string
): Promise<TelegramLinkRow | null> {
  const db = await getDb();
  return db
    .collection<TelegramLinkRow>(TELEGRAM_LINKS)
    .findOne({ clerkUserId: userId });
}

export async function createLinkingToken(
  clerkUserId: string,
  token: string,
  expiresAt: Date
): Promise<void> {
  const db = await getDb();
  await db.collection(LINKING_TOKENS).insertOne({
    clerkUserId,
    token,
    used: false,
    expiresAt,
    createdAt: new Date(),
  });
}

export async function deleteTelegramLink(clerkUserId: string): Promise<void> {
  const db = await getDb();
  await db.collection(TELEGRAM_LINKS).deleteOne({ clerkUserId });
}

export function generateLinkTokenSecret(): string {
  return randomBytes(24).toString("hex");
}

/** Matches celpip-telegram-sync helper display names. */
export function telegramPlanDisplayName(plan: string): string {
  const n = plan.trim().toLowerCase();
  switch (n) {
    case "plus":
      return "Plus";
    case "free":
      return "Free";
    default:
      return "Free";
  }
}

export function getTelegramBotUsername(): string {
  return (
    process.env.TELEGRAM_BOT_USERNAME?.trim() || "celpippracticetestbot"
  );
}
