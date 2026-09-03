"use client";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser-client";

export async function signOutWebSession(
  router?: { push: (href: string) => void; refresh: () => void },
  redirectUrl = "/sign-in",
) {
  const supabase = createBrowserSupabaseClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  if (router) {
    router.push(redirectUrl);
    router.refresh();
    return;
  }
  if (typeof window !== "undefined") {
    window.location.assign(redirectUrl);
  }
}
