"use client";

import VerifiedIcon from "@mui/icons-material/Verified";
import StarIcon from "@mui/icons-material/Star";
import Image from "next/image";
import { useEffect, useState } from "react";
import PublicPageShell from "@/components/pages/landing/PublicPageShell";
import { PricingUpgradeModalHeaderList } from "@/components/pages/pricing/PricingUpgradeModalHeaderList";
import { useRecentSignupsLiveStat, useRecentVisitsLiveStat } from "@/hooks/useRecentSignupsLiveStat";

const AUTH_ROTATING_TESTIMONIALS = [
  {
    name: "Carlos R.",
    subtitle: "Achieved CLB 9",
    comment:
      "I got CLB 9 in all sections after just 3 weeks of practice. The AI feedback on writing was a game-changer.",
    avatar: "/images/Carlos.png",
  },
  {
    name: "Tatiana V.",
    subtitle: "Improved all four skills",
    comment:
      "I used it for a month and improved across all four skills. The progress tracking was especially helpful.",
    avatar: "/images/Tatiana.png",
  },
  {
    name: "Ahmed E.",
    subtitle: "Stronger writing scores",
    comment:
      "The AI writing feedback helped me improve structure and clarity quickly. It felt practical, not generic.",
    avatar: "/images/Ahmed.png",
  },
  {
    name: "Li W.",
    subtitle: "Better speaking confidence",
    comment:
      "The platform was easy to use and the sample answers helped me understand what a high score sounds like.",
    avatar: "/images/Li.png",
  },
] as const;

const AUTH_TESTIMONIAL_ROTATE_MS = 5_000;

function AuthRotatingTestimonial() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % AUTH_ROTATING_TESTIMONIALS.length);
    }, AUTH_TESTIMONIAL_ROTATE_MS);

    return () => window.clearInterval(id);
  }, []);

  const testimonial = AUTH_ROTATING_TESTIMONIALS[index];

  return (
    <div
      className="mt-8 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm"
      aria-live="polite"
    >
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <StarIcon key={i} sx={{ fontSize: 18, color: "#F59E0B" }} aria-hidden />
        ))}
      </div>
      <p
        key={testimonial.comment}
        className="mt-3 text-sm italic leading-relaxed text-text2 transition-opacity duration-500"
      >
        &ldquo;{testimonial.comment}&rdquo;
      </p>
      <div className="mt-4 flex items-center gap-3">
        <Image
          src={testimonial.avatar}
          alt=""
          width={32}
          height={32}
          className="h-8 w-8 rounded-full border border-slate-100 object-cover"
        />
        <div>
          <p className="text-sm font-semibold text-text1">{testimonial.name}</p>
          <p className="text-xs text-text3">{testimonial.subtitle}</p>
        </div>
      </div>
    </div>
  );
}

export function AuthLiveJoinedBanner() {
  const { display } = useRecentSignupsLiveStat("3,358");

  return (
    <div className="mt-4 px-3 py-2.5 text-center">
      <p className="text-xs font-semibold text-emerald-700">
        {display} people joined today
      </p>
    </div>
  );
}

export function AuthMarketingShell({ children }: { children: React.ReactNode }) {
  const { count: visitsCount, display: visitsDisplay } = useRecentVisitsLiveStat("");

  return (
    <PublicPageShell liveBackground hideFooter>
      <div className="flex flex-col justify-center py-8 screen744:py-10 screen1024:min-h-[calc(100vh-96px)] screen1024:py-12">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-8 px-4 screen744:px-8 screen1024:grid-cols-2 screen1024:gap-12 screen1280:gap-16">
          <aside className="hidden screen1024:block screen1024:max-w-lg screen1024:pr-4">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full px-1 py-0.5">
              <VerifiedIcon sx={{ fontSize: 16, color: "#316BFF" }} aria-hidden />
              <span className="text-[0.813rem] font-semibold text-primary1">
                #1 Rated CELPIP Prep Platform 2026
              </span>
            </div>
            <h1 className="text-balance text-[2rem] font-extrabold leading-[1.12] text-text1 screen744:text-[2.5rem] screen1280:text-[2.75rem]">
              <span className="text-primary1">Reach Your Target CELPIP Score.</span>{" "}
              <span className="text-secondary2">Faster.</span>
            </h1>
            <p className="mt-3 text-base leading-relaxed text-text2 screen744:text-lg">
              Join 70,000+ test-takers who improved their scores with mock exams, AI
              feedback, and full exam simulation.
            </p>
            <div className="mt-6 max-w-md">
              <PricingUpgradeModalHeaderList
                visitsDisplay={visitsCount != null ? visitsDisplay : undefined}
                itemTextClassName="text-text2 screen744:text-base"
                emphasisTextClassName="font-semibold text-text1 screen744:text-base"
              />
            </div>
            <AuthRotatingTestimonial />
          </aside>

          <div className="mx-auto w-full max-w-[440px]">{children}</div>
        </div>
      </div>
    </PublicPageShell>
  );
}

export function AuthLoadingCard() {
  return (
    <PublicPageShell liveBackground hideFooter>
      <div className="flex items-center justify-center px-4 py-12 screen1024:min-h-[calc(100vh-96px)]">
        <div className="w-full max-w-md rounded-2xl border border-slate-200/90 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-text2">Loading…</p>
        </div>
      </div>
    </PublicPageShell>
  );
}
