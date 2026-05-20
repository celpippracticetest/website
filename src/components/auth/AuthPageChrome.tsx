"use client";

import { useRecentSignupsLiveStat } from "@/hooks/useRecentSignupsLiveStat";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import StarIcon from "@mui/icons-material/Star";

const BENEFITS = [
  "Access practice across all 4 skills",
  "Try sample mock exam questions",
  "Get instant AI feedback on writing",
  "Track your progress over time",
  "No credit card required",
] as const;

export const AUTH_PAGE_BACKGROUND_CLASS =
  "min-h-screen bg-[linear-gradient(135deg,#FAFBFF_0%,#EEF2FF_50%,#F8FAFC_100%)]";

export function AuthLiveJoinedBanner() {
  const { display } = useRecentSignupsLiveStat("3,358");

  return (
    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-center">
      <p className="text-xs font-semibold text-emerald-700">
        {display} people joined today
      </p>
    </div>
  );
}

export function AuthMarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${AUTH_PAGE_BACKGROUND_CLASS} flex flex-col justify-center py-10 md:min-h-screen md:py-12`}
    >
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 px-4 md:grid-cols-2 md:gap-12 md:px-8 lg:gap-16">
        <aside className="hidden md:block md:max-w-lg md:pr-4">
          <h2 className="text-balance text-3xl font-extrabold leading-tight text-[#1B2B5A] lg:text-4xl">
            Start Your CELPIP Journey Today
          </h2>
          <p className="mt-3 text-base leading-relaxed text-slate-600 lg:text-lg">
            Join 70,000+ test-takers who improved their scores with our platform.
          </p>
          <ul className="mt-8 space-y-3">
            {BENEFITS.map((line) => (
              <li key={line} className="flex items-start gap-3">
                <CheckCircleIcon
                  sx={{ fontSize: 22, color: "#10B981", flexShrink: 0 }}
                  aria-hidden
                />
                <span className="text-[15px] font-medium leading-snug text-slate-800">
                  {line}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <StarIcon key={i} sx={{ fontSize: 18, color: "#F59E0B" }} aria-hidden />
              ))}
            </div>
            <p className="mt-3 text-sm italic leading-relaxed text-slate-600">
              &ldquo;I got CLB 9 in all sections after just 3 weeks of practice. The AI
              feedback on writing was a game-changer.&rdquo;
            </p>
            <div className="mt-4 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://i.pravatar.cc/128?u=celpip-auth-carlos"
                alt=""
                width={32}
                height={32}
                className="h-8 w-8 rounded-full border border-slate-100 object-cover"
              />
              <div>
                <p className="text-sm font-semibold text-slate-900">Carlos R.</p>
                <p className="text-xs text-slate-500">Achieved CLB 9</p>
              </div>
            </div>
          </div>
        </aside>
        <div className="mx-auto w-full max-w-[440px]">{children}</div>
      </div>
    </div>
  );
}

export function AuthLoadingCard() {
  return (
    <div
      className={`${AUTH_PAGE_BACKGROUND_CLASS} flex items-center justify-center px-4 py-12`}
    >
      <div className="w-full max-w-md rounded-3xl border border-slate-200/90 bg-white p-8 text-center shadow-md">
        <p className="text-sm text-slate-600">Loading…</p>
      </div>
    </div>
  );
}
