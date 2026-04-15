import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth, currentUser } from "@clerk/nextjs/server";
import mongoClient from "@/lib/mongodb";
import { PartnerRepository } from "@/repositories/partner.repo";
import { PartnerProgramSettingsRepository } from "@/repositories/partner-program-settings.repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function ensureAdmin() {
  const user = await currentUser();
  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const authenticate = await auth();
  const isAdmin = authenticate.sessionClaims?.metadata?.roles?.includes("admin");
  if (!isAdmin) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true as const };
}

export async function GET() {
  const admin = await ensureAdmin();
  if (!admin.ok) return admin.response;

  try {
    const repo = new PartnerRepository(mongoClient);
    await repo.ensureIndexes();
    const partners = await repo.listAll();
    const settingsRepo = new PartnerProgramSettingsRepository(mongoClient);
    const programDefaults = await settingsRepo.getDefaults();
    return NextResponse.json({ ok: true, partners, programDefaults });
  } catch (e) {
    console.error("[admin/partners GET]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

const ProgramDefaultsSchema = z.object({
  referredDiscountPercent: z.number().min(0).max(100),
  partnerCommissionPercent: z.number().min(0).max(100),
});

const PatchProgramSchema = z.object({
  programDefaults: ProgramDefaultsSchema,
});

const PatchPartnerSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["pending", "active", "suspended"]).optional(),
  referredDiscountPercent: z.number().min(0).max(100).nullable().optional(),
  commissionPercent: z.number().min(0).max(100).nullable().optional(),
});

export async function PATCH(req: NextRequest) {
  const admin = await ensureAdmin();
  if (!admin.ok) return admin.response;

  try {
    const raw = await req.json().catch(() => ({}));
    const programParsed = PatchProgramSchema.safeParse(raw);
    if (programParsed.success) {
      const settingsRepo = new PartnerProgramSettingsRepository(mongoClient);
      const programDefaults = await settingsRepo.setDefaults(
        programParsed.data.programDefaults
      );
      return NextResponse.json({ ok: true, programDefaults });
    }

    const parsed = PatchPartnerSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (
      parsed.data.status === undefined &&
      parsed.data.referredDiscountPercent === undefined &&
      parsed.data.commissionPercent === undefined
    ) {
      return NextResponse.json(
        { error: "Nothing to update" },
        { status: 400 }
      );
    }

    const repo = new PartnerRepository(mongoClient);
    await repo.ensureIndexes();

    if (parsed.data.status !== undefined) {
      const updated = await repo.updateStatusById(
        parsed.data.id,
        parsed.data.status
      );
      if (!updated) {
        return NextResponse.json({ error: "Partner not found" }, { status: 404 });
      }
    }

    if (
      parsed.data.referredDiscountPercent !== undefined ||
      parsed.data.commissionPercent !== undefined
    ) {
      const updated = await repo.updateRatesById(parsed.data.id, {
        referredDiscountPercent: parsed.data.referredDiscountPercent,
        commissionPercent: parsed.data.commissionPercent,
      });
      if (!updated) {
        return NextResponse.json({ error: "Partner not found" }, { status: 404 });
      }
    }

    const partner = await repo.findById(parsed.data.id);
    if (!partner) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, partner });
  } catch (e) {
    console.error("[admin/partners PATCH]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
