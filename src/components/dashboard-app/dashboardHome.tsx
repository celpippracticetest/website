"use client";

import React, { useState } from "react";
import ArrowBack from "@mui/icons-material/ArrowBack";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import SvgSuccess from "../icons/Success";
import type { SuccessUpgradeOfferForClient } from "@/lib/successPageUpgrade";

const pageBg = "#F4F7FF";
const ink = "#212E42";
const muted = "#76808F";
const blue = "#4A7DFF";
const blueHover = "#3d6fe6";
const green = "#0DAA94";
const mint = "#E8F8F5";
const border = "#E2E8F0";
const borderSoft = "#E8EDF5";
const receiptBg = "#F8FAFC";
const upgradeBorder = "#C8D9FF";
const upgradeGradientEnd = "#F0F5FF";
const darkCta = "#212E42";
const darkCtaHover = "#1a2433";
const errorRed = "#C53030";

function formatPaymentType(raw: string | undefined): string {
  if (!raw || raw === "-") return "-";
  return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const DashboardHome = ({
  session,
  email,
  upgradeOffer = null,
}: {
  session: any;
  email: string | undefined | null;
  upgradeOffer?: SuccessUpgradeOfferForClient | null;
}) => {
  const router = useRouter();
  const [upgradeBusy, setUpgradeBusy] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);

  if (!session) {
    return (
      <Box
        component="main"
        sx={{
          display: "flex",
          minHeight: "50vh",
          width: 1,
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: pageBg,
          px: 2,
        }}
      >
        <CircularProgress sx={{ color: blue }} size={40} thickness={4} />
        <Typography sx={{ mt: 2, color: muted, fontSize: 14 }}>
          Loading receipt…
        </Typography>
      </Box>
    );
  }

  const amountCents = session?.amount_total ?? 0;
  const currency = (session?.currency as string | undefined)?.toUpperCase();
  const amountDisplay =
    currency != null
      ? `${(amountCents / 100).toFixed(2)} ${currency}`
      : (amountCents / 100).toFixed(2);

  const displayEmail =
    session?.customer_email ?? email ?? session?.customer_details?.email ?? "-";

  const goToDashboard = () => {
    router.push("/practice-overview");
    // Fallback for edge cases where app-router navigation is blocked/stale on success page.
    setTimeout(() => {
      if (window.location.pathname !== "/practice-overview") {
        window.location.assign("/practice-overview");
      }
    }, 150);
  };

  const handleUpgrade = async () => {
    if (!upgradeOffer || upgradeBusy) return;
    setUpgradeError(null);
    setUpgradeBusy(true);
    try {
      const res = await fetch("/api/checkout/success-upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: upgradeOffer.successSessionId,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setUpgradeError(data.error || "Something went wrong. Please try again.");
        return;
      }
      goToDashboard();
    } catch {
      setUpgradeError("Network error. Please try again.");
    } finally {
      setUpgradeBusy(false);
    }
  };

  const rows: {
    label: string;
    value: string;
    mono?: boolean;
    singleLine?: boolean;
  }[] = [
    {
      label: "Payment type",
      value: formatPaymentType(session?.payment_method_types?.[0]),
    },
    { label: "Email", value: displayEmail },
    { label: "Amount paid", value: amountDisplay },
    {
      label: "Transaction id",
      value: session?.invoice ?? "-",
      mono: true,
      singleLine: true,
    },
  ];

  return (
    <Box
      component="main"
      sx={{
        display: "flex",
        width: 1,
        flex: 1,
        flexDirection: "column",
        alignItems: "center",
        bgcolor: pageBg,
        px: 2,
        pb: 8,
        pt: { xs: 4, sm: 5 },
      }}
    >
      <Stack spacing={0} sx={{ width: 1, maxWidth: 480 }}>
        <Paper
          elevation={0}
          sx={{
            borderRadius: "28px",
            border: `1px solid ${border}`,
            bgcolor: "#fff",
            p: { xs: 4, sm: 5 },
            boxShadow: "0 24px 48px -12px rgba(33, 46, 66, 0.12)",
          }}
        >
          <Stack alignItems="center" textAlign="center" sx={{ width: 1 }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                bgcolor: mint,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                mb: 2,
                boxShadow: "0 0 0 8px rgba(232, 248, 245, 0.6)",
              }}
            >
              <SvgSuccess
                width={56}
                height={56}
                aria-hidden
                style={{ display: "block" }}
              />
            </Box>
            <Typography
              component="h1"
              sx={{
                color: ink,
                fontWeight: 600,
                fontSize: { xs: 24, sm: 26 },
                letterSpacing: "-0.02em",
                lineHeight: 1.2,
              }}
            >
              Payment successful
            </Typography>
          </Stack>

          <Paper
            elevation={0}
            component="dl"
            sx={{
              mt: 3,
              borderRadius: 2,
              bgcolor: receiptBg,
              border: `1px solid ${borderSoft}`,
              overflow: "hidden",
            }}
          >
            <Stack divider={<Divider sx={{ borderColor: borderSoft }} />}>
              {rows.map(({ label, value, mono, singleLine }) => (
                <Stack
                  key={label}
                  direction={{ xs: "column", sm: "row" }}
                  justifyContent="space-between"
                  alignItems={{ xs: "flex-start", sm: "baseline" }}
                  spacing={0.5}
                  sx={{ px: 1.5, py: 1 }}
                >
                  <Typography
                    component="dt"
                    sx={{
                      color: muted,
                      fontWeight: 500,
                      fontSize: { xs: 12, sm: 13 },
                      lineHeight: 1.25,
                      flexShrink: 0,
                    }}
                  >
                    {label}
                  </Typography>
                  <Typography
                    component="dd"
                    title={singleLine ? value : undefined}
                    sx={{
                      m: 0,
                      color: ink,
                      fontWeight: 500,
                      lineHeight: 1.25,
                      textAlign: { xs: "left", sm: "right" },
                      minWidth: 0,
                      maxWidth: { sm: "58%" },
                      ...(singleLine
                        ? {
                            fontFamily: "ui-monospace, monospace",
                            fontSize: { xs: 10, sm: 11 },
                            letterSpacing: "-0.02em",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }
                        : mono
                          ? {
                              fontFamily: "ui-monospace, monospace",
                              fontSize: { xs: 12, sm: 13 },
                              wordBreak: "break-all",
                            }
                          : {
                              fontSize: { xs: 13, sm: 14 },
                            }),
                    }}
                  >
                    {value}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Paper>

          {upgradeOffer ? (
            <Box
              component="section"
              aria-labelledby="success-upgrade-heading"
              sx={{
                mt: 5,
                borderRadius: 2,
                border: `1px solid ${upgradeBorder}`,
                background: `linear-gradient(180deg, #fff 0%, ${upgradeGradientEnd} 100%)`,
                p: { xs: 3, sm: 4 },
                boxShadow: "0 12px 32px -12px rgba(74, 125, 255, 0.3)",
              }}
            >
              <Typography
                textAlign="center"
                sx={{
                  color: ink,
                  fontWeight: 600,
                  fontSize: 15,
                  lineHeight: 1.35,
                }}
              >
                Last chance to get 50% off
              </Typography>
              <Typography
                id="success-upgrade-heading"
                textAlign="center"
                sx={{
                  mt: 1,
                  color: blue,
                  fontWeight: 600,
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                One-time upgrade offer
              </Typography>

              <Paper
                elevation={0}
                sx={{
                  mt: 2.5,
                  borderRadius: 2,
                  bgcolor: "rgba(255,255,255,0.9)",
                  border: `1px solid ${borderSoft}`,
                  px: 2,
                  py: 2.5,
                }}
              >
                <Typography
                  textAlign="center"
                  sx={{ color: ink, fontSize: 15, lineHeight: 1.6 }}
                >
                  Pay{" "}
                  <Box component="span" sx={{ fontWeight: 600, color: green }}>
                    {upgradeOffer.promoFirstPeriodDisplay}
                  </Box>{" "}
                  instead of{" "}
                  <Box
                    component="span"
                    sx={{
                      fontWeight: 600,
                      color: muted,
                      textDecoration: "line-through",
                      textDecorationColor: "rgba(118, 128, 143, 0.6)",
                    }}
                  >
                    {upgradeOffer.fullRegularUnitDisplay}
                  </Box>{" "}
                  for your {upgradeOffer.targetBillingPlanPhrase}.
                </Typography>
                <Typography
                  textAlign="center"
                  sx={{
                    mt: 2.5,
                    color: green,
                    fontWeight: 600,
                    fontSize: 32,
                    letterSpacing: "-0.02em",
                    lineHeight: 1.1,
                  }}
                >
                  {upgradeOffer.promoFirstPeriodDisplay}
                </Typography>
                <Typography
                  textAlign="center"
                  sx={{
                    mt: 2,
                    color: muted,
                    fontSize: 12,
                    lineHeight: 1.5,
                  }}
                >
                  {upgradeOffer.promoExplanation}
                </Typography>
              </Paper>

              <Stack spacing={1.5} sx={{ mt: 2.5 }}>
                <Button
                  type="button"
                  variant="contained"
                  fullWidth
                  disabled={upgradeBusy}
                  onClick={handleUpgrade}
                  sx={{
                    borderRadius: "24px",
                    py: 1.5,
                    fontSize: 15,
                    fontWeight: 600,
                    textTransform: "none",
                    bgcolor: darkCta,
                    boxShadow: "0 10px 24px -8px rgba(33, 46, 66, 0.45)",
                    "&:hover": { bgcolor: darkCtaHover },
                  }}
                >
                  {upgradeBusy ? "Upgrading…" : "Upgrade now"}
                </Button>
                {upgradeError ? (
                  <Alert severity="error" sx={{ py: 0.5, fontSize: 13 }}>
                    {upgradeError}
                  </Alert>
                ) : null}
              </Stack>
            </Box>
          ) : null}

          <Button
            type="button"
            variant="contained"
            fullWidth
            startIcon={<ArrowBack sx={{ fontSize: 16 }} />}
            onClick={goToDashboard}
            sx={{
              mt: 5,
              borderRadius: "24px",
              py: 1.25,
              fontSize: 14,
              fontWeight: 500,
              textTransform: "none",
              bgcolor: blue,
              boxShadow: "0 8px 20px -6px rgba(74, 125, 255, 0.55)",
              "&:hover": { bgcolor: blueHover },
            }}
          >
            Back to dashboard
          </Button>
        </Paper>
      </Stack>
    </Box>
  );
};

export default DashboardHome;
