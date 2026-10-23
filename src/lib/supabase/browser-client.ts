"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseAuthUserStorageOptions } from "@/lib/supabase/auth-user-storage";

export function createBrowserSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;
  return createBrowserClient(url, anonKey, {
    auth: supabaseAuthUserStorageOptions(),
  });
}
