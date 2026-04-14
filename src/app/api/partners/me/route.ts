import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import mongoClient from "@/lib/mongodb";
import { PartnerRepository } from "@/repositories/partner.repo";

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
      return NextResponse.json({ partner: null }, { status: 200 });
    }

    return NextResponse.json({ partner });
  } catch (e) {
    console.error("[partners/me]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
