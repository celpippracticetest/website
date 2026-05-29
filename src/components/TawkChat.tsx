"use client";

import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import { useEffect } from "react";
import { ensureTawkScript, hideTawkChat } from "@/lib/tawk";

/** Loads Tawk for signed-in users on all routes; keeps the default launcher hidden until Live support opens it. */
export default function TawkChat() {
  const { isSignedIn, isLoaded } = useHybridWebUser();

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      hideTawkChat();
      return;
    }

    ensureTawkScript();
    hideTawkChat();
  }, [isLoaded, isSignedIn]);

  return null;
}
