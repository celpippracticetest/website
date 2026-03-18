import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import {
  buildReminderEmailConfigWithDefaults,
  REMINDER_EMAIL_CONFIG_COLLECTION,
  REMINDER_EMAIL_CONFIG_KEY,
  ReminderEmailConfigWriteSchema,
} from "@/lib/reminder-email/config";

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
  try {
    const admin = await ensureAdmin();
    if (!admin.ok) return admin.response;

    const db = await getDb();
    const configCollection = db.collection(REMINDER_EMAIL_CONFIG_COLLECTION);
    const doc = await configCollection.findOne({ configKey: REMINDER_EMAIL_CONFIG_KEY });
    const resolved = buildReminderEmailConfigWithDefaults(doc?.config || null);

    return NextResponse.json(
      {
        ok: true,
        data: resolved,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[admin reminder email config] GET failed:", error);
    return NextResponse.json({ ok: false, error: "Failed to load config." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await ensureAdmin();
    if (!admin.ok) return admin.response;

    const payload = await request.json().catch(() => ({}));
    const parsed = ReminderEmailConfigWriteSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid config payload.", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const db = await getDb();
    const configCollection = db.collection(REMINDER_EMAIL_CONFIG_COLLECTION);
    const now = new Date();

    await configCollection.updateOne(
      { configKey: REMINDER_EMAIL_CONFIG_KEY },
      {
        $set: {
          configKey: REMINDER_EMAIL_CONFIG_KEY,
          config: parsed.data,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ ok: true, data: parsed.data }, { status: 200 });
  } catch (error) {
    console.error("[admin reminder email config] PATCH failed:", error);
    return NextResponse.json({ ok: false, error: "Failed to save config." }, { status: 500 });
  }
}

