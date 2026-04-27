"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { PENDING_HOME_DIAGNOSTIC_KEY } from "@/lib/pendingHomeDiagnostic";

const DISMISS_KEY = "dismiss_practice_pending_diagnostic_banner";

/**
 * Shown on `/practice-overview` when the visitor used the homepage diagnostic and
 * we have saved CLB / exam date for onboarding — sets expectations and nudges sign-up.
 */
export default function PendingDiagnosticBanner() {
  const { isLoaded, isSignedIn } = useUser();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !isLoaded || isSignedIn) return;
    try {
      if (sessionStorage.getItem(DISMISS_KEY)) return;
      const raw = localStorage.getItem(PENDING_HOME_DIAGNOSTIC_KEY);
      if (raw) setShow(true);
    } catch {
      // ignore
    }
  }, [isLoaded, isSignedIn]);

  if (!isLoaded || isSignedIn || !show) return null;

  return (
    <Box
      component="aside"
      role="status"
      sx={{
        width: 1,
        maxWidth: 1200,
        mx: "auto",
        px: 2,
        pt: 2,
        pb: 0,
      }}
    >
      <Box
        sx={{
          borderRadius: 2,
          border: "1px solid",
          borderColor: "primary.main",
          bgcolor: "rgba(25, 118, 210, 0.06)",
          p: 2,
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "stretch", sm: "center" },
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Typography
          component="p"
          sx={{ color: "#37465C", fontSize: 15, lineHeight: 1.5, m: 0, flex: 1 }}
        >
          <strong>Your target CLB and exam date are saved</strong> from the homepage. Create a
          free account to finish your personalized plan in our short onboarding.
        </Typography>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            gap: 1,
            flexShrink: 0,
            alignItems: { xs: "stretch", sm: "center" },
          }}
        >
          <Button
            component={Link}
            href="/sign-up"
            variant="contained"
            size="medium"
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            Create free account
          </Button>
          <Button
            type="button"
            size="medium"
            onClick={() => {
              try {
                sessionStorage.setItem(DISMISS_KEY, "1");
              } catch {
                // ignore
              }
              setShow(false);
            }}
            sx={{ textTransform: "none" }}
          >
            Dismiss
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
