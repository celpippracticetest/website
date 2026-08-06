import { NextRequest, NextResponse } from "next/server";
import {
  getMinimumBuildNumber,
  getStoreUrl,
  getUpdateMessage,
  resolveMobilePlatform,
  type MobilePlatform,
} from "@/lib/mobile/appVersionPolicy";

function resolvePlatform(request: NextRequest): MobilePlatform | null {
  const platformParam = request.nextUrl.searchParams
    .get("platform")
    ?.trim()
    .toLowerCase();

  if (platformParam === "android" || platformParam === "ios") {
    return platformParam;
  }

  return resolveMobilePlatform(request.headers.get("user-agent") ?? "");
}

export async function GET(request: NextRequest) {
  const platform = resolvePlatform(request);
  if (!platform) {
    return NextResponse.json(
      { error: "platform query parameter is required (android|ios)" },
      { status: 400 },
    );
  }

  return NextResponse.json({
    minBuildNumber: getMinimumBuildNumber(platform),
    storeUrl: getStoreUrl(platform),
    message: getUpdateMessage(),
  });
}
