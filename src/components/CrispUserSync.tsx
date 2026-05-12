"use client";

import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import { useEffect, useRef } from "react";
import {
  applyCrispVisitorProfile,
  ensureCrispScript,
  type CrispSessionPair,
} from "@/lib/crisp";

type CrispContextResponse = {
  clerkUserId: string;
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
 * Loads Crisp + pushes [`user:email`, `user:nickname`, `session:data`, `session:segments`](https://docs.crisp.chat/guides/chatbox-sdks/web-sdk/dollar-crisp/)
 * from `/api/user/crisp-context` (plan, Stripe period, LLM token totals, etc.).
 */
export default function CrispUserSync() {
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
        ensureCrispScript();
        const res = await fetch("/api/user/crisp-context", {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as CrispContextResponse;

        const fingerprint = [
          data.clerkUserId,
          data.plan,
          data.llmTokensPromptTotal,
          data.llmTokensCompletionTotal,
          data.subscription?.currentPeriodEnd ?? "none",
          data.email ?? "",
        ].join("|");

        if (lastFingerprint.current === fingerprint) return;
        lastFingerprint.current = fingerprint;

        const pairs: CrispSessionPair[] = [
          ["clerk_user_id", data.clerkUserId],
          ["plan", data.plan || "unknown"],
        ];

        if (data.purchaseDate) pairs.push(["purchase_date", data.purchaseDate]);
        if (data.acquisitionDate)
          pairs.push(["acquisition_date", data.acquisitionDate]);
        if (data.targetCLB) pairs.push(["target_clb", data.targetCLB]);
        if (data.referralCode) pairs.push(["referral_code", data.referralCode]);
        if (data.createdAtIso) pairs.push(["account_created", data.createdAtIso]);

        pairs.push(["llm_prompt_tokens_total", data.llmTokensPromptTotal]);
        pairs.push(["llm_completion_tokens_total", data.llmTokensCompletionTotal]);
        pairs.push([
          "llm_tokens_total",
          data.llmTokensPromptTotal + data.llmTokensCompletionTotal,
        ]);

        if (data.subscription) {
          const sub = data.subscription;
          pairs.push(["subscription_status", sub.status]);
          pairs.push([
            "subscription_period_start",
            new Date(sub.currentPeriodStart * 1000).toISOString(),
          ]);
          pairs.push([
            "subscription_period_end",
            new Date(sub.currentPeriodEnd * 1000).toISOString(),
          ]);
          pairs.push([
            "subscription_cancel_at_period_end",
            sub.cancelAtPeriodEnd,
          ]);
          const endMs = sub.currentPeriodEnd * 1000;
          const days = Math.max(
            0,
            Math.ceil((endMs - Date.now()) / 86400000)
          );
          pairs.push(["subscription_days_until_period_end", days]);
        }

        const planSlug = (data.plan || "unknown")
          .toString()
          .trim()
          .replace(/\s+/g, "-")
          .toLowerCase();
        const segments = [`plan-${planSlug}`, "celpip-app"];

        applyCrispVisitorProfile({
          email: data.email,
          nickname: data.fullName || data.username || undefined,
          sessionData: pairs,
          segments,
        });
      } catch {
        // Crisp should never break the app
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
