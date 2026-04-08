import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedRequestContext } from "@/lib/auth/request-auth";
import {
  createLinkingToken,
  generateLinkTokenSecret,
  getTelegramBotUsername,
} from "@/lib/telegramLinkDb";

const TOKEN_TTL_MS = 10 * 60 * 1000;

export async function POST(_request: NextRequest) {
  try {
    const authContext = await getAuthenticatedRequestContext(_request);
    const userId = authContext?.userId;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = generateLinkTokenSecret();
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
    await createLinkingToken(userId, token, expiresAt);

    const bot = getTelegramBotUsername();
    const deepLink = `https://t.me/${bot}?start=link_${token}`;

    return NextResponse.json({
      token,
      expiresAt: expiresAt.toISOString(),
      botUsername: bot,
      deepLink,
    });
  } catch (e) {
    console.error("[api/telegram/link-token]", e);
    return NextResponse.json(
      { error: "Could not create Telegram link. Try again later." },
      { status: 500 }
    );
  }
}
