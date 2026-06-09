"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  acceptEssentialConsent,
  applyStoredConsent,
  grantMarketingConsent,
} from "@/lib/consent";

const GA_ENABLED = Boolean(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim());

/**
 * Restores saved Consent Mode choice and shows a banner until the user decides.
 */
export default function ConsentManager() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!GA_ENABLED) return;

    const stored = applyStoredConsent();
    if (!stored) {
      setVisible(true);
    }
  }, []);

  if (!GA_ENABLED || !visible) {
    return null;
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[10000] border-t border-text3/20 bg-parchment p-4 shadow-[0_-8px_24px_rgba(33,46,66,0.12)] screen744:p-5"
      role="dialog"
      aria-label="Cookie consent"
    >
      <div className="mx-auto flex max-w-screen1280 flex-col gap-4 screen744:flex-row screen744:items-center screen744:justify-start screen744:gap-6">
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            className="rounded-full border border-text3/30 px-4 py-2 text-sm font-medium text-text1 transition hover:bg-white"
            onClick={() => {
              acceptEssentialConsent();
              setVisible(false);
            }}
          >
            Essential only
          </button>
          <button
            type="button"
            className="rounded-full bg-primary1 px-4 py-2 text-sm font-medium text-white shadow-[0_4px_0_#2454cc] transition hover:brightness-105"
            onClick={() => {
              grantMarketingConsent();
              setVisible(false);
            }}
          >
            Accept all
          </button>
        </div>
        <p className="text-sm text-text2 screen744:max-w-3xl">
          We use cookies for analytics and, if you allow, advertising measurement.
          See our{" "}
          <Link href="/privacy-policy" className="text-primary1 underline underline-offset-2">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
