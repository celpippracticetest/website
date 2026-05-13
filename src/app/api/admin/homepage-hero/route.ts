import documentsClient from "@/lib/appDocumentsClient";
import { HomepageHeroScheduleWriteSchema } from "@/models/homepage-hero-schedule.model";
import { HomepageHeroScheduleRepository } from "@/repositories/homepage-hero-schedule.repo";
import { auth, currentUser, sessionClaimsHasAdminRole } from "@/lib/auth/server-auth";
import { NextRequest, NextResponse } from "next/server";

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
  const isAdmin = sessionClaimsHasAdminRole(authenticate.sessionClaims);
  if (!isAdmin) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true as const };
}

export async function GET() {
  try {
    const admin = await ensureAdmin();
    if (!admin.ok) return admin.response;

    const repo = new HomepageHeroScheduleRepository(documentsClient);
    await repo.ensureIndexes();
    const schedules = await repo.getAllSchedules();

    return NextResponse.json({ ok: true, data: schedules }, { status: 200 });
  } catch (error) {
    console.error("[admin homepage-hero] GET failed:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to load homepage hero schedules." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await ensureAdmin();
    if (!admin.ok) return admin.response;

    const payload = await request.json().catch(() => ({}));
    const parsed = HomepageHeroScheduleWriteSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid homepage hero schedule payload.",
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const repo = new HomepageHeroScheduleRepository(documentsClient);
    await repo.ensureIndexes();
    const created = await repo.createSchedule(parsed.data);

    return NextResponse.json({ ok: true, data: created }, { status: 200 });
  } catch (error) {
    console.error("[admin homepage-hero] POST failed:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to create homepage hero schedule." },
      { status: 500 }
    );
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
        { ok: false, error: "Schedule id is required." },
        { status: 400 }
      );
    }

    const parsed = HomepageHeroScheduleWriteSchema.safeParse(rest);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid homepage hero schedule payload.",
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const repo = new HomepageHeroScheduleRepository(documentsClient);
    await repo.ensureIndexes();
    const updated = await repo.updateSchedule(id, parsed.data);
    if (!updated) {
      return NextResponse.json(
        { ok: false, error: "Schedule not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: updated }, { status: 200 });
  } catch (error) {
    console.error("[admin homepage-hero] PATCH failed:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to save homepage hero schedule." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const admin = await ensureAdmin();
    if (!admin.ok) return admin.response;

    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Schedule id is required." },
        { status: 400 }
      );
    }

    const repo = new HomepageHeroScheduleRepository(documentsClient);
    await repo.ensureIndexes();
    const deleted = await repo.deleteSchedule(id);
    if (!deleted) {
      return NextResponse.json(
        { ok: false, error: "Schedule not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[admin homepage-hero] DELETE failed:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to delete homepage hero schedule." },
      { status: 500 }
    );
  }
}
