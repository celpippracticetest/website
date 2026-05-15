"use client";

import Link from "next/link";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import { useEventTracker } from "@/hooks/useTracking";

export function HomeCtaBanner() {
  const { trackCTA } = useEventTracker();

  return (
    <section
      aria-labelledby="cta-banner-heading"
      className="relative overflow-hidden bg-gradient-to-br from-[#1B2B5A] via-[#2E4494] to-[#1B2B5A] py-14 screen744:py-20"
    >
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-500/10"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-amber-400/10"
        aria-hidden
      />

      <div className="relative z-[1] mx-auto max-w-[640px] px-4 text-center screen744:px-8">
        <span className="mb-4 inline-block rounded-full border border-amber-400/30 bg-amber-400/15 px-3 py-1 text-xs font-semibold text-amber-200">
          Your exam date is approaching
        </span>
        <h2
          id="cta-banner-heading"
          className="text-balance text-3xl font-extrabold text-white screen744:text-[2.75rem] screen744:leading-tight"
        >
          Ready to Hit Your Target Score?
        </h2>
        <p className="mx-auto mt-4 max-w-[500px] text-base text-white/75 screen744:text-lg">
          Start practicing now with instant AI feedback. Most users see improvement
          within their first week.
        </p>

        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 screen744:flex-row screen744:items-center">
          <Link
            href="/practice-overview"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-br from-amber-400 to-amber-300 px-7 py-3.5 text-base font-bold text-[#1B2B5A] shadow-[0_4px_14px_rgba(245,158,11,0.4)] transition-shadow hover:shadow-[0_6px_20px_rgba(245,158,11,0.45)]"
            onClick={() => trackCTA("Start Free Practice", "home_cta_banner_primary")}
          >
            Start Free Practice
            <ArrowForwardIcon sx={{ fontSize: 22 }} aria-hidden />
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 bg-transparent px-6 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/50 hover:bg-white/5"
            onClick={() => trackCTA("View Pricing", "home_cta_banner_secondary")}
          >
            <LockOpenIcon sx={{ fontSize: 20 }} aria-hidden />
            View Pricing
          </Link>
        </div>

        <p className="mt-6 text-sm text-white/60">
          No credit card required • Cancel anytime • 48-hour refund guarantee
        </p>
      </div>
    </section>
  );
}
