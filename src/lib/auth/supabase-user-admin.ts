import "server-only";

import { getSql } from "@/lib/pg/pool";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { normalizePlan } from "@/lib/subscriptionAccess";
import type Stripe from "stripe";

type ProfileRef = {
  profileId: string;
  supabaseAuthUserId: string;
};

type ProfileRow = {
  id: string;
  supabase_auth_user_id: string | null;
};

/**
 * Resolves a Supabase user_profiles row from Stripe webhook context.
 *
 * Tier 1 — stripe_customer_id exact match (fastest, no backfill needed).
 * Tier 2 — legacy_clerk_user_id match (userId starts with "user_"); backfills stripe_customer_id.
 * Tier 3 — email match; backfills stripe_customer_id.
 *
 * Returns null when no profile with a linked supabase_auth_user_id can be found.
 */
export async function resolveUserProfileFromStripe(
  customerId: string | null | undefined,
  metadataUserId?: string | null,
  customerEmail?: string | null,
): Promise<ProfileRef | null> {
  const sql = getSql();

  // Tier 1: stripe_customer_id
  if (customerId) {
    const rows = await sql<ProfileRow[]>`
      SELECT id, supabase_auth_user_id
      FROM public.user_profiles
      WHERE stripe_customer_id = ${customerId}
      LIMIT 1
    `;
    const row = rows[0];
    if (row?.supabase_auth_user_id) {
      return { profileId: row.id, supabaseAuthUserId: row.supabase_auth_user_id };
    }
  }

  // Tier 2: legacy Clerk id (old subscribers whose metadata.user_id is "user_...")
  if (metadataUserId?.startsWith("user_")) {
    const rows = await sql<ProfileRow[]>`
      SELECT id, supabase_auth_user_id
      FROM public.user_profiles
      WHERE legacy_clerk_user_id = ${metadataUserId}
      LIMIT 1
    `;
    const row = rows[0];
    if (row?.supabase_auth_user_id) {
      if (customerId) {
        await sql`
          UPDATE public.user_profiles
          SET stripe_customer_id = ${customerId}, updated_at = NOW()
          WHERE id = ${row.id}::uuid
        `.catch(() => undefined);
      }
      return { profileId: row.id, supabaseAuthUserId: row.supabase_auth_user_id };
    }
  }

  // Tier 3: email
  if (customerEmail) {
    const normalized = customerEmail.trim().toLowerCase();
    const rows = await sql<ProfileRow[]>`
      SELECT id, supabase_auth_user_id
      FROM public.user_profiles
      WHERE lower(email) = ${normalized}
      LIMIT 1
    `;
    const row = rows[0];
    if (row?.supabase_auth_user_id) {
      if (customerId) {
        await sql`
          UPDATE public.user_profiles
          SET stripe_customer_id = ${customerId}, updated_at = NOW()
          WHERE id = ${row.id}::uuid
        `.catch(() => undefined);
      }
      return { profileId: row.id, supabaseAuthUserId: row.supabase_auth_user_id };
    }
  }

  return null;
}

/** Sets plan = 'plus' on both user_profiles and auth.users.raw_app_meta_data. */
export async function grantPlusPlan(
  supabaseAuthUserId: string,
  profileId: string,
): Promise<void> {
  const sql = getSql();
  const admin = getSupabaseAdmin();

  await sql`
    UPDATE public.user_profiles
    SET plan = 'plus', updated_at = NOW()
    WHERE id = ${profileId}::uuid
  `.catch(() => undefined);

  if (!admin) return;

  const { data } = await admin.auth.admin.getUserById(supabaseAuthUserId);
  const currentApp = (data.user?.app_metadata ?? {}) as Record<string, unknown>;
  await admin.auth.admin
    .updateUserById(supabaseAuthUserId, {
      app_metadata: { ...currentApp, plan: "plus" },
    })
    .catch(() => undefined);
}

/** Re-sync auth JWT plan when Postgres profile is plus but app_metadata drifted to free. */
export async function repairAuthPlanIfProfileIsPlus(
  supabaseAuthUserId: string,
): Promise<boolean> {
  const sql = getSql();
  const rows = await sql<{ id: string; plan: string | null }[]>`
    SELECT id, plan
    FROM public.user_profiles
    WHERE supabase_auth_user_id = ${supabaseAuthUserId}::uuid
    LIMIT 1
  `;
  const row = rows[0];
  if (!row || normalizePlan(row.plan) !== "plus") return false;

  const admin = getSupabaseAdmin();
  if (!admin) return false;

  const { data } = await admin.auth.admin.getUserById(supabaseAuthUserId);
  const app = (data.user?.app_metadata ?? {}) as Record<string, unknown>;
  if (normalizePlan(app.plan as string) === "plus") return false;

  await grantPlusPlan(supabaseAuthUserId, row.id);
  return true;
}

/** Sets plan = 'free' on both user_profiles and auth.users.raw_app_meta_data. */
export async function revokePlusPlan(
  supabaseAuthUserId: string,
  profileId: string,
): Promise<void> {
  const sql = getSql();
  const admin = getSupabaseAdmin();

  await Promise.all([
    sql`
      UPDATE public.user_profiles
      SET plan = 'free', updated_at = NOW()
      WHERE id = ${profileId}::uuid
    `.catch(() => undefined),
    admin
      ? (async () => {
          const { data } = await admin.auth.admin.getUserById(supabaseAuthUserId);
          const currentApp = (data.user?.app_metadata ?? {}) as Record<string, unknown>;
          await admin.auth.admin
            .updateUserById(supabaseAuthUserId, {
              app_metadata: { ...currentApp, plan: "free" },
            })
            .catch(() => undefined);
        })()
      : Promise.resolve(),
  ]);
}

/** Upserts a Stripe subscription into public.stripe_subscriptions using stripe_id as conflict key. */
export async function upsertStripeSubscription(
  sub: Stripe.Subscription,
  customerId: string,
): Promise<void> {
  const sql = getSql();

  const item = sub.items?.data?.[0];
  const price = item?.price;
  const priceId = price?.id ?? null;
  const interval = price?.recurring?.interval ?? null;
  const intervalCount = price?.recurring?.interval_count ?? null;
  const periodStartAt = item?.current_period_start
    ? new Date(item.current_period_start * 1000)
    : null;
  const periodEndAt = item?.current_period_end
    ? new Date(item.current_period_end * 1000)
    : null;
  const canceledAt = sub.canceled_at ? new Date(sub.canceled_at * 1000) : null;
  const createdAt = new Date(sub.created * 1000);
  const metadata = (sub.metadata ?? {}) as Record<string, string>;
  const now = new Date();

  await sql`
    INSERT INTO public.stripe_subscriptions (
      stripe_id,
      customer_id,
      status,
      created_at,
      current_period_start_at,
      current_period_end_at,
      canceled_at,
      cancel_at_period_end,
      price_id,
      interval,
      interval_count,
      metadata,
      updated_at
    )
    VALUES (
      ${sub.id},
      ${customerId},
      ${sub.status},
      ${createdAt},
      ${periodStartAt},
      ${periodEndAt},
      ${canceledAt},
      ${sub.cancel_at_period_end},
      ${priceId},
      ${interval},
      ${intervalCount},
      ${sql.json(metadata)},
      ${now}
    )
    ON CONFLICT (stripe_id) DO UPDATE SET
      customer_id            = EXCLUDED.customer_id,
      status                 = EXCLUDED.status,
      current_period_start_at = EXCLUDED.current_period_start_at,
      current_period_end_at  = EXCLUDED.current_period_end_at,
      canceled_at            = EXCLUDED.canceled_at,
      cancel_at_period_end   = EXCLUDED.cancel_at_period_end,
      price_id               = EXCLUDED.price_id,
      interval               = EXCLUDED.interval,
      interval_count         = EXCLUDED.interval_count,
      metadata               = EXCLUDED.metadata,
      updated_at             = EXCLUDED.updated_at
  `.catch(() => undefined);
}
