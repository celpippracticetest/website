import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedRequestContext } from "@/lib/auth/request-auth";
import { deleteTelegramLink } from "@/lib/telegramLinkDb";

export async function POST(request: NextRequest) {
  try {
    const authContext = await getAuthenticatedRequestContext(request);
    const userId = authContext?.userId;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await deleteTelegramLink(userId);
    return NextResponse.json({ success: true as const });
  } catch (e) {
    console.error("[api/telegram/unlink]", e);
    return NextResponse.json(
      { error: "Could not unlink Telegram. Try again later." },
      { status: 500 }
    );
  }
}
