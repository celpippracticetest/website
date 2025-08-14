export const runtime = "nodejs";

// This endpoint only supports GET. Referral code is generated once and never regenerated.

import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import mongoClient from "@/lib/mongodb";
import { ReferralRepository } from "@/repositories/referral.repo";

function generateReferralCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let part = "";
  for (let i = 0; i < 6; i++)
    part += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `REF-${part}`;
}

function getBaseUrl(h: Headers) {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");
  const proto = h.get("x-forwarded-proto") || "https";
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  return `${proto}://${host}`;
}

async function getDb() {
  const repo = new ReferralRepository(mongoClient);
  await repo.ensureIndexes();
  return repo;
}

async function ensureUserReferral(userId: string, baseUrl: string) {
  const cc = await clerkClient();
  const user = await cc.users.getUser(userId);
  const pm = (user.publicMetadata || {}) as Record<string, any>;

  if (pm.referralCode && pm.referralLink) {
    return { code: String(pm.referralCode), link: String(pm.referralLink) };
  }

  const repo = await getDb();

  const existing = await repo.findOneByUserId(userId);
  if (existing) {
    const link = `${baseUrl}/?ref=${existing.code}`;
    await cc.users.updateUser(userId, {
      publicMetadata: {
        ...pm,
        referralCode: existing.code,
        referralLink: link,
        referralActive: true,
      },
    });
    return { code: existing.code, link };
  }

  let code = "";
  for (let i = 0; i < 5; i++) {
    const candidate = generateReferralCode();
    try {
      await repo.insert({ code: candidate, userId, createdAt: new Date() });
      code = candidate;
      break;
    } catch (e: any) {
      if (e?.code === 11000) continue;
      throw e;
    }
  }
  if (!code) throw new Error("Could not generate unique referral code");

  const link = `${baseUrl}/?ref=${code}`;

  await cc.users.updateUser(userId, {
    publicMetadata: {
      ...pm,
      referralCode: code,
      referralLink: link,
      referralActive: true,
    },
  });

  return { code, link };
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const h = headers();
    const base = getBaseUrl(h as unknown as Headers);
    const { code, link } = await ensureUserReferral(userId, base);

    return NextResponse.json({ code, link });
  } catch (err: any) {
    console.error("[GET /api/referrals]", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
