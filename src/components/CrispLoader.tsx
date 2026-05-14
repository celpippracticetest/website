"use client";

import { useEffect } from "react";
import { ensureCrispScript } from "@/lib/crisp";

/**
 * Injects Crisp on the client only (official pattern: `$crisp` queue + `CRISP_WEBSITE_ID` + `l.js`).
 * Avoids `next/script` + `dangerouslySetInnerHTML` in the root layout, which breaks under React 19 / Turbopack.
 */
export default function CrispLoader() {
  useEffect(() => {
    ensureCrispScript();
  }, []);

  return null;
}
