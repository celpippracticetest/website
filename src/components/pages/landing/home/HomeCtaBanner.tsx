"use client";

import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import { Button } from "@/components/v2/Button";
import { useEventTracker } from "@/hooks/useTracking";

export function HomeCtaBanner() {
  const { trackCTA } = useEventTracker();

  return (
    <section
      aria-labelledby="cta-banner-heading"
      className="relative overflow-hidden border-y border-outline/80 bg-[linear-gradient(180deg,#F2F6FF_0%,#E3EBFF_55%,#F4F7FF_100%)] py-14 screen744:py-20"
    >
      <div className="relative z-[1] mx-auto max-w-[640px] px-4 text-center screen744:px-8">
        <span className="mb-4 inline-block rounded-full border border-primary1/20 bg-primary6 px-3 py-1 text-xs font-semibold text-primary1">
          Your exam date is approaching
        </span>
        <h2
          id="cta-banner-heading"
          className="text-balance text-3xl font-extrabold text-text1 screen744:text-[2.75rem] screen744:leading-tight"
        >
          Ready to Hit Your Target Score?
        </h2>
        <p className="mx-auto mt-4 max-w-[500px] text-base text-text2 screen744:text-lg">
          Start practicing now with instant AI feedback. Most users see improvement
          within their first week.
        </p>

        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 screen744:flex-row screen744:items-center screen744:justify-center">
          <Button
            size="lg"
            variant="primary"
            href="/practice-overview"
            className="w-full px-6 screen744:w-auto screen744:min-w-[260px] screen744:px-8"
            onClick={() => trackCTA("Start Free Practice", "home_cta_banner_primary")}
          >
            Start Free Practice
            <ArrowForwardIcon sx={{ fontSize: 22 }} aria-hidden />
          </Button>
          <Button
            size="lg"
            variant="outlinePrimary"
            href="/pricing"
            className="w-full px-6 screen744:w-auto screen744:min-w-[260px] screen744:px-8"
            onClick={() => trackCTA("View Pricing", "home_cta_banner_secondary")}
          >
            <LockOpenIcon sx={{ fontSize: 20 }} aria-hidden />
            View Pricing
          </Button>
        </div>

        <ul className="m-0 mt-6 flex list-none flex-col items-center gap-2 p-0 text-sm text-text3 screen744:flex-row screen744:flex-wrap screen744:justify-center screen744:gap-x-6 screen744:gap-y-2">
          <li>No credit card required</li>
          <li>Cancel anytime</li>
          <li>48-hour refund guarantee</li>
        </ul>
      </div>
    </section>
  );
}
