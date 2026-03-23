"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Box } from "@/components/ui/Box";
import PlanCard from "@/components/pages/plans/PlanCard";
import Image from "next/image";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import {
  SvgTeacher,
  SvgPresenceAbsence,
  SvgBot,
  SvgTaskSquare,
} from "@/components/icons";
import SvgDiamond from "@/components/icons/Diamond";
import { ChevronDown, ChevronUp, CheckCircle2, Sparkles } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import type { SerializedPlan } from "@/types/pricing";
import SvgBestValuePlan from "@/components/icons/BestValuePlan";
import SvgPopularPlan from "@/components/icons/PopularPlan";
import SvgFreePlan from "@/components/icons/FreePlan";
import img1 from "@/images/attachment.png";
import img2 from "@/images/attachment2.png";
import img3 from "@/images/attachment3.png";
import img5 from "@/images/attachment5.png";
import img6 from "@/images/attachment6.png";
import img7 from "@/images/attachment7.png";
import img8 from "@/images/attachment8.png";
import img9 from "@/images/attachment9.png";

const Svg5Star = dynamic(() => import("@/components/icons/5Star"), {
  ssr: false,
});

import { useEngagementTracking } from "@/hooks/useTracking";
import { useUserContext } from "@/hooks/useUserContext";

const FAQItem = ({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { faqClick } = useEngagementTracking();

  const handleToggle = () => {
    if (!isOpen) {
      faqClick(question, "pricing_page");
    }
    setIsOpen(!isOpen);
  };

  return (
    <Box className="border border-gray-200 rounded-lg mb-3 overflow-hidden bg-white">
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between p-4 text-left bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span className="font-medium text-gray-800 text-sm md:text-base">
          {question}
        </span>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </button>
      {isOpen && (
        <Box className="p-4 text-gray-600 text-sm bg-white border-t border-gray-100">
          {answer}
        </Box>
      )}
    </Box>
  );
};

const TestimonialCard = ({
  name,
  comment,
  source,
}: {
  name: string;
  comment: string;
  source: string;
}) => (
  <Box className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3 h-full">
    <Box className="flex items-center gap-3">
      <Image
        src={`/images/${source}`}
        alt={name}
        width={40}
        height={40}
        className="rounded-full"
      />
      <Box>
        <h4 className="font-bold text-sm text-gray-900">{name}</h4>
        <Svg5Star />
      </Box>
    </Box>
    <p className="text-gray-600 text-xs leading-relaxed">{comment}</p>
  </Box>
);

const AvatarCarousel = () => {
  const avatars = ["Carlos.png", "Li.png", "Tatiana.png", "Ahmed.png", "Dalia.png"];
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % avatars.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [avatars.length]);

  const visibleAvatars = [
    avatars[currentIndex],
    avatars[(currentIndex + 1) % avatars.length],
    avatars[(currentIndex + 2) % avatars.length],
  ];

  return (
    <Box className="flex -space-x-2 overflow-hidden w-[80px] h-8 relative">
      <AnimatePresence mode="popLayout">
        {visibleAvatars.map((src, i) => (
          <motion.div
            key={`${src}-${i}`}
            initial={{ x: 20, opacity: 0, scale: 0.8 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: -20, opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.5 }}
            className="relative w-8 h-8 rounded-full border-2 border-white overflow-hidden shrink-0"
            style={{ zIndex: 3 - i }}
          >
            <Image
              src={`/images/${src}`}
              alt="User Avatar"
              fill
              className="object-cover"
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </Box>
  );
};

const testimonials = [
  {
    name: "Carlos Mendoza",
    comment:
      "CELPIPPRACTICETEST.com made my practice a revolutionary process. Practice in speaking and getting instant feedback increased my confidence level. I cleared with 9 in all sections!",
    source: "Carlos.png",
  },
  {
    name: "Li Wei",
    comment:
      "The practice of speaking on this website is amazing. I practiced and listened to the high-score examples. It was so helpful.",
    source: "Li.png",
  },
  {
    name: "Tatiana Volkov",
    comment:
      "Simple and efficient. Practiced for a month and improved in all 4 areas. Having the dashboard tracking my progress was a lovely addition.",
    source: "Tatiana.png",
  },
  {
    name: "Ahmed El-Sayed",
    comment:
      "I finally got CLB 9 in writing after doing 2 weeks of practice tests at CELPIPPRACTICETEST.com. The AI feedback was exactly what I needed to improve structure and coherence. I highly recommend it!",
    source: "Ahmed.png",
  },
  {
    name: "Dalia Haddad",
    comment:
      "So many useful tips that I learned from the reading section. Mock tests are challenging but true to life. Assisted to calm down fears.",
    source: "Dalia.png",
  },
];

const faqs = [
  {
    question:
      "Where can one take a full CELPIP practice test free of charge online?",
    answer:
      "You can take a free full-length CELPIP practice test right here on CELPIPPracticetest.com. Simply sign up for a free account to access our sample test which includes Listening, Reading, Writing, and Speaking sections with AI-powered scoring.",
  },
  {
    question: "How exact are CELPIP practice tests compared to the real test?",
    answer:
      "Our simulations attempt to replicate the actual CELPIP test format and duration. With AI-based scoring, your scores reflect real exam performance, enabling you to better estimate your CLB levels.",
  },
  {
    question: "Will I get instant online CELPIP scores and feedback?",
    answer:
      "Yes! Our platform provides instant AI scoring and detailed feedback for all sections, including Speaking and Writing, so you can identify your strengths and weaknesses immediately.",
  },
  {
    question:
      "What are the best 4 skills on the CELPIP practice platform?",
    answer:
      "Our platform covers all 4 skills: Listening, Reading, Writing, and Speaking. We provide targeted practice and strategies for each skill to help you maximize your CLB score.",
  },
  {
    question: "Do your CELPIP mock tests simulate real exam settings?",
    answer:
      "Yes, our mock tests are designed to simulate the real exam environment, including strict timing and interface layout, to help you get comfortable with the test day experience.",
  },
  {
    question: "What do you offer on CELPIPPracticeTest.com?",
    answer:
      "We offer a comprehensive preparation suite including full-length mock exams, practice questions for individual skills, AI scoring and feedback, study guides, and performance tracking.",
  },
  {
    question: "Is CELPIP better than IELTS?",
    answer:
      "It depends on your personal preference. CELPIP is fully computer-delivered and uses Canadian English, which some test-takers find more relatable for Canadian immigration. IELTS offers both paper and computer options. We recommend trying a practice test for both to see which suits you better.",
  },
];

const universityImages = [img1, img2, img3, img5, img6, img7, img8, img9];

function getIconComponent(iconType?: string) {
  switch (iconType) {
    case "BestValuePlan":
      return <SvgBestValuePlan />;
    case "PopularPlan":
      return <SvgPopularPlan />;
    case "FreePlan":
      return <SvgFreePlan />;
    default:
      return <SvgFreePlan />;
  }
}

interface PricingPageClientProps {
  plans: SerializedPlan[];
}

function isThreeMonthPlan(plan: SerializedPlan) {
  const planText = `${plan.title} ${plan.planTitle} ${plan.type}`;
  return /3[\s-]?month/i.test(planText) || /best seller/i.test(plan.type);
}

function isMonthlyPlan(plan: SerializedPlan) {
  const planText = `${plan.title} ${plan.planTitle} ${plan.type}`;
  return /\bmonthly\b/i.test(planText) || /easy start/i.test(plan.type);
}

function isWeeklyPlan(plan: SerializedPlan) {
  const planText = `${plan.title} ${plan.planTitle} ${plan.type}`;
  return /\bweekly\b/i.test(planText);
}

function isPremiumPlusPlan(plan: SerializedPlan) {
  const planText = `${plan.title} ${plan.planTitle} ${plan.type}`;
  return (
    isThreeMonthPlan(plan) ||
    /\byearly\b/i.test(planText) ||
    /best value/i.test(plan.type) ||
    /premium plus|pro/i.test(planText)
  );
}

function parsePrice(value: string) {
  const numericValue = Number.parseFloat(value?.replace?.(/[^0-9.]/g, "") || "");
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function getPlanDescription(plan: SerializedPlan) {
  if (isThreeMonthPlan(plan)) {
    return "Best for serious CELPIP prep with mock exams, the most complete toolkit, and the strongest value.";
  }
  if (isMonthlyPlan(plan)) {
    return "Great for focused practice with full exam experience, AI feedback, study guides, and progress tracking.";
  }
  if (isWeeklyPlan(plan)) {
    return "A low-commitment option for a short study sprint with full exam experience before your exam.";
  }
  if (isPremiumPlusPlan(plan)) {
    return "Long-term access with mock exams and everything included in Premium.";
  }
  return "Start practicing with realistic CELPIP material and guided support.";
}

function getAccessLabel(plan: SerializedPlan) {
  if (isPremiumPlusPlan(plan)) {
    return "Premium Plus";
  }
  if (isMonthlyPlan(plan) || isWeeklyPlan(plan)) {
    return "Premium";
  }
  return undefined;
}

function getFooterNote(plan: SerializedPlan) {
  if (isThreeMonthPlan(plan)) {
    return "Includes mock exams plus the most complete prep toolkit.";
  }
  if (isMonthlyPlan(plan) || isWeeklyPlan(plan)) {
    return "Includes full exam experience, AI feedback, and study support.";
  }
  if (isPremiumPlusPlan(plan)) {
    return "Built for long-term full access.";
  }
  return undefined;
}

type PersonalizedRecommendation = {
  planType: "weekly" | "monthly" | "threeMonth";
  headline: string;
  summary: string;
  reasons: string[];
};

function formatWeakAreasForSentence(weakAreas: string[]) {
  if (weakAreas.length === 0) return "";
  if (weakAreas.length === 1) return weakAreas[0];
  if (weakAreas.length === 2) return `${weakAreas[0]} and ${weakAreas[1]}`;
  return `${weakAreas.slice(0, -1).join(", ")}, and ${weakAreas[weakAreas.length - 1]}`;
}

function buildRecommendationExplanation(params: {
  testDate: string | null;
  focusSkill: string | null;
  weakAreas: string[];
  hasHighTarget: boolean;
}) {
  const explanationParts: string[] = [];

  if (params.testDate) {
    explanationParts.push(`your exam is ${params.testDate.toLowerCase()}`);
  }

  if (params.focusSkill && !/other/i.test(params.focusSkill)) {
    explanationParts.push(`your main focus is ${params.focusSkill}`);
  }

  if (params.weakAreas.length > 0) {
    explanationParts.push(
      `${formatWeakAreasForSentence(params.weakAreas)} ${
        params.weakAreas.length === 1 ? "is" : "are"
      } the area${params.weakAreas.length === 1 ? "" : "s"} you need to improve most`
    );
  }

  if (params.hasHighTarget) {
    explanationParts.push("you are aiming for a high target score");
  }

  if (explanationParts.length === 0) {
    return "";
  }

  if (explanationParts.length === 1) {
    return `This is recommended because ${explanationParts[0]}.`;
  }

  return `This is recommended because ${explanationParts
    .slice(0, -1)
    .join(", ")}, and ${explanationParts[explanationParts.length - 1]}.`;
}

function getRecommendedPlanId(plan: SerializedPlan, index: number) {
  return plan._id || `${index}`;
}

function buildPersonalizedRecommendation(
  plans: SerializedPlan[],
  userContext: ReturnType<typeof useUserContext>,
  isSignedIn: boolean
): PersonalizedRecommendation | null {
  if (!isSignedIn) return null;

  const testDate = userContext.onboardingProfile?.testDate || null;
  const focusSkill = userContext.onboardingProfile?.focusSkill || null;
  const weakAreas = userContext.weakAreas || [];
  const targetClb = Number.parseFloat(userContext.targetCLB || "");
  const targetScore = Number(userContext.onboardingProfile?.targetScore || 0);
  const hasHighTarget =
    Number.isFinite(targetClb) && targetClb >= 9 ||
    Number.isFinite(targetScore) && targetScore >= 9;
  const urgentExam = testDate === "In less than 2 weeks";
  const nearTermExam = testDate === "In 1 month";
  const longRunExam = testDate === "In 2+ months" || testDate === "I haven't booked it yet";
  const focusedSingleSkill =
    Boolean(focusSkill) &&
    !/exam strategy/i.test(focusSkill || "") &&
    weakAreas.length <= 1;
  const needsFullPrep =
    urgentExam ||
    nearTermExam ||
    weakAreas.length >= 2 ||
    /exam strategy/i.test(focusSkill || "") ||
    hasHighTarget;

  const reasons: string[] = [];
  if (testDate) reasons.push(`Exam timeline: ${testDate}`);
  if (focusSkill) reasons.push(`Primary focus: ${focusSkill}`);
  if (weakAreas.length > 0) reasons.push(`Weak areas: ${weakAreas.join(", ")}`);
  if (hasHighTarget) reasons.push("Target level is ambitious");
  const explanation = buildRecommendationExplanation({
    testDate,
    focusSkill,
    weakAreas,
    hasHighTarget,
  });

  if (urgentExam && focusedSingleSkill && !needsFullPrep && plans.some(isWeeklyPlan)) {
    return {
      planType: "weekly",
      headline: "Recommended for your short timeline",
      summary:
        explanation ||
        "This is recommended because your exam is close and your prep looks focused, so a short Premium sprint is the fastest fit.",
      reasons,
    };
  }

  if ((focusedSingleSkill && longRunExam && !needsFullPrep) || (nearTermExam && focusedSingleSkill && !hasHighTarget)) {
    return {
      planType: "monthly",
      headline: "Recommended for focused skill improvement",
      summary:
        explanation ||
        "This is recommended because you are focusing on a specific skill and need enough guided practice time without overcommitting.",
      reasons,
    };
  }

  return {
    planType: "threeMonth",
    headline: "Recommended for your goal and exam timeline",
    summary:
      explanation ||
      "This is recommended because mock exams and extra prep depth will help you improve where you need it most.",
    reasons,
  };
}

export default function PricingPageClient({ plans }: PricingPageClientProps) {
  const { isSignedIn } = useUser();
  const userContext = useUserContext();
  const weeklyPlan = plans.find((plan) => /weekly/i.test(`${plan.title} ${plan.planTitle} ${plan.type}`));
  const weeklyPrice = parsePrice(weeklyPlan?.price || "");
  const monthlySavingsById = new Map<string, string>();
  const comparisonRows = [
    {
      label: "3,000+ sample tests",
      premium: true,
      premiumPlus: true,
    },
    {
      label: "Guide and tips",
      premium: true,
      premiumPlus: true,
    },
    {
      label: "Instant AI feedback",
      premium: true,
      premiumPlus: true,
    },
    {
      label: "Progress tracking",
      premium: true,
      premiumPlus: true,
    },
    {
      label: "Mock exams",
      premium: false,
      premiumPlus: true,
    },
    {
      label: "Full exam experience",
      premium: true,
      premiumPlus: true,
    },
  ];
  const personalizedRecommendation = useMemo(
    () => buildPersonalizedRecommendation(plans, userContext, Boolean(isSignedIn)),
    [plans, userContext, isSignedIn]
  );
  const recommendedPlan = useMemo(() => {
    if (!personalizedRecommendation) return plans.find(isThreeMonthPlan) || null;

    switch (personalizedRecommendation.planType) {
      case "weekly":
        return plans.find(isWeeklyPlan) || plans.find(isMonthlyPlan) || plans.find(isThreeMonthPlan) || null;
      case "monthly":
        return plans.find(isMonthlyPlan) || plans.find(isThreeMonthPlan) || null;
      case "threeMonth":
      default:
        return plans.find(isThreeMonthPlan) || plans.find(isMonthlyPlan) || null;
    }
  }, [personalizedRecommendation, plans]);
  const recommendedPlanId = recommendedPlan
    ? getRecommendedPlanId(recommendedPlan, plans.findIndex((plan) => plan === recommendedPlan))
    : null;
  const orderedPlans = useMemo(() => {
    if (!recommendedPlanId) return plans;
    return [...plans].sort((a, b) => {
      const aId = a._id || `${plans.findIndex((plan) => plan === a)}`;
      const bId = b._id || `${plans.findIndex((plan) => plan === b)}`;
      if (aId === recommendedPlanId) return -1;
      if (bId === recommendedPlanId) return 1;
      if (isThreeMonthPlan(a) && !isThreeMonthPlan(b)) return -1;
      if (isThreeMonthPlan(b) && !isThreeMonthPlan(a)) return 1;
      return 0;
    });
  }, [plans, recommendedPlanId]);
  const bestDealPlan = recommendedPlan || plans.find(isThreeMonthPlan);

  plans.forEach((plan, index) => {
    if (!isMonthlyPlan(plan) || weeklyPrice <= 0) {
      return;
    }

    const monthlyPrice = parsePrice(plan.price);
    const fourWeeksPrice = weeklyPrice * 4;

    if (monthlyPrice <= 0 || fourWeeksPrice <= monthlyPrice) {
      return;
    }

    const monthlyOff = Math.round(((fourWeeksPrice - monthlyPrice) / fourWeeksPrice) * 100);
    if (monthlyOff > 0) {
      monthlySavingsById.set(plan._id || `${index}`, `Save ${monthlyOff}%`);
    }
  });

  return (
    <Box className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,_#F6F9FF_0%,_#FFFFFF_35%,_#F9FBFF_100%)] p-4 md:p-8 lg:p-10">
      <Box className="mx-auto w-full max-w-6xl">
        {/* Header Section */}
        <Box className="mb-8 rounded-[32px] border border-blue-100 bg-white px-5 py-6 shadow-[0_20px_60px_rgba(74,125,255,0.08)] md:px-8 md:py-8">
          <Box className="mx-auto max-w-4xl text-center">
            <Box className="mb-3 flex flex-row justify-center gap-1">
              <SvgDiamond className="-rotate-30" />
              <h1
                className="text-[32px] font-medium leading-[100%] tracking-[0%] text-blue-950 md:text-[42px]"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Choose Your Right Plan!
              </h1>
            </Box>
            <p className="mx-auto max-w-2xl text-[14px] leading-6 text-slate-600 md:text-[16px]">
              Pick your package first, then compare details below if needed.
            </p>
          </Box>
          <Box className="mb-2 mt-5 flex items-center justify-center gap-2 text-gray-700 font-medium">
            <AvatarCarousel />
            <span>Trusted by 70k+ test-takers</span>
          </Box>
          <Box className="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm font-medium text-gray-700">
            <Box className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2">
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                Choose by access level and budget
              </span>
            </Box>
            <Box className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Upgrade anytime later
              </span>
            </Box>
          </Box>
        </Box>

        {/* Pricing Cards */}
        <Box className="mb-4 text-center">
          <h2 className="text-2xl font-semibold text-blue-950 md:text-3xl">
            Choose Your Package
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
            Start with Premium for guided practice and full exam experience, or
            pick Premium Plus for mock exams and the most complete prep toolkit.
          </p>
        </Box>
        {personalizedRecommendation && recommendedPlan && (
          <Box className="mb-6 rounded-[28px] border border-blue-200 bg-[linear-gradient(90deg,_rgba(74,125,255,0.10)_0%,_rgba(247,157,101,0.10)_100%)] px-5 py-4 shadow-sm">
            <Box className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <Box>
                <p className="text-sm font-semibold uppercase tracking-[0.08em] text-blue-700">
                  Recommended For You
                </p>
                <h3 className="mt-1 text-lg font-semibold text-blue-950 md:text-xl">
                  {recommendedPlan.title}
                </h3>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-700">
                  {personalizedRecommendation.summary}
                </p>
              </Box>
              <a
                href="#recommended-plan"
                className="inline-flex h-[42px] shrink-0 items-center justify-center rounded-full bg-blue-950 px-5 text-sm font-semibold text-white"
              >
                View Recommendation
              </a>
            </Box>
            {personalizedRecommendation.reasons.length > 0 && (
              <Box className="mt-4 flex flex-wrap gap-2">
                {personalizedRecommendation.reasons.slice(0, 3).map((reason) => (
                  <Box
                    key={reason}
                    className="rounded-full border border-white/70 bg-white/80 px-3 py-1 text-xs font-medium text-slate-700"
                  >
                    {reason}
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        )}
        <Box className="mb-6 rounded-[28px] border border-amber-200 bg-[linear-gradient(90deg,_rgba(247,157,101,0.12)_0%,_rgba(117,156,255,0.12)_100%)] px-5 py-4 text-center shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-amber-700">
            Premium Plus Best Deal
          </p>
          <p className="mt-1 text-base font-semibold text-blue-950 md:text-lg">
            The 3-Month Premium Plus plan gives you 3 months for the price of 2.
          </p>
          <p className="mt-1 text-sm text-slate-700">
            Choose the 3-Month Premium Plus tier and <span className="font-semibold text-amber-700">Save 33%</span> compared to paying monthly.
          </p>
        </Box>
        <Box className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {orderedPlans.map((item, index) => (
            <Box
              key={item._id || index}
              id={
                recommendedPlanId === (item._id || `${plans.findIndex((plan) => plan === item)}`)
                  ? "recommended-plan"
                  : isThreeMonthPlan(item)
                    ? "best-deal-plan"
                    : undefined
              }
              className={`h-full w-full ${
                recommendedPlanId === (item._id || `${plans.findIndex((plan) => plan === item)}`) ||
                isThreeMonthPlan(item)
                  ? "md:-mt-2 lg:-mt-3"
                  : ""
              }`}
            >
              <PlanCard
                id={plans.findIndex((plan) => plan === item)}
                title={item.title}
                type={item.type}
                oldPrice={item.oldPrice}
                price={item.price}
                discount={item.discount}
                buttonTitle={item.buttonTitle}
                features={item.features}
                stripePriceId={item.stripePriceId}
                icon={getIconComponent(item.iconType)}
                iconWrapperColor={item.iconWrapperColor || "bg-purple5"}
                currentPlanTitle=""
                planTitle={item.planTitle || item.title}
                highlight={
                  recommendedPlanId === (item._id || `${plans.findIndex((plan) => plan === item)}`) ||
                  isThreeMonthPlan(item)
                }
                muted={Boolean(recommendedPlanId) && recommendedPlanId !== (item._id || `${plans.findIndex((plan) => plan === item)}`) && isMonthlyPlan(item)}
                savingsText={
                  isThreeMonthPlan(item)
                    ? "Save 33%"
                    : monthlySavingsById.get(item._id || `${plans.findIndex((plan) => plan === item)}`)
                }
                highlightLabel={
                  recommendedPlanId === (item._id || `${plans.findIndex((plan) => plan === item)}`)
                    ? "Recommended"
                    : isThreeMonthPlan(item)
                      ? "Best Deal"
                      : undefined
                }
                accessLabel={getAccessLabel(item)}
                description={getPlanDescription(item)}
                footerNote={getFooterNote(item)}
              />
            </Box>
          ))}
        </Box>
        <Box className="mb-16 grid gap-4 md:grid-cols-3">
          <Box className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
            <p className="text-sm font-semibold text-blue-950">Easy to compare</p>
            <p className="mt-2 text-sm text-slate-600">
              Access level, savings, and plan fit are visible at a glance.
            </p>
          </Box>
          <Box className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
            <p className="text-sm font-semibold text-blue-950">Responsive by default</p>
            <p className="mt-2 text-sm text-slate-600">
              Cards stack clearly on mobile and keep equal visual weight on larger screens.
            </p>
          </Box>
          <Box className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
            <p className="text-sm font-semibold text-blue-950">Upgrade later</p>
            <p className="mt-2 text-sm text-slate-600">
              Start with Premium, then move to Premium Plus when you are ready for mock exams.
            </p>
          </Box>
        </Box>

        <Box className="mb-12 rounded-[28px] border border-blue-100 bg-white p-5 text-left shadow-sm">
          <h2 className="text-center text-lg font-semibold text-blue-950 md:text-xl">
            Compare Premium vs Premium Plus
          </h2>
          <Box className="mt-5 grid gap-4 md:grid-cols-2">
            <Box className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 text-left shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-700">
                For Daily Practice
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-blue-950">
                Premium
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                Ideal for focused practice with AI feedback, study guides,
                detailed explanations, progress tracking, and full exam
                experience.
              </p>
              <p className="mt-3 text-sm font-medium text-slate-900">
                Best if you want strong practice tools and full exam experience,
                without mock exams.
              </p>
            </Box>
            <Box className="rounded-[28px] border border-amber-200 bg-[linear-gradient(180deg,_rgba(255,244,219,0.9)_0%,_rgba(255,255,255,0.95)_100%)] p-5 text-left shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.08em] text-amber-700">
                For Full Prep
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-blue-950">
                Premium Plus
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                Everything in Premium plus mock exams and the most complete prep
                toolkit.
              </p>
              <p className="mt-3 text-sm font-medium text-blue-950">
                Existing full-access subscribers keep Premium Plus access.
              </p>
            </Box>
          </Box>

          {/* Features Bar */}
          <Box className="mt-8 flex flex-wrap justify-center gap-4 text-sm font-medium text-gray-700">
            <Box className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2">
              <SvgPresenceAbsence /> Premium Plus: 60 mock exams
            </Box>
            <Box className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2">
              <SvgTeacher /> Premium: Guide & Tips
            </Box>
            <Box className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2">
              <SvgTaskSquare /> Premium: 3,000+ sample tests
            </Box>
            <Box className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2">
              <SvgBot /> Premium: Instant AI Feedback
            </Box>
          </Box>
          <Box className="mt-5 hidden overflow-hidden rounded-[20px] border border-slate-200 bg-white md:block">
            <Box className="grid grid-cols-[1.4fr_1fr_1fr] border-b border-slate-200 bg-slate-50">
              <Box className="px-5 py-4 text-sm font-semibold text-slate-600">
                Feature
              </Box>
              <Box className="px-5 py-4 text-center text-sm font-semibold text-slate-700">
                Premium
              </Box>
              <Box className="px-5 py-4 text-center text-sm font-semibold text-amber-700">
                Premium Plus
              </Box>
            </Box>
            {comparisonRows.map((row) => (
              <Box
                key={row.label}
                className="grid grid-cols-[1.4fr_1fr_1fr] border-b border-slate-100 last:border-b-0"
              >
                <Box className="px-5 py-4 text-sm text-slate-700">{row.label}</Box>
                <Box className="flex items-center justify-center px-5 py-4">
                  {row.premium ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <span className="text-sm font-medium text-slate-400">No</span>
                  )}
                </Box>
                <Box className="flex items-center justify-center px-5 py-4">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                </Box>
              </Box>
            ))}
          </Box>
          <Box className="mt-5 grid gap-3 md:hidden">
            {comparisonRows.map((row) => (
              <Box key={row.label} className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">{row.label}</p>
                <Box className="mt-3 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-600">Premium</span>
                  <span className={row.premium ? "font-semibold text-emerald-600" : "font-medium text-slate-400"}>
                    {row.premium ? "Included" : "Not included"}
                  </span>
                </Box>
                <Box className="mt-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-600">Premium Plus</span>
                  <span className="font-semibold text-emerald-600">Included</span>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Trusted By Section */}
        <Box className="mb-16 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">
          <h2 className="text-xl md:text-2xl font-semibold text-blue-950 text-center md:text-left max-w-[300px]">
            Trusted by students from top universities
          </h2>
          <Box className="flex flex-wrap justify-center md:justify-end gap-3 md:gap-4">
            {universityImages.map((src, index) => (
              <Box
                key={index}
                className="relative bg-white p-2 rounded-xl border border-gray-100 w-14 h-14 flex items-center justify-center hover:-translate-y-1 transition-transform duration-300 cursor-pointer before:absolute before:inset-0 before:rounded-xl before:content-[''] before:transition-shadow before:duration-300 before:ease before:transform before:translate-z-[-1px] before:shadow-[6px_4px_16px_0px_#FC7A5066,_-6px_-4px_16px_0px_#4A7DFF66]"
              >
                <Image
                  src={src}
                  alt={`University logo ${index + 1}`}
                  width={40}
                  height={40}
                  className="w-full h-full object-contain relative z-10"
                />
              </Box>
            ))}
          </Box>
        </Box>

        {/* Testimonials - Box layout (no grid) */}
        <Box className="flex flex-wrap gap-4 mb-16">
          {testimonials.map((t, i) => (
            <Box
              key={i}
              className="w-full md:min-w-[280px] md:max-w-[calc(50%-8px)] lg:min-w-[240px] lg:max-w-[calc(25%-12px)] flex-1"
            >
              <TestimonialCard {...t} />
            </Box>
          ))}
        </Box>

        {/* FAQs */}
        <Box className="w-full">
          <h2 className="text-2xl font-bold text-blue-950 mb-6 text-center">
            FAQs
          </h2>
          {faqs.map((faq, i) => (
            <FAQItem key={i} {...faq} />
          ))}
        </Box>
      </Box>
      {bestDealPlan && (
        <Box className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-10px_30px_rgba(15,23,42,0.12)] backdrop-blur md:hidden">
          <Box className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <Box className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-700">
                {personalizedRecommendation ? "Recommended" : "Best Deal"}
              </p>
              <p className="truncate text-sm font-semibold text-blue-950">
                {bestDealPlan.title}
              </p>
              <p className="text-xs text-slate-600">
                {personalizedRecommendation?.headline || "Save 33% with Premium Plus"}
              </p>
            </Box>
            <a
              href={personalizedRecommendation ? "#recommended-plan" : "#best-deal-plan"}
              className="shrink-0 rounded-full bg-[linear-gradient(270deg,_#F79D65_0%,_#759CFF_100%)] px-4 py-2 text-sm font-semibold text-white shadow-md"
            >
              View Plan
            </a>
          </Box>
        </Box>
      )}
    </Box>
  );
}
