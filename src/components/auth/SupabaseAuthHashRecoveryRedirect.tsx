"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser-client";

/**
 * Supabase password recovery emails often redirect to the configured Site URL with
 * `#access_token=...&refresh_token=...&type=recovery` in the fragment (not sent to the server).
 * This component consumes that hash, establishes the browser session, strips the hash, and
 * sends the user to `/auth/update-password` so they can set a new password.
 */
export function SupabaseAuthHashRecoveryRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    if (typeof window === "undefined") return;

    const raw = window.location.hash?.replace(/^#/, "") ?? "";
    if (!raw || !raw.includes("access_token")) return;

    const params = new URLSearchParams(raw);
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    const type = params.get("type");

    if (!access_token?.trim() || !refresh_token?.trim()) return;
    if (type !== "recovery") return;

    ran.current = true;

    void (async () => {
      const supabase = createBrowserSupabaseClient();
      if (!supabase) {
        ran.current = false;
        return;
      }

      const { error } = await supabase.auth.setSession({
        access_token: access_token.trim(),
        refresh_token: refresh_token.trim(),
      });

      const pathAndQuery = `${window.location.pathname}${window.location.search}`;
      window.history.replaceState(null, "", pathAndQuery);

      if (error) {
        console.warn("[supabase recovery hash]", error.message);
        ran.current = false;
        return;
      }

      if (pathname !== "/auth/update-password") {
        router.replace("/auth/update-password");
      } else {
        router.refresh();
      }
    })();
  }, [pathname, router]);

  return null;
}
