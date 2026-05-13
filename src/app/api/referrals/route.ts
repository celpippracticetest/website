export const runtime = "nodejs";

// This endpoint only supports GET. Referral code is generated once and never regenerated.

import { NextResponse } from "next/server";
import { auth, appUserAdmin } from "@/lib/auth/server-auth";
import { headers } from "next/headers";
import documentsClient from "@/lib/appDocumentsClient";
import { ReferralRepository } from "@/repositories/referral.repo";

function getBaseUrl(h: { get(name: string): string | null }) {
  const envUrl = process.env.APP_BASE_URL;
  if (envUrl) {
    try {
      const url = new URL(envUrl);
      url.hostname = url.hostname.replace(/^www\./, "");
      return url.toString().replace(/\/$/, "");
    } catch {
      // fallback if envUrl is not a valid URL
      return envUrl.replace(/^www\./, "").replace(/\/$/, "");
    }
  }
  const proto = h.get("x-forwarded-proto") || "https";
  let host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  host = host.replace(/^www\./, "");
  return `${proto}://${host}`;
}

async function getDb() {
  const repo = new ReferralRepository(documentsClient);
  await repo.ensureIndexes();
  return repo;
}

function buildReferralLink(
  baseUrl: string,
  code: string,
  user: { firstName?: string | null; lastName?: string | null; emailAddresses?: { emailAddress: string }[]; id: string }
): string {
  const inviterNameOrEmail =
    (user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.firstName
      ? user.firstName
      : user.emailAddresses?.[0]?.emailAddress) || user.id;
  return `${baseUrl}/referral/?ref=${code}&inviter=${encodeURIComponent(inviterNameOrEmail)}`;
}

export async function ensureUserReferral(userId: string, baseUrl: string) {
  const cc = await appUserAdmin();
  const user = await cc.users.getUser(userId);
  const pm = (user.publicMetadata || {}) as Record<string, any>;

  // If user already has a referral code, reconstruct the link on-the-fly
  if (pm.referralCode) {
    const link = buildReferralLink(baseUrl, String(pm.referralCode), user);
    return { code: String(pm.referralCode), link };
  }

  // Check if referral code exists in database
  const repo = await getDb();
  const existing = await repo.findOneByUserId(userId);

  if (existing) {
    const link = buildReferralLink(baseUrl, existing.code, user);

    // Sync referralCode back to auth directory metadata (without referralLink to keep JWT small)
    await cc.users.updateUser(userId, {
      publicMetadata: {
        ...pm,
        referralCode: existing.code,
        referralActive: true,
      },
    });

    return { code: existing.code, link };
  }

  throw new Error(
    "No referral code found. Please contact support to create one."
  );
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const h = await headers();
    const base = getBaseUrl(h);
    const { code, link } = await ensureUserReferral(userId, base);

    return NextResponse.json(
      { code, link },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err: any) {
    console.error("[GET /api/referrals]", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
