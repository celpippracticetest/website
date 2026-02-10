"use client";

import Link from "next/link";
import { Box } from "@/components/ui/Box";
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";

const REFERRAL_MESSAGE =
  "Know a friend struggling with CELPIP? Share this guide and you both get 15% off our Pro Pack.";
const CTA_LABEL = "Get your referral link";
const REFERRAL_LINK = "/referral";

export function BlogReferralBar() {
  return (
    <Box className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
      <Box className="cel-container flex flex-col items-center gap-3 py-3 sm:flex-row sm:justify-between sm:py-4">
        <p className="text-center text-sm font-medium text-slate-800 sm:text-left">
          {REFERRAL_MESSAGE}
        </p>
        <Link href={REFERRAL_LINK} className="shrink-0">
          <Button
            size="sm"
            variant="default"
            className="cursor-pointer gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Share2 className="h-4 w-4" />
            {CTA_LABEL}
          </Button>
        </Link>
      </Box>
    </Box>
  );
}
