import documentsClient from "@/lib/appDocumentsClient";
import { ensureCmsAdmin } from "@/lib/cms/ensure-admin";
import { ProfessionPageContentSchema } from "@/models/profession-page.model";
import { ProfessionPageRepository } from "@/repositories/profession-page.repo";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ slug: string }> };

export async function GET(_request: NextRequest, context: RouteCtx) {
  try {
    const admin = await ensureCmsAdmin();
    if (!admin.ok) return admin.response;

    const { slug: raw } = await context.params;
    const slug = decodeURIComponent(raw);
    const repo = new ProfessionPageRepository(documentsClient);
    const doc = await repo.findBySlugAny(slug);
    if (!doc) {
      return NextResponse.json({ message: "Not found." }, { status: 404 });
    }
    return NextResponse.json(doc, { status: 200 });
  } catch (error) {
    console.error("[admin profession-pages slug] GET failed:", error);
    return NextResponse.json({ message: "Failed to load profession page." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteCtx) {
  try {
    const admin = await ensureCmsAdmin();
    if (!admin.ok) return admin.response;

    const { slug: raw } = await context.params;
    const slug = decodeURIComponent(raw);
    const body = await request.json().catch(() => ({}));
    const parsed = ProfessionPageContentSchema.safeParse({ ...body, slug });
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid payload.", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const repo = new ProfessionPageRepository(documentsClient);
    const updated = await repo.replaceBySlug(slug, parsed.data);
    if (!updated) {
      return NextResponse.json({ message: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update profession page.";
    console.error("[admin profession-pages slug] PATCH failed:", error);
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteCtx) {
  try {
    const admin = await ensureCmsAdmin();
    if (!admin.ok) return admin.response;

    const { slug: raw } = await context.params;
    const slug = decodeURIComponent(raw);
    const repo = new ProfessionPageRepository(documentsClient);
    const removed = await repo.deleteBySlug(slug);
    if (!removed) {
      return NextResponse.json({ message: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[admin profession-pages slug] DELETE failed:", error);
    return NextResponse.json({ message: "Failed to delete profession page." }, { status: 500 });
  }
}
