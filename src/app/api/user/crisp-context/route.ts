import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import Stripe from "stripe";
import type { MobileUserBridge } from "@/lib/auth/supabase-mobile-user-bridge";
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

    const isSupabaseBacked = authContext.supabaseAuthUserId != null;

    let responseUserId: string;
    let meta: Record<string, unknown>;
    let clerkStripeCustomerId: string | undefined;
    let email: string | null;
    let fullName: string | null;
    let username: string | null;
    let createdAtIso: string;

    if (isSupabaseBacked) {
      const bridge = authContext.user as MobileUserBridge;
      responseUserId = bridge.id;
      meta = { ...(bridge.publicMetadata || {}) };
      clerkStripeCustomerId = bridge.privateMetadata?.stripeCustomerId ?? undefined;
      email =
        bridge.primaryEmailAddress?.emailAddress ??
        bridge.emailAddresses?.[0]?.emailAddress ??
        null;
      const joined = [bridge.firstName, bridge.lastName].filter(Boolean).join(" ").trim();
      fullName = joined.length > 0 ? joined : null;
      username =
        typeof meta.username === "string" && meta.username.trim().length > 0
          ? String(meta.username).trim()
          : null;
      const rawCreated =
        (typeof meta.createdAt === "string" && meta.createdAt) ||
        (typeof meta.created_at === "string" && meta.created_at) ||
        "";
      if (rawCreated) {
        try {
          createdAtIso = new Date(rawCreated).toISOString();
        } catch {
          createdAtIso = "";
        }
      } else {
        createdAtIso = "";
      }
    } else {
      const clerk = await clerkClient();
      const user = await clerk.users.getUser(userId);
      responseUserId = user.id;
      meta = (user.publicMetadata || {}) as Record<string, unknown>;
      clerkStripeCustomerId = user.privateMetadata?.stripeCustomerId as
        | string
        | undefined;
      email =
        user.primaryEmailAddress?.emailAddress ??
        user.emailAddresses?.[0]?.emailAddress ??
        null;
      fullName = user.fullName || null;
      username = user.username || null;
      createdAtIso =
        user.createdAt != null
          ? new Date(user.createdAt as number | string | Date).toISOString()
          : "";
    }

    let llmTokensPromptTotal = 0;
    let llmTokensCompletionTotal = 0;
    try {
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
      llmTokensPromptTotal = tokenAgg[0]?.prompt ?? 0;
      llmTokensCompletionTotal = tokenAgg[0]?.completion ?? 0;
    } catch (mongoErr) {
      console.error("crisp-context mongo:", mongoErr);
    }

    let subscription: {
      status: string;
      currentPeriodStart: number;
      currentPeriodEnd: number;
      cancelAtPeriodEnd: boolean;
    } | null = null;

    try {
      const customerId = await resolveStripeCustomerId(userId, {
        clerkStripeCustomerId,
        emails: emailsFromClerkUser(authContext.user),
      });

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
    } catch (stripeErr) {
      console.error("crisp-context stripe:", stripeErr);
    }

    return NextResponse.json({
      clerkUserId: responseUserId,
      email,
      fullName,
      username,
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
