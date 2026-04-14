import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import mongoClient from "@/lib/mongodb";
import { PartnerRepository } from "@/repositories/partner.repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  payoutEmail: z.string().email(),
});

export async function PATCH(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid email", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const partnerRepo = new PartnerRepository(mongoClient);
    await partnerRepo.ensureIndexes();
    const updated = await partnerRepo.updatePayoutEmail(
      userId,
      parsed.data.payoutEmail
    );
    if (!updated) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, partner: updated });
  } catch (e) {
    console.error("[partners/payout-email]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
