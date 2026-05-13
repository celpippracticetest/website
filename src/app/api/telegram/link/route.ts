import { NextRequest, NextResponse } from "next/server";
import { appUserAdmin } from "@/lib/auth/server-auth";
import { getAuthenticatedRequestContext } from "@/lib/auth/request-auth";
import {
  getTelegramLinkByUserId,
  getTelegramBotUsername,
  telegramPlanDisplayName,
} from "@/lib/telegramLinkDb";
import { hasPaidPracticeAccess } from "@/lib/subscriptionAccess";

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthenticatedRequestContext(request);
    const userId = authContext?.userId;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const botUsername = getTelegramBotUsername();

    const link = await getTelegramLinkByUserId(userId);
    if (!link) {
      return NextResponse.json({ linked: false as const, botUsername });
    }

    const client = await appUserAdmin();
    const user = await client.users.getUser(userId);
    const meta = (user.publicMetadata ?? {}) as Record<string, unknown>;
    const plan = String(meta.plan ?? "free");
    const purchaseDate = meta.purchaseDate;

    return NextResponse.json({
      linked: true as const,
      botUsername,
      telegramUsername: link.telegramUsername ?? null,
      linkedAt: link.linkedAt.toISOString(),
      planDisplay: telegramPlanDisplayName(plan),
      isPremium: hasPaidPracticeAccess(plan, purchaseDate),
    });
  } catch (e) {
    console.error("[api/telegram/link]", e);
    return NextResponse.json(
      { error: "Failed to load Telegram link status" },
      { status: 500 }
    );
  }
}
