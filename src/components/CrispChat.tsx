"use client";

import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import { useEffect } from "react";
import { ensureCrispScript, hideCrispChat } from "@/lib/crisp";

/** Loads Crisp for signed-in users on all routes; keeps the default launcher hidden until Live support opens it. */
export default function CrispChat() {
  const { isSignedIn, isLoaded } = useHybridWebUser();

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      hideCrispChat();
      return;
    }

    ensureCrispScript();
    hideCrispChat();
  }, [isLoaded, isSignedIn]);

  return null;
}
