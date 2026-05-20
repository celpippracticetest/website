import { auth, currentUser, sessionClaimsHasAdminRole } from "@/lib/auth/server-auth";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/appDocumentsClient";
import {
  buildNurtureEmailConfigWithDefaults,
  NURTURE_EMAIL_CONFIG_COLLECTION,
  NURTURE_EMAIL_CONFIG_KEY,
  NurtureEmailConfigWriteSchema,
} from "@/lib/nurture-email/config";

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

    const db = await getDb();
    const configCollection = db.collection(NURTURE_EMAIL_CONFIG_COLLECTION);
    const doc = await configCollection.findOne({ configKey: NURTURE_EMAIL_CONFIG_KEY });
    const resolved = buildNurtureEmailConfigWithDefaults(doc?.config || null);

    return NextResponse.json(
      {
        ok: true,
        data: resolved,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[admin nurture email config] GET failed:", error);
    return NextResponse.json({ ok: false, error: "Failed to load config." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await ensureAdmin();
    if (!admin.ok) return admin.response;

    const payload = await request.json().catch(() => ({}));
    const parsed = NurtureEmailConfigWriteSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid config payload.", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const db = await getDb();
    const configCollection = db.collection(NURTURE_EMAIL_CONFIG_COLLECTION);
    const now = new Date();

    await configCollection.updateOne(
      { configKey: NURTURE_EMAIL_CONFIG_KEY },
      {
        $set: {
          configKey: NURTURE_EMAIL_CONFIG_KEY,
          config: parsed.data,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true }
    );

    const resolved = buildNurtureEmailConfigWithDefaults(parsed.data);
    return NextResponse.json({ ok: true, data: resolved }, { status: 200 });
  } catch (error) {
    console.error("[admin nurture email config] PATCH failed:", error);
    return NextResponse.json({ ok: false, error: "Failed to save config." }, { status: 500 });
  }
}
