import type { Session, SupabaseClient, User } from "@supabase/supabase-js";

export function isDuplicateEmailAuthError(message: string | undefined): boolean {
  const m = (message ?? "").toLowerCase();
  return (
    m.includes("already been registered") ||
    m.includes("already registered") ||
    m.includes("email address is already") ||
    m.includes("user already registered") ||
    m.includes("already exists")
  );
}

/** Supabase may return a user with no identities when the email is already registered (confirm-email on). */
export function isExistingUserSignupStub(user: User | null | undefined): boolean {
  if (!user) return false;
  const identities = user.identities;
  return Array.isArray(identities) && identities.length === 0;
}

export type PasswordSignUpOrSignInResult =
  | { ok: true; session: Session | null; isNewSignup: boolean }
  | { ok: false; message: string };

/**
 * Attempt sign-up; if the email already belongs to an account, sign in with the same password.
 */
export async function signUpOrSignInWithPassword(
  supabase: SupabaseClient,
  params: {
    email: string;
    password: string;
    signUpOptions?: { emailRedirectTo?: string };
  }
): Promise<PasswordSignUpOrSignInResult> {
  const trimmed = params.email.trim();

  const { data, error: signUpErr } = await supabase.auth.signUp({
    email: trimmed,
    password: params.password,
    options: params.signUpOptions,
  });

  if (data.session) {
    return { ok: true, session: data.session, isNewSignup: true };
  }

  const shouldTrySignIn =
    (signUpErr != null && isDuplicateEmailAuthError(signUpErr.message)) ||
    (signUpErr == null && isExistingUserSignupStub(data.user));

  if (shouldTrySignIn) {
    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
      email: trimmed,
      password: params.password,
    });
    if (!signInErr && signInData.session) {
      return { ok: true, session: signInData.session, isNewSignup: false };
    }
    return {
      ok: false,
      message:
        signInErr?.message ??
        signUpErr?.message ??
        "Invalid email or password.",
    };
  }

  if (signUpErr) {
    return { ok: false, message: signUpErr.message };
  }

  return { ok: true, session: null, isNewSignup: true };
}
