import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import mongoClient from "@/lib/mongodb";
import { PartnerRepository } from "@/repositories/partner.repo";
import { ReferralRepository } from "@/repositories/referral.repo";
import { syncPartnerFieldsToMongoUser } from "@/lib/partner/syncPartnerFieldsToMongo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type ApplyPendingCodeKind = "partner" | "user_referral" | "none";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as { code?: string };
    const code =
      typeof body.code === "string" ? body.code.trim() : "";
    if (!code) {
      return NextResponse.json(
        { kind: "none" as ApplyPendingCodeKind },
        { status: 200 }
      );
    }

    const partnerRepo = new PartnerRepository(mongoClient);
    await partnerRepo.ensureIndexes();
    const activePartner = await partnerRepo.findActiveByCode(code);

    if (activePartner) {
      const clerk = await clerkClient();
      const user = await clerk.users.getUser(userId);
      const current = (user.publicMetadata || {}) as Record<string, unknown>;
      const partnerAttributedAt = new Date().toISOString();
      const publicMetadata = {
        ...current,
        partnerId: activePartner.id,
        partnerReferralCode: activePartner.code,
        partnerAttributedAt,
        onboardingCompleted: true,
      };

      await clerk.users.updateUserMetadata(userId, { publicMetadata });
      await syncPartnerFieldsToMongoUser(userId, publicMetadata);

      return NextResponse.json({
        kind: "partner" as ApplyPendingCodeKind,
        partnerCode: activePartner.code,
      });
    }

    const refRepo = new ReferralRepository(mongoClient);
    await refRepo.ensureIndexes();
    const referrer = await refRepo.findOneByCode(code);
    if (referrer) {
      return NextResponse.json({ kind: "user_referral" as ApplyPendingCodeKind });
    }

    return NextResponse.json({ kind: "none" as ApplyPendingCodeKind });
  } catch (e) {
    console.error("[apply-pending-code]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
