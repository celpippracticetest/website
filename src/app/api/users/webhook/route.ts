import { NextRequest, NextResponse } from "next/server";
import { sendSignupConversionEvents } from "@/lib/signupConversions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WEBHOOK_SECRET =
  process.env.SUPABASE_WEBHOOK_SECRET?.trim() ||
  process.env.SUPABASE_AUTH_WEBHOOK_SECRET?.trim() ||
  process.env.USERS_WEBHOOK_SECRET?.trim();

type SupabaseAuthUserRecord = {
  id?: string;
  email?: string | null;
  created_at?: string;
  raw_user_meta_data?: Record<string, unknown> | null;
  raw_app_meta_data?: Record<string, unknown> | null;
};

function verifyWebhookSecret(req: NextRequest): boolean {
  if (!WEBHOOK_SECRET) {
    console.error(
      "[users/webhook] SUPABASE_WEBHOOK_SECRET (or SUPABASE_AUTH_WEBHOOK_SECRET / USERS_WEBHOOK_SECRET) not set"
    );
    return false;
  }
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${WEBHOOK_SECRET}`) return true;
  const header = req.headers.get("x-webhook-secret");
  return header === WEBHOOK_SECRET;
}

function inferSignupMethodFromRecord(record: SupabaseAuthUserRecord): string {
  const provider = String(record.raw_app_meta_data?.provider ?? "").toLowerCase();
  if (provider.includes("google")) return "google";
  const identities = record.raw_app_meta_data?.providers;
  if (Array.isArray(identities) && identities.length > 0) {
    const first = String(identities[0] ?? "").toLowerCase();
    if (first.includes("google")) return "google";
    return first.replace(/^oauth_/, "").slice(0, 32) || "oauth";
  }
  return "email";
}

function parseSupabaseUserCreated(
  body: Record<string, unknown>
): SupabaseAuthUserRecord | null {
  if (body.type === "user.created" && body.data && typeof body.data === "object") {
    return body.data as SupabaseAuthUserRecord;
  }

  if (body.type === "INSERT" && body.record && typeof body.record === "object") {
    const record = body.record as SupabaseAuthUserRecord;
    if (body.table === "users" || body.schema === "auth") return record;
  }

  if (body.user && typeof body.user === "object") {
    return body.user as SupabaseAuthUserRecord;
  }

  return null;
}

async function handleUserCreated(record: SupabaseAuthUserRecord): Promise<void> {
  const userId = record.id?.trim();
  if (!userId) return;

  const email = record.email?.trim() || null;
  await sendSignupConversionEvents({
    userId,
    email,
    method: inferSignupMethodFromRecord(record),
  });
}

/** Supabase Auth / DB webhook: GA4 MP `sign_up` + Meta CompleteRegistration. */
export async function POST(req: NextRequest) {
  try {
    if (!verifyWebhookSecret(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const record = parseSupabaseUserCreated(body);
    if (record) {
      await handleUserCreated(record);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[users/webhook] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
