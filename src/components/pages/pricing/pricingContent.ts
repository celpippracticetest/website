import type {
  PricingFaq,
  PricingTestimonial,
} from "@/types/pricing";

export const pricingHeroStats = [
  "Trusted by 70k+ test-takers",
  "3,000+ practice questions",
  "Instant AI feedback",
];

/** Same three facts as the pricing page stat pills — use for upgrade modals and drawers. */
export const pricingUpgradeOfferTrustLine = pricingHeroStats.join(" · ");

/** Public upgrade surfaces: aligns with “Plus” / CELPIP Practice Test naming sitewide. */
export const pricingUpgradeOfferTitle = "Join CELPIP Practice Plus";

/** Short intro — themes from `pricingSelectionSteps` and the signed-out pricing hero. */
export const pricingUpgradeOfferBody =
  "Pick the billing period that fits your exam date. Plus includes mock exams, full exam simulation, AI feedback, and the full question bank — the same live catalog as our pricing page. Try free practice first — no credit card required.";

/** Short bullets for upgrade modal headers (navbar, landing). */
export const pricingUpgradeModalHeaderBullets = [
  "60 full mock exams",
  "3,000+ practice questions",
] as const;

/** Compact value props shown once below plan CTAs in modals. */
export const pricingUpgradeModalHighlights = [
  "60 full mock exams",
  "Instant AI feedback",
  "3,000+ practice questions",
] as const;

/** Matches checkout tiles / pricing page “Unlock access to” list heading. */
export const pricingUpgradeUnlockHeading = "Unlock access to:";

export const pricingSelectionSteps = [
  {
    title: "Pick your timeline",
    description: "Choose the study length that matches your exam date and available prep time.",
  },
  {
    title: "Subscribe to Plus",
    description:
      "Plus includes mock exams, full exam simulation, AI feedback, and the full question bank. Each Subscriber plan includes up to 2 devices. If you need more than 2 devices, purchase another subscription of the same plan for each additional device.",
  },
  {
    title: "Start practicing right away",
    description: "Get instant access to questions, feedback, and exam-style practice after checkout.",
  },
];

export const pricingTestimonials: PricingTestimonial[] = [
  {
    name: "Carlos Mendoza",
    comment:
      "The speaking practice and instant feedback made my preparation much more focused. I went into the exam feeling confident.",
    source: "Carlos.png",
  },
  {
    name: "Li Wei",
    comment:
      "The platform was easy to use and the sample answers helped me understand what a high score sounds like.",
    source: "Li.png",
  },
  {
    name: "Tatiana Volkov",
    comment:
      "I used it for a month and improved across all four skills. The progress tracking was especially helpful.",
    source: "Tatiana.png",
  },
  {
    name: "Ahmed El-Sayed",
    comment:
      "The AI writing feedback helped me improve structure and clarity quickly. It felt practical, not generic.",
    source: "Ahmed.png",
  },
];

export const pricingFaqs: PricingFaq[] = [
  {
    question: "Where can I take a free CELPIP practice test online?",
    answer:
      "You can start on CELPIP Practice Test by creating a free account and accessing sample practice for Listening, Reading, Writing, and Speaking.",
  },
  {
    question: "How close are these practice tests to the real CELPIP exam?",
    answer:
      "The platform is designed to mirror the real exam format and pacing so your practice feels familiar on test day.",
  },
  {
    question: "Do I get scores and feedback right away?",
    answer:
      "Yes. You get instant AI-powered feedback so you can quickly understand what to improve next.",
  },
  {
    question: "What is included in Plus?",
    answer:
      "Plus includes 60 full mock exams, real exam simulation, 3,000+ practice questions, instant AI feedback, progress tracking, study guides, and every subscriber feature on the platform.",
  },
  {
    question: "How many devices are included in a Subscriber plan?",
    answer:
      "Each Subscriber plan includes access on up to 2 devices. If you exceed 2 devices, you must purchase another subscription of the same plan for each additional device.",
  },
  {
    question: "Which plan should I choose if my exam is soon?",
    answer:
      "If your exam is close, Weekly is the fastest option. If you want more time for score improvement, Monthly or 3-Month plans are usually better.",
  },
];
