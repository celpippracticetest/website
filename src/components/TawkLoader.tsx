"use client";

import { useEffect } from "react";
import { ensureTawkScript, initTawkMobileBehavior } from "@/lib/tawk";

/**
 * Injects Tawk.to on every page for all visitors (official pattern: `Tawk_API` queue + embed script).
 * Avoids `next/script` + `dangerouslySetInnerHTML` in the root layout, which breaks under React 19 / Turbopack.
 */
export default function TawkLoader() {
  useEffect(() => {
    ensureTawkScript();
    initTawkMobileBehavior();
  }, []);

  return null;
}
