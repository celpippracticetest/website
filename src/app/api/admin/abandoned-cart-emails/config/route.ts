import { auth, currentUser } from "@/lib/auth/server-auth";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/appDocumentsClient";
import {
  ABANDONED_CART_EMAIL_CONFIG_COLLECTION,
  ABANDONED_CART_EMAIL_CONFIG_KEY,
  AbandonedCartEmailConfigWriteSchema,
  buildAbandonedCartEmailConfigWithDefaults,
} from "@/lib/abandoned-cart-email/config";

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
  const roles = authenticate.sessionClaims?.metadata?.roles;
  const isAdmin = Array.isArray(roles) && roles.some((r) => r === "admin");
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
    const col = db.collection(ABANDONED_CART_EMAIL_CONFIG_COLLECTION);
    const doc = await col.findOne({ configKey: ABANDONED_CART_EMAIL_CONFIG_KEY });
    const resolved = buildAbandonedCartEmailConfigWithDefaults(doc?.config || null);

    return NextResponse.json({ ok: true, data: resolved }, { status: 200 });
  } catch (error) {
    console.error("[admin abandoned-cart-emails config] GET failed:", error);
    return NextResponse.json({ ok: false, error: "Failed to load config." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await ensureAdmin();
    if (!admin.ok) return admin.response;

    const payload = await request.json().catch(() => ({}));
    const parsed = AbandonedCartEmailConfigWriteSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid config payload.", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const db = await getDb();
    const col = db.collection(ABANDONED_CART_EMAIL_CONFIG_COLLECTION);
    const now = new Date();

    await col.updateOne(
      { configKey: ABANDONED_CART_EMAIL_CONFIG_KEY },
      {
        $set: {
          configKey: ABANDONED_CART_EMAIL_CONFIG_KEY,
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
    console.error("[admin abandoned-cart-emails config] PATCH failed:", error);
    return NextResponse.json({ ok: false, error: "Failed to save config." }, { status: 500 });
  }
}
