import mongoClient from "@/lib/mongodb";
import { LeadCaptureConfigRepository } from "@/repositories/lead-capture-config.repo";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const repo = new LeadCaptureConfigRepository(mongoClient);
    await repo.ensureIndexes();
    const configs = await repo.getPublicConfigs();

    return NextResponse.json({ ok: true, data: configs }, { status: 200 });
  } catch (error) {
    console.error("[lead-capture-config] failed to fetch config:", error);
    return NextResponse.json(
      { ok: false, message: "Failed to load lead capture configuration." },
      { status: 500 }
    );
  }
}
