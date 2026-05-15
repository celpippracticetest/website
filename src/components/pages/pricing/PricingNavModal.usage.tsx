/**
 * Integration examples for `PricingNavModal` (navbar / paywall).
 *
 * Production usage: `TopHeaderRightSide` opens `PricingNavModal` from the Pricing CTA.
 *
 * @see PricingNavModal.tsx
 */
"use client";

import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { Button } from "@mui/material";
import { useState } from "react";
import { PricingNavModal } from "@/components/pages/pricing/PricingNavModal";

/** Standalone pricing button — drop into any client component. */
export function PricingNavButtonExample() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        startIcon={<AutoAwesomeIcon />}
        sx={{
          backgroundColor: "#F59E0B",
          color: "#1B2B5A",
          fontWeight: 700,
          borderRadius: 2,
          px: 2.5,
          "&:hover": {
            backgroundColor: "#D97706",
          },
        }}
      >
        Pricing
      </Button>

      <PricingNavModal open={open} onOpenChange={setOpen} />
    </>
  );
}

/*
--- Inside an existing navbar (pattern) ---

const [pricingOpen, setPricingOpen] = useState(false);

<Button type="button" onClick={() => setPricingOpen(true)}>
  Pricing
</Button>

<PricingNavModal open={pricingOpen} onOpenChange={setPricingOpen} />

--- From a paywall / locked tile ---

<PricingNavModal open={pricingOpen} onOpenChange={setPricingOpen} />
*/
