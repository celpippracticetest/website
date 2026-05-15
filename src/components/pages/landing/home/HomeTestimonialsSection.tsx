"use client";

import FormatQuoteIcon from "@mui/icons-material/FormatQuote";
import VerifiedIcon from "@mui/icons-material/Verified";
import Rating from "@mui/material/Rating";

const testimonials = [
  {
    name: "Ravi M.",
    avatar: "https://i.pravatar.cc/128?u=celpip-t1",
    role: "Express Entry Applicant",
    score: "CLB 9",
    quote:
      "The timed practice tests were identical to the real test. That practice enabled me to manage stress and finish each section within the allotted time.",
    rating: 5,
  },
  {
    name: "Tatiana K.",
    avatar: "https://i.pravatar.cc/128?u=celpip-t2",
    role: "PNP Applicant",
    score: "CLB 8",
    quote:
      "Simple and efficient. Practiced for a month and improved in all 4 areas. Having the dashboard tracking my progress was a lovely addition.",
    rating: 5,
  },
  {
    name: "Carlos R.",
    avatar: "https://i.pravatar.cc/128?u=celpip-t3",
    role: "Citizenship Applicant",
    score: "CLB 9 (all sections)",
    quote:
      "Practice in speaking and getting instant feedback increased my confidence level. I cleared with 9 in all sections!",
    rating: 5,
  },
  {
    name: "Ahmed S.",
    avatar: "https://i.pravatar.cc/128?u=celpip-t4",
    role: "Healthcare Worker",
    score: "CLB 9 Writing",
    quote:
      "I finally got CLB 9 in writing after doing 2 weeks of practice tests. The AI feedback was exactly what I needed to improve structure and coherence.",
    rating: 5,
  },
];

export function HomeTestimonialsSection() {
  return (
    <section
      aria-labelledby="testimonials-heading"
      className="bg-[linear-gradient(180deg,#F8FAFC_0%,#EEF2FF_100%)] py-14 screen744:py-20"
    >
      <div className="mx-auto max-w-[1200px] px-4 screen744:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center screen744:mb-14">
          <span className="mb-3 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
            Success Stories
          </span>
          <h2
            id="testimonials-heading"
            className="text-balance text-3xl font-extrabold text-slate-900 screen744:text-4xl"
          >
            Join 70,000+ Who{" "}
            <span className="text-amber-600">Passed CELPIP</span>
          </h2>
          <p className="mt-3 text-base text-slate-600 screen744:text-lg">
            Real results from real test-takers who prepared with our platform.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 screen744:grid-cols-2 screen1280:grid-cols-4">
          {testimonials.map((t) => (
            <article
              key={t.name}
              className="flex h-full flex-col rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-transform duration-300 hover:-translate-y-1 hover:shadow-md"
            >
              <FormatQuoteIcon
                sx={{ fontSize: 32, color: "#93C5FD", opacity: 0.7 }}
                aria-hidden
              />
              <Rating
                value={t.rating}
                readOnly
                size="small"
                sx={{ my: 1.5 }}
              />
              <p className="mb-4 min-h-[6.5rem] flex-1 text-sm leading-relaxed text-slate-600">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="mt-auto flex items-center gap-3 border-t border-slate-100 pt-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={t.avatar}
                  alt={t.name}
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-full object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="truncate text-sm font-semibold text-slate-900">
                      {t.name}
                    </span>
                    <VerifiedIcon sx={{ fontSize: 14, color: "#3B82F6" }} aria-hidden />
                  </div>
                  <p className="truncate text-xs text-slate-500">{t.role}</p>
                </div>
              </div>
              <span className="mt-3 inline-flex w-fit rounded-full bg-emerald-50 px-2.5 py-1 text-[0.7rem] font-bold text-emerald-700">
                {t.score}
              </span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
