import { NextResponse } from "next/server";
import { auth, appUserAdmin } from "@/lib/auth/server-auth";
import { headers } from "next/headers";
import documentsClient from "@/lib/appDocumentsClient";
import { ReferralRepository } from "@/repositories/referral.repo";
import { randomInt } from "crypto";

function generateReferralCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let part = "";
  for (let i = 0; i < 6; i++) {
    part += alphabet[randomInt(alphabet.length)];
  }
  return `REF-${part}`;
}

function getBaseUrl(h: { get(name: string): string | null }) {
  const envUrl = process.env.APP_BASE_URL;
  if (envUrl) {
    try {
      const url = new URL(envUrl);
      url.hostname = url.hostname.replace(/^www\./, "");
      return url.toString().replace(/\/$/, "");
    } catch {
      return envUrl.replace(/^www\./, "").replace(/\/$/, "");
    }
  }
  const proto = h.get("x-forwarded-proto") || "https";
  let host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  host = host.replace(/^www\./, "");
  return `${proto}://${host}`;
}

function isAuthDirectoryRateLimited(error: unknown): error is { status: number; retryAfter?: number } {
  if (!error || typeof error !== "object") return false;
  const maybe = error as { status?: unknown; retryAfter?: unknown };
  return maybe.status === 429;
}

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const h = await headers();
    const baseUrl = getBaseUrl(h);

    // Check if referral code exists in database
    const referralRepo = new ReferralRepository(documentsClient);
    await referralRepo.ensureIndexes();

    const existingCode = await referralRepo.findOneByUserId(userId);
    if (existingCode) {
      const link = `${baseUrl}/referral/?ref=${existingCode.code}&inviter=${encodeURIComponent(userId)}`;

      const cc = await appUserAdmin();
      await cc.users.updateUserMetadata(userId, {
        publicMetadata: {
          referralCode: existingCode.code,
          referralActive: true,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Referral code restored from database",
        code: existingCode.code,
        link: link
      });
    }

    // Generate new referral code
    let code = "";
    for (let i = 0; i < 5; i++) {
      const candidate = generateReferralCode();
      try {
        await referralRepo.insert({ 
          code: candidate, 
          userId, 
          createdAt: new Date() 
        });
        code = candidate;
        break;
      } catch (e: any) {
        if (e?.code === 11000) continue; // Duplicate key error
        throw e;
      }
    }

    if (!code) {
      throw new Error("Could not generate unique referral code");
    }

    // Create referral link
    const link = `${baseUrl}/referral/?ref=${code}&inviter=${encodeURIComponent(userId)}`;

    // Update auth directory metadata
    const cc = await appUserAdmin();
    await cc.users.updateUserMetadata(userId, {
      publicMetadata: {
        referralCode: code,
        referralActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Referral code created successfully",
      code: code,
      link: link
    });

  } catch (error: any) {
    console.error("Create referral code error:", error);
    if (isAuthDirectoryRateLimited(error)) {
      return NextResponse.json(
        { error: "Auth directory rate limit", retryAfter: error.retryAfter ?? 10 },
        { status: 429 },
      );
    }
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
