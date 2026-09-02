"use client";

import { useEffect, useRef } from "react";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import { trackKpi } from "@/lib/analytics";
import { setGa4UserId, setGa4UserProperties } from "@/lib/ga4Browser";
import { persistTargetClb, syncKpiUserProperties } from "@/lib/ga4KpiContext";
import { rememberAppClientPlatform } from "@/lib/appClientPlatform";

const LAST_ACTIVE_KEY = "celpip_last_active_at";
const REACTIVATION_ONCE_KEY = "celpip_reactivation_fired";

type AnalyticsUser = {
  id: string;
  publicMetadata?: { plan?: unknown; planType?: unknown; totalSpend?: unknown };
};

/**
 * Keeps GA4 user_id + window.__CELPIP_ANALYTICS_USER in sync, and fires
 * `reactivation_session` when a user returns after 14+ days dormant.
 */
export default function AuthAnalyticsTracker() {
  const { user, isSignedIn, isLoaded } = useHybridWebUser();
  const firedReactivation = useRef(false);

  useEffect(() => {
    const platform = rememberAppClientPlatform();
    setGa4UserProperties({ platform, app_platform: platform });

    if (!isLoaded) return;

    const w = window as Window & {
      __CELPIP_ANALYTICS_USER?: AnalyticsUser | null;
    };

    if (!isSignedIn || !user?.id) {
      w.__CELPIP_ANALYTICS_USER = null;
      setGa4UserId(null);
      return;
    }

    w.__CELPIP_ANALYTICS_USER = {
      id: user.id,
      publicMetadata: user.publicMetadata as AnalyticsUser["publicMetadata"],
    };
    setGa4UserId(user.id);

    const meta = user.publicMetadata as AnalyticsUser["publicMetadata"] & {
      targetCLB?: unknown;
      targetClb?: unknown;
    };
    const targetClb = meta?.targetCLB ?? meta?.targetClb;
    if (targetClb != null && String(targetClb) !== "Not specified") {
      persistTargetClb(String(targetClb));
    }
    syncKpiUserProperties({
      userPlan: meta?.plan != null ? String(meta.plan) : "free",
      targetClb:
        targetClb != null && String(targetClb) !== "Not specified"
          ? String(targetClb)
          : undefined,
    });

    try {
      const now = Date.now();
      const raw = localStorage.getItem(LAST_ACTIVE_KEY);
      const lastActive = raw ? Number(raw) : NaN;
      const already =
        sessionStorage.getItem(REACTIVATION_ONCE_KEY) === "1" ||
        firedReactivation.current;

      if (
        !already &&
        Number.isFinite(lastActive) &&
        now - lastActive >= 14 * 24 * 60 * 60 * 1000
      ) {
        const daysDormant = Math.floor(
          (now - lastActive) / (1000 * 60 * 60 * 24),
        );
        trackKpi.reactivationSession({
          daysDormant,
          triggerChannel: "session_restore",
        });
        firedReactivation.current = true;
        sessionStorage.setItem(REACTIVATION_ONCE_KEY, "1");
      }

      localStorage.setItem(LAST_ACTIVE_KEY, String(now));
    } catch {
      // private mode / quota
    }
  }, [isLoaded, isSignedIn, user]);

  return null;
}
