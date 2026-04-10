import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDb } from "@/lib/mongodb";
import { paypalApiCredentialsConfigured } from "@/lib/paypal/config";
import { paypalApiJson } from "@/lib/paypal/subscriptionsApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function resolveOrCreateSharedProductId(): Promise<string> {
  const fromEnv = process.env.PAYPAL_SHARED_PRODUCT_ID?.trim();
  if (fromEnv?.startsWith("PROD-")) {
    return fromEnv;
  }

  const db = await getDb();
  const existing = await db.collection("plans").findOne<{ paypalProductId?: string }>(
    { paypalProductId: { $exists: true, $type: "string" } },
    {
      projection: { paypalProductId: 1 },
      sort: { updatedAt: -1 },
    }
  );
  const fromDb = existing?.paypalProductId?.trim();
  if (fromDb?.startsWith("PROD-")) {
    return fromDb;
  }

  const created = await paypalApiJson<{ id: string }>("/v1/catalogs/products", {
    method: "POST",
    idempotencyKey:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `shared-prod-${Date.now()}`,
    body: JSON.stringify({
      name: "CELPIP Subscriptions",
      description: "Shared product for all CELPIP subscription plans",
      type: "SERVICE",
      category: "SOFTWARE",
    }),
  });
  if (!created?.id?.startsWith("PROD-")) {
    throw new Error("PayPal did not return a shared product id");
  }
  return created.id;
}

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!paypalApiCredentialsConfigured()) {
      return NextResponse.json(
        {
          error:
            "PayPal API credentials are not configured (PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET)",
        },
        { status: 503 }
      );
    }

    const paypalProductId = await resolveOrCreateSharedProductId();
    return NextResponse.json({ success: true, paypalProductId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PayPal request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

