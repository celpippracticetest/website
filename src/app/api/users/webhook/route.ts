import { NextRequest, NextResponse } from "next/server";
import { TrackClient, RegionUS } from "customerio-node";
import { ensureUserReferral } from "@/app/api/referrals/route";
import documentsClient from "@/lib/appDocumentsClient";
import { sendGa4Events } from "@/lib/ga4MeasurementProtocol";
import {
  matchUsersCollectionByWebUserIds,
  usersCollectionEmailSetFromAuthUser,
  usersCollectionSetOnInsertFromAuthUser,
} from "@/lib/users/userDocumentIdentity";

const WEBHOOK_SECRET =
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
    console.error("[users/webhook] SUPABASE_AUTH_WEBHOOK_SECRET (or USERS_WEBHOOK_SECRET) not set");
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

function authUserShapeFromRecord(record: SupabaseAuthUserRecord) {
  const meta = record.raw_user_meta_data ?? {};
  const email = record.email?.trim() ?? "";
  const firstName =
    (typeof meta.given_name === "string" && meta.given_name) ||
    (typeof meta.first_name === "string" && meta.first_name) ||
    (typeof meta.firstName === "string" && meta.firstName) ||
    null;
  const lastName =
    (typeof meta.family_name === "string" && meta.family_name) ||
    (typeof meta.last_name === "string" && meta.last_name) ||
    (typeof meta.lastName === "string" && meta.lastName) ||
    null;
  const imageUrl =
    (typeof meta.avatar_url === "string" && meta.avatar_url) ||
    (typeof meta.picture === "string" && meta.picture) ||
    null;

  return {
    primaryEmailAddress: email ? { emailAddress: email } : null,
    emailAddresses: email ? [{ emailAddress: email }] : [],
    firstName,
    lastName,
    imageUrl,
  };
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

async function handleUserCreated(
  record: SupabaseAuthUserRecord,
  req: NextRequest
): Promise<void> {
  const userId = record.id?.trim();
  if (!userId) return;

  const authUser = authUserShapeFromRecord(record);
  const email = authUser.primaryEmailAddress?.emailAddress ?? null;

  try {
    const usersCollection = documentsClient.db().collection("users");
    const publicMetadata = {
      plan: "free",
      planType: null,
    };
    await usersCollection.updateOne(
      matchUsersCollectionByWebUserIds(userId),
      {
        $set: {
          ...usersCollectionEmailSetFromAuthUser(authUser),
          publicMetadata,
          plan: "free",
          planType: null,
          updatedAt: new Date(),
        },
        $setOnInsert: usersCollectionSetOnInsertFromAuthUser(userId, authUser),
      },
      { upsert: true }
    );
  } catch (dbErr) {
    console.error("[users/webhook] Failed to sync user document:", dbErr);
  }

  if (email) {
    try {
      const cio = new TrackClient(
        process.env.CUSTOMERIO_SITE_ID?.trim() || "05f16cff56799907a78d",
        process.env.CUSTOMERIO_API_KEY?.trim() || "d1d97f495f9f326a8163",
        { region: RegionUS }
      );
      const createdAt = record.created_at
        ? Math.floor(new Date(record.created_at).getTime() / 1000)
        : Math.floor(Date.now() / 1000);
      await cio.identify(userId, { email, created_at: createdAt });
    } catch (cioError) {
      console.error("[users/webhook] Customer.io identify error:", cioError);
    }
  }

  try {
    const baseUrl = req.nextUrl.origin;
    await ensureUserReferral(userId, baseUrl);
  } catch (ensureErr) {
    console.error("[users/webhook] ensureUserReferral failed:", ensureErr);
  }

  const meta = record.raw_user_meta_data ?? {};
  const referralCode =
    (meta.ref as string | undefined) ||
    (meta.referral as string | undefined) ||
    (meta.code as string | undefined) ||
    (meta.referralCode as string | undefined);

  if (referralCode) {
    try {
      await fetch(`${req.nextUrl.origin}/api/referrals/track-signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referralCode, inviteeId: userId }),
      });
    } catch (refErr) {
      console.error("[users/webhook] Referral signup tracking failed:", refErr);
    }
  }

  void sendGa4Events({
    clientId: userId,
    userId,
    events: [
      {
        name: "sign_up",
        params: { method: inferSignupMethodFromRecord(record) },
      },
    ],
  });
}

/** Supabase Auth / DB webhook: provision user doc, referrals, optional GA4 MP `sign_up`. */
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
      await handleUserCreated(record, req);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[users/webhook] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
