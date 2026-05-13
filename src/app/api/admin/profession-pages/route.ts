import documentsClient from "@/lib/appDocumentsClient";
import { ensureCmsAdmin } from "@/lib/cms/ensure-admin";
import { ProfessionPageContentSchema } from "@/models/profession-page.model";
import { ProfessionPageRepository } from "@/repositories/profession-page.repo";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = await ensureCmsAdmin();
    if (!admin.ok) return admin.response;

    const repo = new ProfessionPageRepository(documentsClient);
    await repo.ensureSlugIndex();
    const items = await repo.listAllForAdmin();
    return NextResponse.json({ items, totalItems: items.length }, { status: 200 });
  } catch (error) {
    console.error("[admin profession-pages] GET failed:", error);
    return NextResponse.json({ message: "Failed to load profession pages." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await ensureCmsAdmin();
    if (!admin.ok) return admin.response;

    const body = await request.json().catch(() => ({}));
    const parsed = ProfessionPageContentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid payload.", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const repo = new ProfessionPageRepository(documentsClient);
    await repo.ensureSlugIndex();
    await repo.create(parsed.data);
    return NextResponse.json({ ok: true, slug: parsed.data.slug }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create profession page.";
    console.error("[admin profession-pages] POST failed:", error);
    const status = message.includes("already exists") ? 409 : 500;
    return NextResponse.json({ message }, { status });
  }
}
