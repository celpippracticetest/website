"use client";

import PeopleIcon from "@mui/icons-material/People";
import QuizIcon from "@mui/icons-material/Quiz";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import SpeedIcon from "@mui/icons-material/Speed";
import StarIcon from "@mui/icons-material/Star";

const metrics = [
  { Icon: PeopleIcon, value: "70,000+", label: "Test-Takers Trust Us" },
  { Icon: QuizIcon, value: "60+", label: "Full Mock Exams" },
  { Icon: AutoAwesomeIcon, value: "3,000+", label: "Practice Questions" },
  { Icon: SpeedIcon, value: "Instant", label: "AI-Powered Scoring" },
  { Icon: StarIcon, value: "4.9/5", label: "Average Rating" },
];

export function HomeSocialProofBar() {
  return (
    <section
      aria-label="Platform reach and trust"
      className="border-y border-slate-200 bg-white py-10 screen744:py-12"
    >
      <div className="mx-auto max-w-[1200px] px-4 screen744:px-8">
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 screen744:grid-cols-3 screen744:gap-8 screen1280:grid-cols-5">
          {metrics.map(({ Icon, value, label }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center text-[#2563EB]">
                <Icon sx={{ fontSize: 28 }} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-lg font-extrabold leading-tight text-[#1B2B5A] screen744:text-[1.35rem]">
                  {value}
                </p>
                <p className="text-[0.7rem] font-medium leading-snug text-slate-600 screen744:text-[0.8125rem]">
                  {label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
