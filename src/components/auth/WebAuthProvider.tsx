"use client";

import type { User as SupabaseAuthUser } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, type ReactNode } from "react";
import { seedSharedAuthUser } from "@/lib/auth/shared-web-auth";

const WebAuthInitialContext = createContext<SupabaseAuthUser | null>(null);

export function useWebAuthInitialUser(): SupabaseAuthUser | null {
  return useContext(WebAuthInitialContext);
}

/** Seeds client auth UI from the server cookie session (header, etc.). */
export function WebAuthProvider({
  initialUser,
  children,
}: {
  initialUser: SupabaseAuthUser | null;
  children: ReactNode;
}) {
  seedSharedAuthUser(initialUser);

  useEffect(() => {
    seedSharedAuthUser(initialUser);
  }, [initialUser]);

  return (
    <WebAuthInitialContext.Provider value={initialUser}>
      {children}
    </WebAuthInitialContext.Provider>
  );
}
