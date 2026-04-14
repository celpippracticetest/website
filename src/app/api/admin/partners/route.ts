import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth, currentUser } from "@clerk/nextjs/server";
import mongoClient from "@/lib/mongodb";
import { PartnerRepository } from "@/repositories/partner.repo";

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
    return NextResponse.json({ ok: true, partners });
  } catch (e) {
    console.error("[admin/partners GET]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

const PatchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["pending", "active", "suspended"]),
});

export async function PATCH(req: NextRequest) {
  const admin = await ensureAdmin();
  if (!admin.ok) return admin.response;

  try {
    const parsed = PatchSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const repo = new PartnerRepository(mongoClient);
    await repo.ensureIndexes();
    const updated = await repo.updateStatusById(
      parsed.data.id,
      parsed.data.status
    );
    if (!updated) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, partner: updated });
  } catch (e) {
    console.error("[admin/partners PATCH]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
