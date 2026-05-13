import documentsClient from "@/lib/appDocumentsClient";
import { LeadCaptureConfigWriteSchema } from "@/models/lead-capture.model";
import { LeadCaptureConfigRepository } from "@/repositories/lead-capture-config.repo";
import { auth, currentUser, sessionClaimsHasAdminRole } from "@/lib/auth/server-auth";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function ensureAdmin() {
  const user = await currentUser();
  if (!user) {
    return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const authenticate = await auth();
  const isAdmin = sessionClaimsHasAdminRole(authenticate.sessionClaims);
  if (!isAdmin) {
    return { ok: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { ok: true as const };
}

export async function GET() {
  try {
    const admin = await ensureAdmin();
    if (!admin.ok) return admin.response;

    const repo = new LeadCaptureConfigRepository(documentsClient);
    await repo.ensureIndexes();
    const configs = await repo.getAllConfigs();

    return NextResponse.json({ ok: true, data: configs }, { status: 200 });
  } catch (error) {
    console.error("[admin lead-capture config] GET failed:", error);
    return NextResponse.json({ ok: false, error: "Failed to load config." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await ensureAdmin();
    if (!admin.ok) return admin.response;

    const payload = await request.json().catch(() => ({}));
    const parsed = LeadCaptureConfigWriteSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid config payload.", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const repo = new LeadCaptureConfigRepository(documentsClient);
    await repo.ensureIndexes();
    const created = await repo.createConfig(parsed.data);

    return NextResponse.json({ ok: true, data: created }, { status: 200 });
  } catch (error) {
    console.error("[admin lead-capture config] POST failed:", error);
    return NextResponse.json({ ok: false, error: "Failed to create config." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await ensureAdmin();
    if (!admin.ok) return admin.response;

    const payload = await request.json().catch(() => ({}));
    const { id, ...rest } = payload || {};
    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { ok: false, error: "Config id is required." },
        { status: 400 }
      );
    }

    const parsed = LeadCaptureConfigWriteSchema.safeParse(rest);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid config payload.", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const repo = new LeadCaptureConfigRepository(documentsClient);
    await repo.ensureIndexes();
    const updated = await repo.updateConfig(id, parsed.data);
    if (!updated) {
      return NextResponse.json({ ok: false, error: "Config not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: updated }, { status: 200 });
  } catch (error) {
    console.error("[admin lead-capture config] PATCH failed:", error);
    return NextResponse.json({ ok: false, error: "Failed to save config." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const admin = await ensureAdmin();
    if (!admin.ok) return admin.response;

    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Config id is required." },
        { status: 400 }
      );
    }

    const repo = new LeadCaptureConfigRepository(documentsClient);
    await repo.ensureIndexes();
    const deleted = await repo.deleteConfig(id);
    if (!deleted) {
      return NextResponse.json({ ok: false, error: "Config not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[admin lead-capture config] DELETE failed:", error);
    return NextResponse.json({ ok: false, error: "Failed to delete config." }, { status: 500 });
  }
}
