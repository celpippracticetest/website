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
      className="relative overflow-hidden border-y border-slate-200/80 bg-slate-800 py-14 screen744:py-20"
    >
      <div className="relative z-[1] mx-auto max-w-[640px] px-4 text-center screen744:px-8">
        <span className="mb-4 inline-block rounded-full border border-slate-500/50 bg-slate-700/80 px-3 py-1 text-xs font-semibold text-slate-200">
          Your exam date is approaching
        </span>
        <h2
          id="cta-banner-heading"
          className="text-balance text-3xl font-extrabold text-white screen744:text-[2.75rem] screen744:leading-tight"
        >
          Ready to Hit Your Target Score?
        </h2>
        <p className="mx-auto mt-4 max-w-[500px] text-base text-slate-300 screen744:text-lg">
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
            className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-500 bg-transparent px-6 py-3.5 text-base font-semibold text-slate-100 transition-colors hover:border-slate-400 hover:bg-slate-700/50"
            onClick={() => trackCTA("View Pricing", "home_cta_banner_secondary")}
          >
            <LockOpenIcon sx={{ fontSize: 20 }} aria-hidden />
            View Pricing
          </Link>
        </div>

        <p className="mt-6 text-sm text-slate-400">
          No credit card required • Cancel anytime • 48-hour refund guarantee
        </p>
      </div>
    </section>
  );
}
