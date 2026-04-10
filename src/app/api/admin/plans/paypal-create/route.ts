import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@clerk/nextjs/server";
import { getDb } from "@/lib/mongodb";
import type { Plan } from "@/models/plans.model";
import { paypalApiCredentialsConfigured } from "@/lib/paypal/config";
import { createPayPalProductAndBillingPlan } from "@/lib/paypal/billingPlans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!paypalApiCredentialsConfigured()) {
      return NextResponse.json(
        { error: "PayPal API credentials are not configured (PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET)" },
        { status: 503 }
      );
    }

    const body = (await req.json().catch(() => null)) as { planId?: string } | null;
    const planId = typeof body?.planId === "string" ? body.planId.trim() : "";
    if (!planId || !ObjectId.isValid(planId)) {
      return NextResponse.json({ error: "Valid planId is required" }, { status: 400 });
    }

    const db = await getDb();
    const plan = await db.collection("plans").findOne<Plan>({ _id: new ObjectId(planId) });

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    if (!plan.stripePriceId?.trim()) {
      return NextResponse.json(
        {
          error:
            "This plan needs a Stripe price ID first. Save the plan so Stripe is linked, then create the PayPal plan.",
        },
        { status: 400 }
      );
    }

    const { paypalProductId, paypalPlanId } = await createPayPalProductAndBillingPlan(plan);

    await db.collection("plans").updateOne(
      { _id: plan._id },
      {
        $set: {
          paypalProductId,
          paypalPlanId,
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      paypalProductId,
      paypalPlanId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PayPal request failed";
    console.error("[admin/paypal-create]", error);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
