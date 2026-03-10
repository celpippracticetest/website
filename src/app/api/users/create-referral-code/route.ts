import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import mongoClient from "@/lib/mongodb";
import { ReferralRepository } from "@/repositories/referral.repo";
import { randomInt } from "crypto";
import { getPostHogClient } from "@/lib/posthog-server";

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

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const h = await headers();
    const baseUrl = getBaseUrl(h);

    // Get user from Clerk
    const cc = await clerkClient();
    const user = await cc.users.getUser(userId);
    const pm = (user.publicMetadata || {}) as Record<string, any>;

    // Check if user already has a referral code
    if (pm.referralCode && pm.referralLink) {
      return NextResponse.json({
        success: true,
        message: "User already has referral code",
        code: pm.referralCode,
        link: pm.referralLink
      });
    }

    // Check if referral code exists in database
    const referralRepo = new ReferralRepository(mongoClient);
    await referralRepo.ensureIndexes();

    const existingCode = await referralRepo.findOneByUserId(userId);
    if (existingCode) {
      // Update Clerk metadata with existing code
      const inviterNameOrEmail = 
        (user.firstName && user.lastName
          ? `${user.firstName} ${user.lastName}`
          : user.firstName
          ? user.firstName
          : user.emailAddresses?.[0]?.emailAddress) || userId;
      
      const link = `${baseUrl}/referral/?ref=${existingCode.code}&inviter=${encodeURIComponent(inviterNameOrEmail)}`;
      
      await cc.users.updateUser(userId, {
        publicMetadata: {
          ...pm,
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
    const inviterNameOrEmail = 
      (user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : user.firstName
        ? user.firstName
        : user.emailAddresses?.[0]?.emailAddress) || userId;
    
    const link = `${baseUrl}/referral/?ref=${code}&inviter=${encodeURIComponent(inviterNameOrEmail)}`;

    // Update Clerk metadata
    await cc.users.updateUser(userId, {
      publicMetadata: {
        ...pm,
        referralCode: code,
        referralActive: true,
      },
    });

    try {
      const posthog = getPostHogClient();
      posthog.capture({
        distinctId: userId,
        event: "referral_code_created",
        properties: { referral_code: code },
      });
      await posthog.shutdown();
    } catch (phErr) {
      console.error("PostHog referral_code_created tracking failed:", phErr);
    }

    return NextResponse.json({
      success: true,
      message: "Referral code created successfully",
      code: code,
      link: link
    });

  } catch (error: any) {
    console.error("Create referral code error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
