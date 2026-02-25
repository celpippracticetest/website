"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useLeadCaptureTriggers } from "@/hooks/useLeadCaptureTriggers";
import { trackEngagement } from "@/lib/gtm";

type LeadCaptureConfig = {
  id: string;
  name: string;
  headline: string;
  subHeadline: string;
  ctaText: string;
  exitIntent: { enabled: boolean; value: number };
  timeOnPage: { enabled: boolean; value: number };
  scrollDepth: { enabled: boolean; value: number };
  targetPaths: string[];
  senderGroupId?: string;
  senderGroupName?: string;
  priority: number;
  audience: {
    showToGuest: boolean;
    showToLoggedIn: boolean;
    showToPremium: boolean;
    showToWasPremium: boolean;
  };
  frequencyCapDays: number;
  isEnabled: boolean;
};

const STORAGE_PREFIX = "lead_capture_next_eligible_at_";

const FALLBACK_CONFIG: LeadCaptureConfig = {
  id: "default-fallback",
  name: "Default Lead Capture",
  headline: "Stuck at CLB 8? Get the Free 2026 CELPIP Templates Guide.",
  subHeadline:
    "Stop using robotic templates. Download our examiner-approved email and survey templates to hit CLB 9+.",
  ctaText: "Send My Free Guide",
  exitIntent: { enabled: true, value: 0 },
  timeOnPage: { enabled: true, value: 30 },
  scrollDepth: { enabled: true, value: 50 },
  targetPaths: [],
  senderGroupId: "",
  senderGroupName: "",
  priority: 100,
  audience: {
    showToGuest: true,
    showToLoggedIn: true,
    showToPremium: true,
    showToWasPremium: true,
  },
  frequencyCapDays: 30,
  isEnabled: true,
};

function getStorageKey(campaignId: string) {
  return `${STORAGE_PREFIX}${campaignId}`;
}

function setFrequencyCap(campaignId: string, days: number) {
  const nextEligibleAt = Date.now() + Math.max(days, 1) * 24 * 60 * 60 * 1000;
  localStorage.setItem(getStorageKey(campaignId), String(nextEligibleAt));
}

function isCooldownActive(campaignId: string) {
  const raw = localStorage.getItem(getStorageKey(campaignId));
  if (!raw) return false;
  const nextEligibleAt = Number(raw);
  if (!Number.isFinite(nextEligibleAt)) return false;
  return Date.now() < nextEligibleAt;
}

export default function LeadCapturePopup() {
  const { user, isLoaded } = useUser();
  const pathname = usePathname();
  const [configs, setConfigs] = useState<LeadCaptureConfig[]>([FALLBACK_CONFIG]);
  const [activeConfig, setActiveConfig] = useState<LeadCaptureConfig | null>(FALLBACK_CONFIG);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [triggerSource, setTriggerSource] = useState<
    "exit_intent" | "time_on_page" | "scroll_depth" | "manual"
  >("manual");

  const isPathEligible = useMemo(() => {
    if (!pathname) return true;
    if (pathname.startsWith("/cms")) return false;
    if (pathname.startsWith("/dashboard")) return false;
    if (pathname.startsWith("/auth")) return false;
    if (pathname.startsWith("/sign-in")) return false;
    if (pathname.startsWith("/sign-up")) return false;
    if (pathname.startsWith("/login")) return false;
    if (pathname.startsWith("/register")) return false;
    return true;
  }, [pathname]);

  const selectCandidate = useCallback(
    (list: LeadCaptureConfig[]) => {
      const plan = String((user?.publicMetadata as any)?.plan || "free").toLowerCase();
      const isPremium = plan === "premium" || plan === "pro";
      const wasPremiumByFlag = Boolean(
        (user?.publicMetadata as any)?.wasPremium ||
        (user?.publicMetadata as any)?.everPremium ||
        (user?.publicMetadata as any)?.purchaseDate
      );
      const isWasPremium = !isPremium && wasPremiumByFlag;

      const sorted = [...list].sort((a, b) => a.priority - b.priority);
      return sorted.find((item) => {
        if (!isLoaded) return false;
        if (!item.isEnabled) return false;
        if (isCooldownActive(item.id)) return false;
        if (!user && !item.audience.showToGuest) return false;
        if (user && !item.audience.showToLoggedIn) return false;
        if (isPremium && !item.audience.showToPremium) return false;
        if (isWasPremium && !item.audience.showToWasPremium) return false;
        if (item.targetPaths.length === 0) return true;
        if (!pathname) return true;
        return item.targetPaths.some((pathRule) =>
          pathname.toLowerCase().includes(pathRule.toLowerCase())
        );
      }) || null;
    },
    [isLoaded, pathname, user]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadConfig() {
      try {
        const response = await fetch("/api/lead-capture/config", {
          method: "GET",
          cache: "no-store",
        });
        if (!response.ok) return;
        const payload = await response.json();
        if (!cancelled && Array.isArray(payload?.data) && payload.data.length > 0) {
          setConfigs(payload.data);
          setActiveConfig(selectCandidate(payload.data));
        }
      } catch (error) {
        console.error("[lead-capture-popup] failed to load config:", error);
      } finally {
        if (!cancelled) {
          setConfigLoaded(true);
        }
      }
    }

    loadConfig();
    return () => {
      cancelled = true;
    };
  }, [selectCandidate]);

  useEffect(() => {
    if (!configLoaded) return;
    setActiveConfig(selectCandidate(configs));
  }, [configLoaded, configs, selectCandidate]);

  const onTrigger = useCallback(
    (source: "exit_intent" | "time_on_page" | "scroll_depth") => {
      if (!configLoaded || !isLoaded || !isPathEligible || !activeConfig?.isEnabled) return;
      if (isCooldownActive(activeConfig.id)) return;
      setTriggerSource(source);
      setIsVisible(true);
    },
    [activeConfig, configLoaded, isLoaded, isPathEligible]
  );

  useLeadCaptureTriggers({
    config: {
      exitIntent: activeConfig?.exitIntent ?? FALLBACK_CONFIG.exitIntent,
      timeOnPage: activeConfig?.timeOnPage ?? FALLBACK_CONFIG.timeOnPage,
      scrollDepth: activeConfig?.scrollDepth ?? FALLBACK_CONFIG.scrollDepth,
    },
    enabled: configLoaded && isLoaded && isPathEligible && Boolean(activeConfig?.isEnabled),
    onTrigger,
  });

  const closePopup = useCallback(() => {
    if (!activeConfig) return;
    setFrequencyCap(activeConfig.id, activeConfig.frequencyCapDays);
    setIsVisible(false);
    setActiveConfig(selectCandidate(configs));
  }, [activeConfig, configs, selectCandidate]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!activeConfig) return;
      setSubmitMessage(null);
      setIsSubmitting(true);
      try {
        const response = await fetch("/api/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: firstName.trim(),
            email: email.trim(),
            sourceUrl: window.location.href,
            triggerSource,
            leadCaptureId: activeConfig.id,
          }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          setSubmitMessage(payload?.message || "Could not submit. Please retry.");
          return;
        }
        setSubmitMessage("Thanks! Check your inbox for your free guide.");
        trackEngagement.leadCaptureSubmitted(
          window.location.pathname,
          triggerSource,
          activeConfig.id
        );
        setFrequencyCap(activeConfig.id, activeConfig.frequencyCapDays);
        setTimeout(() => {
          setIsVisible(false);
          setActiveConfig(selectCandidate(configs));
        }, 1200);
      } catch (error) {
        console.error("[lead-capture-popup] submit failed:", error);
        setSubmitMessage("Could not submit. Please retry.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      activeConfig,
      configs,
      email,
      firstName,
      selectCandidate,
      triggerSource,
    ]
  );

  if (!isVisible || !activeConfig) return null;

  return (
    <div className="fixed inset-0 z-9998 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-[560px] rounded-[20px] bg-white p-6 shadow-2xl">
        <button
          type="button"
          onClick={closePopup}
          className="absolute right-2 top-2 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#D1DEFF] bg-white text-[22px] leading-none text-[#37465C] shadow-sm hover:bg-[#F7FAFF]"
          aria-label="Close popup"
        >
          <span aria-hidden>&times;</span>
        </button>

        <div className="flex flex-col gap-4">
          <h2 className="pr-8 text-[26px] font-semibold leading-[1.2] text-[#212E42]">
            {activeConfig.headline}
          </h2>
          <p className="text-[16px] leading-normal text-[#37465C]">
            {activeConfig.subHeadline}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="text"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              placeholder="First Name"
              className="h-[48px] rounded-[12px] border border-[#D1DEFF] px-4 text-[15px] text-[#212E42] outline-none focus:border-blue-500"
              required
            />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email Address"
              className="h-[48px] rounded-[12px] border border-[#D1DEFF] px-4 text-[15px] text-[#212E42] outline-none focus:border-blue-500"
              required
            />

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-1 h-[48px] rounded-[12px] bg-blue-600 px-5 text-[15px] font-semibold text-white disabled:opacity-70"
            >
              {isSubmitting ? "Sending..." : activeConfig.ctaText}
            </button>
          </form>

          {submitMessage ? (
            <p className="text-[14px] text-[#37465C]">{submitMessage}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
