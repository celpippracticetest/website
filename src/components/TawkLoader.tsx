"use client";

import { useEffect } from "react";
import { ensureTawkScript } from "@/lib/tawk";

/**
 * Injects Tawk.to on the client only (official pattern: `Tawk_API` queue + embed script).
 * Avoids `next/script` + `dangerouslySetInnerHTML` in the root layout, which breaks under React 19 / Turbopack.
 */
export default function TawkLoader() {
  useEffect(() => {
    ensureTawkScript();
  }, []);

  return null;
}
