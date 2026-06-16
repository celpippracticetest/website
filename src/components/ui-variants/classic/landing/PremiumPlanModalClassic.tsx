"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, ChevronDown, ChevronUp } from "lucide-react";
import PlanCard from "@/components/pages/landing/PlanCard";
import Image from "next/image";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { SvgTeacher, SvgPresenceAbsence, SvgBot, SvgTaskSquare } from "@/components/icons";
import {
  getClassicPlanIconType,
  sortPlansForClassicModal,
  toClassicPlanPresentation,
} from "@/lib/classicPlanPresentation";
import type { PlanIconType, SerializedPlan } from "@/types/pricing";
import img1 from "@/images/attachment.png";
import img2 from "@/images/attachment2.png";
import img3 from "@/images/attachment3.png";
import img5 from "@/images/attachment5.png";
import img6 from "@/images/attachment6.png";
import img7 from "@/images/attachment7.png";
import img8 from "@/images/attachment8.png";
import img9 from "@/images/attachment9.png";
import SvgDiamond from "@/components/icons/Diamond";
import { useModalTracking } from "@/hooks/useTracking";

const Svg5Star = dynamic(() => import("@/components/icons/5Star"), { ssr: false });
const SvgBestValuePlan = dynamic(() => import("@/components/icons/BestValuePlan"), {
  ssr: false,
});
const SvgPopularPlan = dynamic(() => import("@/components/icons/PopularPlan"), { ssr: false });
const SvgFreePlan = dynamic(() => import("@/components/icons/FreePlan"), { ssr: false });

type PlanCardModel = ReturnType<typeof toClassicPlanPresentation> & { icon: React.ReactNode };

function planIconForType(iconType?: PlanIconType): React.ReactNode {
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

const FAQItem = ({ question, answer }: { question: string; answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mb-3 overflow-hidden rounded-lg border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between bg-gray-50 p-4 text-left transition-colors hover:bg-gray-100"
      >
        <span className="text-sm font-medium text-gray-800 md:text-base">{question}</span>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-gray-500" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-500" />
        )}
      </button>
      {isOpen && (
        <div className="border-t border-gray-100 bg-white p-4 text-sm text-gray-600">
          {answer}
        </div>
      )}
    </div>
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
}) => {
  return (
    <div className="flex h-full flex-col gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <Image
          src={`/images/${source}`}
          alt={name}
          width={40}
          height={40}
          className="rounded-full"
        />
        <div>
          <h4 className="text-sm font-bold text-gray-900">{name}</h4>
          <Svg5Star />
        </div>
      </div>
      <p className="text-xs leading-relaxed text-gray-600">{comment}</p>
    </div>
  );
};

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
    <div className="relative flex h-8 w-[80px] -space-x-2 overflow-hidden">
      <AnimatePresence mode="popLayout">
        {visibleAvatars.map((src, i) => (
          <motion.div
            key={`${src}-${i}`}
            initial={{ x: 20, opacity: 0, scale: 0.8 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: -20, opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.5 }}
            className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border-2 border-white"
            style={{ zIndex: 3 - i }}
          >
            <Image src={`/images/${src}`} alt="User Avatar" fill className="object-cover" />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export type PremiumPlanModalClassicProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function PremiumPlanModalClassic({
  open,
  onOpenChange,
}: PremiumPlanModalClassicProps) {
  const [plans, setPlans] = useState<PlanCardModel[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const { viewed, closed } = useModalTracking();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setPlansLoading(true);
    void fetch("/api/plans/catalog")
      .then(async (response) => {
        const data = (await response.json()) as { plans?: SerializedPlan[] };
        if (!response.ok) throw new Error("Failed to load plans");
        if (cancelled) return;
        const catalog = Array.isArray(data.plans) ? data.plans : [];
        const classicPlans = sortPlansForClassicModal(
          catalog.map((plan) => {
            const classic = toClassicPlanPresentation(plan);
            return {
              ...classic,
              icon: planIconForType(getClassicPlanIconType(plan._id, plan.iconType)),
            };
          }),
        );
        setPlans(classicPlans);
      })
      .catch(() => {
        if (!cancelled) setPlans([]);
      })
      .finally(() => {
        if (!cancelled) setPlansLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      viewed("Premium Plan Modal", "upgrade_prompt");
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [open, viewed]);

  const handleClose = () => {
    closed("Premium Plan Modal", "dismissed");
    onOpenChange(false);
  };

  const testimonials = [
    {
      name: "Carlos Mendoza",
      comment:
        "Speaking practice and instant feedback helped me build confidence. My answers became more organized, and I knew what to work on before test day.",
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
        "The writing feedback helped me improve structure and coherence. After two weeks of focused practice, I felt much more prepared for the exam.",
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
      question: "Where can one take a full CELPIP practice test free of charge online?",
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
      question: "What are the best 4 skills on the CELPIP practice platform?",
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

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000001] flex items-end justify-center overflow-y-auto bg-black/60 p-0 backdrop-blur-sm"
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative flex h-[90vh] w-full flex-col overflow-hidden rounded-t-3xl bg-[#F4F7FF] shadow-2xl"
          >
            <button
              type="button"
              onClick={handleClose}
              className="absolute right-4 top-4 z-10 rounded-full bg-white p-2 shadow-md transition-colors hover:bg-gray-100"
              aria-label="Close pricing modal"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>

            <div className="custom-scrollbar flex-1 overflow-y-auto p-6 md:p-10">
              <div className="mx-auto w-full max-w-5xl">
                <div className="mb-10 text-center">
                  <div className="flex flex-row justify-center gap-1">
                    <SvgDiamond className="-rotate-30" />
                    <h3 className="mb-3 text-center text-[32px] font-medium leading-[100%] tracking-[0%] text-blue-950">
                      Choose Your Right Plan!
                    </h3>
                  </div>
                  <div className="mb-8 flex items-center justify-center gap-2 font-medium text-gray-700">
                    <AvatarCarousel />
                    <span>Trusted by 70k+ test-takers</span>
                  </div>

                  <div className="mb-10 flex flex-wrap justify-center gap-4 text-sm font-medium text-gray-700 md:gap-8">
                    <div className="flex items-center gap-2">
                      <SvgPresenceAbsence /> 60 mock exams
                    </div>
                    <div className="flex items-center gap-2">
                      <SvgTeacher /> Guide & Tips
                    </div>
                    <div className="flex items-center gap-2">
                      <SvgTaskSquare /> 3,000+ sample tests
                    </div>
                    <div className="flex items-center gap-2">
                      <SvgBot /> Instant AI Feedback
                    </div>
                  </div>
                </div>

                <div className="mb-16 flex flex-wrap justify-center gap-6">
                  {plansLoading ? (
                    <div className="flex h-40 w-full items-center justify-center">
                      <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary1 border-t-transparent" />
                    </div>
                  ) : (
                    plans.map((item, index) => (
                      <div key={item._id ?? index} className="w-full md:w-[300px] lg:w-[320px]">
                        <PlanCard
                          id={index}
                          title={item.title}
                          type={item.type}
                          oldPrice={item.oldPrice}
                          price={item.price}
                          discount={item.discount}
                          buttonTitle={item.buttonTitle}
                          features={item.features}
                          icon={item.icon}
                          iconWrapperColor={item.iconWrapperColor}
                          stripePriceId={item.stripePriceId}
                          isModal
                        />
                      </div>
                    ))
                  )}
                </div>

                <div className="mb-16 flex flex-col items-center justify-between gap-6 md:flex-row md:gap-8">
                  <h3 className="max-w-[300px] text-center text-xl font-semibold text-blue-950 md:text-left md:text-2xl">
                    Trusted by students from top universities
                  </h3>
                  <div className="flex flex-wrap justify-center gap-3 md:justify-end md:gap-4">
                    {[img1, img2, img3, img5, img6, img7, img8, img9].map((src, index) => (
                      <div
                        key={index}
                        className="relative flex h-14 w-14 cursor-pointer items-center justify-center rounded-xl border border-gray-100 bg-white p-2 transition-transform duration-300 before:absolute before:inset-0 before:translate-z-[-1px] before:transform before:rounded-xl before:shadow-[6px_4px_16px_0px_#FC7A5066,_-6px_-4px_16px_0px_#4A7DFF66] before:transition-shadow before:duration-300 before:ease before:content-[''] hover:-translate-y-1"
                      >
                        <Image
                          src={src}
                          alt={`University logo ${index + 1}`}
                          width={40}
                          height={40}
                          className="relative z-10 h-full w-full object-contain"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-16 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {testimonials.map((t) => (
                    <TestimonialCard key={t.name} {...t} />
                  ))}
                </div>

                <div className="w-full">
                  <h3 className="mb-6 text-center text-2xl font-bold text-blue-950">FAQs</h3>
                  {faqs.map((faq) => (
                    <FAQItem key={faq.question} {...faq} />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
