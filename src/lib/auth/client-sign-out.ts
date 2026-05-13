"use client";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser-client";

export async function signOutWebSession(
  router: { push: (href: string) => void; refresh: () => void },
  redirectUrl = "/sign-in",
) {
  const supabase = createBrowserSupabaseClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  router.push(redirectUrl);
  router.refresh();
}
