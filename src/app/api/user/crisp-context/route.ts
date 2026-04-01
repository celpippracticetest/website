import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { getAuthenticatedRequestContext } from "@/lib/auth/request-auth";
import {
  emailsFromClerkUser,
  resolveStripeCustomerId,
} from "@/lib/resolveStripeCustomerId";
import { getDb } from "@/lib/mongodb";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/**
 * Consolidated context for Crisp `session:data` (plan, tokens, subscription, etc.).
 */
export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthenticatedRequestContext(request);
    const userId = authContext?.userId;
    if (!userId || !authContext?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const meta = (user.publicMetadata || {}) as Record<string, unknown>;

    const db = await getDb();
    const tokenAgg = await db
      .collection("useractivities")
      .aggregate<{ prompt: number; completion: number }>([
        { $match: { userId } },
        {
          $group: {
            _id: null,
            prompt: { $sum: { $ifNull: ["$llmTokensPrompt", 0] } },
            completion: { $sum: { $ifNull: ["$llmTokensCompletion", 0] } },
          },
        },
      ])
      .toArray();

    const llmTokensPromptTotal = tokenAgg[0]?.prompt ?? 0;
    const llmTokensCompletionTotal = tokenAgg[0]?.completion ?? 0;

    const customerId = await resolveStripeCustomerId(userId, {
      clerkStripeCustomerId: user.privateMetadata?.stripeCustomerId as
        | string
        | undefined,
      emails: emailsFromClerkUser(user),
    });

    let subscription: {
      status: string;
      currentPeriodStart: number;
      currentPeriodEnd: number;
      cancelAtPeriodEnd: boolean;
    } | null = null;

    if (customerId) {
      const subs = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 1,
      });
      const sub = subs.data[0];
      if (sub) {
        subscription = {
          status: sub.status,
          currentPeriodStart: sub.current_period_start,
          currentPeriodEnd: sub.current_period_end,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        };
      }
    }

    const createdAtIso =
      user.createdAt != null
        ? new Date(user.createdAt as number | string | Date).toISOString()
        : "";

    return NextResponse.json({
      clerkUserId: user.id,
      email:
        user.primaryEmailAddress?.emailAddress ??
        user.emailAddresses?.[0]?.emailAddress ??
        null,
      fullName: user.fullName || null,
      username: user.username || null,
      createdAtIso,
      plan: meta.plan != null ? String(meta.plan) : "",
      purchaseDate: meta.purchaseDate != null ? String(meta.purchaseDate) : "",
      acquisitionDate:
        meta.acquisitionDate != null ? String(meta.acquisitionDate) : "",
      targetCLB: meta.targetCLB != null ? String(meta.targetCLB) : "",
      referralCode:
        meta.referralCode != null ? String(meta.referralCode) : "",
      llmTokensPromptTotal,
      llmTokensCompletionTotal,
      subscription,
    });
  } catch (e) {
    console.error("crisp-context:", e);
    return NextResponse.json(
      { error: "Failed to load Crisp context" },
      { status: 500 }
    );
  }
}
