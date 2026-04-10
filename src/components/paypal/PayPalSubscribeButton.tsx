"use client";

import type { ReactNode } from "react";

type Props = {
  className?: string;
  "aria-label"?: string;
  disabled?: boolean;
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onError: (message: string) => void;
  onBegin?: () => void;
  buildSubscriptionBody: () => Record<string, unknown>;
  children: ReactNode;
};

/**
 * Full-page redirect to PayPal’s hosted approval URL after server-side subscription creation.
 * Avoids the JS SDK pop-up window (which often shows a separate “loading” window on desktop).
 */
export function PayPalSubscribeButton({
  className,
  "aria-label": ariaLabel,
  disabled,
  busy,
  onBusyChange,
  onError,
  onBegin,
  buildSubscriptionBody,
  children,
}: Props) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled || busy}
      className={className}
      onClick={() => {
        onBegin?.();
        onBusyChange(true);
        void (async () => {
          try {
            const res = await fetch("/api/paypal/create-subscription", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(buildSubscriptionBody()),
            });
            const data = (await res.json().catch(() => ({}))) as {
              error?: string;
              approvalUrl?: string;
            };
            if (!res.ok) {
              throw new Error(data.error || "Could not start PayPal checkout");
            }
            const url = data.approvalUrl?.trim();
            if (!url) {
              throw new Error("Missing PayPal approval URL");
            }
            window.location.assign(url);
          } catch (e) {
            onError(e instanceof Error ? e.message : "PayPal checkout failed");
            onBusyChange(false);
          }
        })();
      }}
    >
      {children}
    </button>
  );
}
