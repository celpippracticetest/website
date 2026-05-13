import { NextResponse } from "next/server";
import { auth, currentUser } from "@/lib/auth/server-auth";
import documentsClient from "@/lib/appDocumentsClient";
import { PartnerRepository } from "@/repositories/partner.repo";
import { generateUniquePartnerCode } from "@/lib/partner/generatePartnerCode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const partnerRepo = new PartnerRepository(documentsClient);
    await partnerRepo.ensureIndexes();

    const existing = await partnerRepo.findByWebUserId(userId);
    if (existing) {
      return NextResponse.json({ ok: true, partner: existing });
    }

    const user = await currentUser();
    const email =
      user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase() || "";
    if (!email) {
      return NextResponse.json(
        { error: "User has no primary email" },
        { status: 400 }
      );
    }

    const code = await generateUniquePartnerCode();
    const partner = await partnerRepo.insertPartner({
      code,
      webUserId: userId,
      payoutEmail: email,
      status: "active",
    });

    return NextResponse.json({ ok: true, partner });
  } catch (e) {
    console.error("[partners/register]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
