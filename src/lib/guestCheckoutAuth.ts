import { logger } from "@/lib/sentry-logger";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { mobileUserBridgeFromSupabaseUser } from "@/lib/auth/supabase-mobile-user-bridge";
import { sendSignupConversionEvents } from "@/lib/signupConversions";

async function findAuthUserByEmail(email: string) {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const want = email.trim().toLowerCase();
  for (let page = 1; page <= 25; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data?.users?.length) break;
    const hit = data.users.find((u) => u.email?.trim().toLowerCase() === want);
    if (hit) return hit;
    if (data.users.length < 200) break;
  }
  return null;
}

/**
 * Resolves an existing Supabase Auth user by email, or creates a confirmed email user
 * after Stripe guest checkout (password can be set later via Supabase recovery).
 */
export async function findOrCreateWebUserByEmail(rawEmail: string): Promise<string> {
  const normalized = rawEmail.trim().toLowerCase();
  if (!normalized) {
    throw new Error("Email required to provision account");
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new Error("Supabase admin is not configured");
  }

  const existing = await findAuthUserByEmail(normalized);
  if (existing) {
    return mobileUserBridgeFromSupabaseUser(existing).id;
  }

  try {
    const { data, error } = await admin.auth.admin.createUser({
      email: normalized,
      email_confirm: true,
    });
    if (error || !data.user) {
      throw error ?? new Error("createUser failed");
    }
    logger.info("Created Supabase Auth user from guest Stripe checkout", {
      component: "guest_checkout_auth",
      userId: data.user.id,
    });
    const userId = mobileUserBridgeFromSupabaseUser(data.user).id;
    void sendSignupConversionEvents({
      userId,
      email: normalized,
      method: "guest_checkout",
    });
    return userId;
  } catch (err: unknown) {
    const msg = err && typeof err === "object" && "message" in err ? String((err as Error).message) : "";
    if (/already been registered|already exists|duplicate/i.test(msg)) {
      const retry = await findAuthUserByEmail(normalized);
      if (retry) {
        return mobileUserBridgeFromSupabaseUser(retry).id;
      }
    }
    throw err;
  }
}
