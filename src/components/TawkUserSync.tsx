"use client";

import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import { useEffect, useRef } from "react";
import {
  applyTawkVisitorProfile,
  ensureTawkScript,
  type TawkVisitorAttribute,
} from "@/lib/tawk";

type TawkContextResponse = {
  webUserId: string;
  email: string | null;
  fullName: string | null;
  username: string | null;
  createdAtIso: string;
  plan: string;
  purchaseDate: string;
  acquisitionDate: string;
  targetCLB: string;
  referralCode: string;
  llmTokensPromptTotal: number;
  llmTokensCompletionTotal: number;
  subscription: {
    status: string;
    currentPeriodStart: number;
    currentPeriodEnd: number;
    cancelAtPeriodEnd: boolean;
  } | null;
};

/**
 * Loads Tawk + pushes visitor attributes from `/api/user/tawk-context`
 * (plan, Stripe period, LLM token totals, etc.).
 */
export default function TawkUserSync() {
  const { user, isLoaded } = useHybridWebUser();
  const lastFingerprint = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !user) {
      lastFingerprint.current = null;
      return;
    }

    let cancelled = false;

    const sync = async () => {
      try {
        ensureTawkScript();
        const res = await fetch("/api/user/tawk-context", {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as TawkContextResponse;

        const fingerprint = [
          data.webUserId,
          data.plan,
          data.llmTokensPromptTotal,
          data.llmTokensCompletionTotal,
          data.subscription?.currentPeriodEnd ?? "none",
          data.email ?? "",
        ].join("|");

        if (lastFingerprint.current === fingerprint) return;
        lastFingerprint.current = fingerprint;

        const attributes: TawkVisitorAttribute[] = [
          ["app_user_id", data.webUserId],
          ["plan", data.plan || "unknown"],
        ];

        if (data.purchaseDate) attributes.push(["purchase_date", data.purchaseDate]);
        if (data.acquisitionDate)
          attributes.push(["acquisition_date", data.acquisitionDate]);
        if (data.targetCLB) attributes.push(["target_clb", data.targetCLB]);
        if (data.referralCode) attributes.push(["referral_code", data.referralCode]);
        if (data.createdAtIso) attributes.push(["account_created", data.createdAtIso]);

        attributes.push(["llm_prompt_tokens_total", data.llmTokensPromptTotal]);
        attributes.push(["llm_completion_tokens_total", data.llmTokensCompletionTotal]);
        attributes.push([
          "llm_tokens_total",
          data.llmTokensPromptTotal + data.llmTokensCompletionTotal,
        ]);

        if (data.subscription) {
          const sub = data.subscription;
          attributes.push(["subscription_status", sub.status]);
          attributes.push([
            "subscription_period_start",
            new Date(sub.currentPeriodStart * 1000).toISOString(),
          ]);
          attributes.push([
            "subscription_period_end",
            new Date(sub.currentPeriodEnd * 1000).toISOString(),
          ]);
          attributes.push([
            "subscription_cancel_at_period_end",
            sub.cancelAtPeriodEnd,
          ]);
          const endMs = sub.currentPeriodEnd * 1000;
          const days = Math.max(
            0,
            Math.ceil((endMs - Date.now()) / 86400000),
          );
          attributes.push(["subscription_days_until_period_end", days]);
        }

        const planSlug = (data.plan || "unknown")
          .toString()
          .trim()
          .replace(/\s+/g, "-")
          .toLowerCase();
        attributes.push(["segment_plan", `plan-${planSlug}`]);
        attributes.push(["segment_app", "celpip-app"]);

        applyTawkVisitorProfile({
          email: data.email,
          nickname: data.fullName || data.username || undefined,
          attributes,
        });
      } catch {
        // Tawk should never break the app
      }
    };

    void sync();

    const onVisible = () => {
      if (document.visibilityState === "visible") void sync();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [isLoaded, user?.id]);

  return null;
}
