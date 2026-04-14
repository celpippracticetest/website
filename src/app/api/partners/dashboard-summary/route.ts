import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import mongoClient from "@/lib/mongodb";
import { PartnerRepository } from "@/repositories/partner.repo";
import { PartnerCommissionRepository } from "@/repositories/partner-commission.repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const partnerRepo = new PartnerRepository(mongoClient);
    await partnerRepo.ensureIndexes();
    const partner = await partnerRepo.findByClerkUserId(userId);
    if (!partner) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    const commissionRepo = new PartnerCommissionRepository(mongoClient);
    await commissionRepo.ensureIndexes();
    const commissions = await commissionRepo.findByPartnerId(partner.id);
    const totals = await commissionRepo.aggregateTotalsForPartner(partner.id);

    const db = mongoClient.db();
    const referred = await db
      .collection("users")
      .find(
        {
          $or: [
            { partnerId: partner.id },
            { "publicMetadata.partnerId": partner.id },
          ],
        },
        {
          projection: {
            clerkUserId: 1,
            purchaseAmount: 1,
            purchaseCurrency: 1,
            plan: 1,
            hasEverPurchased: 1,
            partnerAttributedAt: 1,
            updatedAt: 1,
          },
        }
      )
      .sort({ updatedAt: -1 })
      .limit(200)
      .toArray();

    return NextResponse.json({
      partner,
      commissions,
      totals,
      referredUsers: referred.map((u) => ({
        clerkUserId: u.clerkUserId,
        purchaseAmount: u.purchaseAmount,
        purchaseCurrency: u.purchaseCurrency,
        plan: u.plan,
        hasEverPurchased: u.hasEverPurchased,
        partnerAttributedAt: u.partnerAttributedAt,
      })),
    });
  } catch (e) {
    console.error("[partners/dashboard-summary]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
