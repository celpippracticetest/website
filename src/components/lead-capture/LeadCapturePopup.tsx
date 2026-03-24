"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  Backdrop,
  Box,
  Button,
  Fade,
  IconButton,
  Modal,
  TextField,
  Typography,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
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
      const isPremium =
        plan === "premium" ||
        plan === "pro" ||
        plan === "plus" ||
        plan === "enterprise";
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
    [activeConfig, configLoaded, isLoaded, isPathEligible, pathname]
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
  }, [activeConfig, configs, pathname, selectCandidate, triggerSource]);

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
    <Modal
      open={isVisible}
      onClose={closePopup}
      closeAfterTransition
      BackdropComponent={Backdrop}
      BackdropProps={{
        timeout: 250,
        sx: {
          backgroundColor: "rgba(12, 19, 34, 0.62)",
          backdropFilter: "blur(4px)",
        },
      }}
      aria-labelledby="lead-capture-title"
      aria-describedby="lead-capture-description"
    >
      <Fade in={isVisible} timeout={250}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "calc(100% - 32px)",
            maxWidth: 560,
            borderRadius: "22px",
            bgcolor: "#FFFFFF",
            boxShadow: "0 26px 60px rgba(17, 41, 85, 0.28)",
            border: "1px solid #DDE8FF",
            overflow: "hidden",
            outline: "none",
          }}
        >
          <Box
            sx={{
              px: { xs: 2.5, sm: 4 },
              pt: { xs: 2.5, sm: 3 },
              pb: { xs: 2, sm: 2.5 },
              background:
                "linear-gradient(180deg, rgba(66, 133, 244, 0.12) 0%, rgba(66, 133, 244, 0.03) 100%)",
              borderBottom: "1px solid #E8EEFF",
              position: "relative",
            }}
          >
            <IconButton
              aria-label="Close popup"
              onClick={closePopup}
              sx={{
                position: "absolute",
                top: 14,
                right: 14,
                color: "#425466",
                backgroundColor: "#FFFFFF",
                border: "1px solid #D5E3FF",
                boxShadow: "0 6px 14px rgba(31, 80, 164, 0.12)",
                "&:hover": {
                  backgroundColor: "#F4F8FF",
                },
              }}
            >
              <CloseRoundedIcon fontSize="small" />
            </IconButton>

            <Typography
              id="lead-capture-title"
              sx={{
                pr: 6,
                color: "#10243E",
                fontWeight: 700,
                fontSize: { xs: 24, sm: 28 },
                lineHeight: 1.2,
                letterSpacing: "-0.02em",
              }}
            >
              {activeConfig.headline}
            </Typography>
            <Typography
              id="lead-capture-description"
              sx={{
                mt: 1.5,
                color: "#46566D",
                fontSize: { xs: 15, sm: 16 },
                lineHeight: 1.55,
              }}
            >
              {activeConfig.subHeadline}
            </Typography>
          </Box>

          <Box sx={{ px: { xs: 2.5, sm: 4 }, py: { xs: 2.5, sm: 3 } }}>
            <Box
              component="form"
              onSubmit={handleSubmit}
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 1.5,
              }}
            >
              <TextField
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                placeholder="First Name"
                required
                fullWidth
                autoComplete="given-name"
                variant="outlined"
                InputProps={{
                  sx: {
                    borderRadius: "12px",
                    backgroundColor: "#FAFCFF",
                  },
                }}
              />

              <TextField
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email Address"
                required
                fullWidth
                autoComplete="email"
                variant="outlined"
                InputProps={{
                  sx: {
                    borderRadius: "12px",
                    backgroundColor: "#FAFCFF",
                  },
                }}
              />

              <Button
                type="submit"
                disabled={isSubmitting}
                fullWidth
                sx={{
                  mt: 0.5,
                  height: 50,
                  borderRadius: "12px",
                  textTransform: "none",
                  color: "#FFFFFF",
                  fontWeight: 700,
                  fontSize: 15,
                  background: "linear-gradient(90deg, #2563EB 0%, #3B82F6 100%)",
                  boxShadow: "0 10px 22px rgba(37, 99, 235, 0.32)",
                  "&:hover": {
                    background: "linear-gradient(90deg, #1D4ED8 0%, #2563EB 100%)",
                  },
                  "&.Mui-disabled": {
                    color: "#FFFFFF",
                    opacity: 0.72,
                  },
                }}
              >
                {isSubmitting ? "Sending..." : activeConfig.ctaText}
              </Button>
            </Box>

            {submitMessage ? (
              <Typography
                sx={{
                  mt: 1.5,
                  color: submitMessage.startsWith("Thanks") ? "#067647" : "#B42318",
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                {submitMessage}
              </Typography>
            ) : null}
          </Box>
        </Box>
      </Fade>
    </Modal>
  );
}
