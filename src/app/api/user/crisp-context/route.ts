import { NextRequest, NextResponse } from "next/server";
import { appUserAdmin } from "@/lib/auth/server-auth";
import Stripe from "stripe";
import type { MobileUserBridge } from "@/lib/auth/supabase-mobile-user-bridge";
import { getAuthenticatedRequestContext } from "@/lib/auth/request-auth";
import {
  emailsFromAuthUser,
  resolveStripeCustomerId,
} from "@/lib/resolveStripeCustomerId";
import { resolveAppDocumentsPartitionKey } from "@/lib/pg/pgCollection";
import { getSql } from "@/lib/pg/pool";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/** Vercel / edge: allow Stripe + DB work to finish before platform gateway 504. */
export const maxDuration = 30;

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
    let stripeCustomerIdFromPrivate: string | undefined;
    let email: string | null;
    let fullName: string | null;
    let username: string | null;
    let createdAtIso: string;

    if (isSupabaseBacked) {
      const bridge = authContext.user as MobileUserBridge;
      responseUserId = bridge.id;
      meta = { ...(bridge.publicMetadata || {}) };
      stripeCustomerIdFromPrivate = bridge.privateMetadata?.stripeCustomerId ?? undefined;
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
      const authAdmin = await appUserAdmin();
      const user = (await authAdmin.users.getUser(userId)) as {
        id: string;
        createdAt?: number | string | Date;
        username?: string | null;
        publicMetadata?: Record<string, unknown>;
        privateMetadata?: { stripeCustomerId?: string | null };
        primaryEmailAddress?: { emailAddress?: string };
        emailAddresses?: Array<{ emailAddress?: string }>;
        fullName?: string | null;
      };
      responseUserId = user.id;
      meta = (user.publicMetadata || {}) as Record<string, unknown>;
      stripeCustomerIdFromPrivate = user.privateMetadata?.stripeCustomerId as
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

    const [tokenTotals, subscription] = await Promise.all([
      (async () => {
        try {
          /**
           * Avoid `collection("useractivities").aggregate(...)`: the PG document layer loads the
           * entire partition before `$match`, which hits statement timeouts at scale.
           */
          const sql = getSql();
          const phys = await resolveAppDocumentsPartitionKey(sql, "useractivities");
          const rows = await sql`
            SELECT
              COALESCE(
                SUM(
                  COALESCE(
                    NULLIF(
                      TRIM(
                        COALESCE(
                          body->>'llmTokensPrompt',
                          body->'llmTokensPrompt'->>'$numberInt',
                          body->'llmTokensPrompt'->>'$numberLong',
                          body->'llmTokensPrompt'->>'$numberDouble'
                        )
                      ),
                      ''
                    ),
                    '0'
                  )::numeric
                ),
                0
              ) AS prompt,
              COALESCE(
                SUM(
                  COALESCE(
                    NULLIF(
                      TRIM(
                        COALESCE(
                          body->>'llmTokensCompletion',
                          body->'llmTokensCompletion'->>'$numberInt',
                          body->'llmTokensCompletion'->>'$numberLong',
                          body->'llmTokensCompletion'->>'$numberDouble'
                        )
                      ),
                      ''
                    ),
                    '0'
                  )::numeric
                ),
                0
              ) AS completion
            FROM app_documents
            WHERE collection = ${phys}
              AND body->>'userId' = ${userId}
          `;
          const row = rows[0] as { prompt?: unknown; completion?: unknown } | undefined;
          const n = (v: unknown) => {
            if (v == null) return 0;
            if (typeof v === "number" && Number.isFinite(v)) return v;
            const x = Number(v);
            return Number.isFinite(x) ? x : 0;
          };
          return {
            llmTokensPromptTotal: n(row?.prompt),
            llmTokensCompletionTotal: n(row?.completion),
          };
        } catch (dbErr) {
          console.error("crisp-context documents:", dbErr);
          return { llmTokensPromptTotal: 0, llmTokensCompletionTotal: 0 };
        }
      })(),
      (async (): Promise<{
        status: string;
        currentPeriodStart: number;
        currentPeriodEnd: number;
        cancelAtPeriodEnd: boolean;
      } | null> => {
        try {
          const customerId = await resolveStripeCustomerId(userId, {
            stripeCustomerIdFromPrivate,
            emails: emailsFromAuthUser(authContext.user),
          });

          if (!customerId) return null;

          const subs = await stripe.subscriptions.list({
            customer: customerId,
            status: "active",
            limit: 1,
          });
          const rawSub = subs.data[0];
          if (!rawSub) return null;
          const sub = rawSub as Stripe.Subscription & {
            current_period_start: number;
            current_period_end: number;
          };
          return {
            status: sub.status,
            currentPeriodStart: sub.current_period_start,
            currentPeriodEnd: sub.current_period_end,
            cancelAtPeriodEnd: sub.cancel_at_period_end,
          };
        } catch (stripeErr) {
          console.error("crisp-context stripe:", stripeErr);
          return null;
        }
      })(),
    ]);

    const llmTokensPromptTotal = tokenTotals.llmTokensPromptTotal;
    const llmTokensCompletionTotal = tokenTotals.llmTokensCompletionTotal;

    return NextResponse.json({
      webUserId: responseUserId,
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
