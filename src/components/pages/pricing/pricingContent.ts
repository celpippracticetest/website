import type {
  PricingFaq,
  PricingTestimonial,
} from "@/types/pricing";

export const pricingHeroStats = [
  "Trusted by 70k+ test-takers",
  "3,000+ practice questions",
  "Instant AI feedback",
];

export const pricingSelectionSteps = [
  {
    title: "Pick your timeline",
    description: "Choose the study length that matches your exam date and available prep time.",
  },
  {
    title: "Choose your access level",
    description: "Premium covers daily practice. Premium Plus adds mock exams for full-test prep.",
  },
  {
    title: "Start practicing right away",
    description: "Get instant access to questions, feedback, and exam-style practice after checkout.",
  },
];

export const comparisonRows = [
  { label: "3,000+ sample questions", premium: true, premiumPlus: true },
  { label: "Study guides and tips", premium: true, premiumPlus: true },
  { label: "Instant AI feedback", premium: true, premiumPlus: true },
  { label: "Progress tracking", premium: true, premiumPlus: true },
  { label: "Full exam experience", premium: true, premiumPlus: true },
  { label: "Mock exams", premium: false, premiumPlus: true },
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
    question: "What is the difference between Premium and Premium Plus?",
    answer:
      "Premium is best for daily practice with questions, feedback, and tracking. Premium Plus includes everything in Premium plus mock exams.",
  },
  {
    question: "Which plan should I choose if my exam is soon?",
    answer:
      "If your exam is close, Weekly is the fastest option. If you want more time for score improvement, Monthly or 3-Month plans are usually better.",
  },
];
