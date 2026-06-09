import type { JwtPayload, User as SupabaseAuthUser } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Minimal Supabase `User` built from verified JWT claims (middleware / API gating).
 * Plan, roles, and legacy ids must live in `app_metadata` / `user_metadata` on the token.
 */
export function supabaseUserFromJwtClaims(claims: JwtPayload): SupabaseAuthUser {
  const iatMs = typeof claims.iat === "number" ? claims.iat * 1000 : Date.now();
  const email = typeof claims.email === "string" ? claims.email : undefined;

  return {
    id: claims.sub,
    aud: typeof claims.aud === "string" ? claims.aud : "authenticated",
    role: typeof claims.role === "string" ? claims.role : "authenticated",
    email,
    phone: typeof claims.phone === "string" ? claims.phone : undefined,
    app_metadata: (claims.app_metadata ?? {}) as SupabaseAuthUser["app_metadata"],
    user_metadata: (claims.user_metadata ?? {}) as SupabaseAuthUser["user_metadata"],
    created_at: new Date(iatMs).toISOString(),
    updated_at: new Date(iatMs).toISOString(),
    last_sign_in_at: undefined,
    confirmed_at: undefined,
    email_confirmed_at: undefined,
    phone_confirmed_at: undefined,
    recovery_sent_at: undefined,
    invited_at: undefined,
    action_link: undefined,
    new_email: undefined,
    new_phone: undefined,
    is_anonymous: claims.is_anonymous === true,
    identities: [],
    factors: [],
  };
}

/** Verified session user via local JWT validation (`getClaims`), not Auth-server `getUser()`. */
export async function getVerifiedSupabaseUserFromClient(
  supabase: SupabaseClient
): Promise<SupabaseAuthUser | null> {
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    return null;
  }
  return supabaseUserFromJwtClaims(data.claims);
}
