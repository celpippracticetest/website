import { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import PricingPageClient from "@/components/pages/pricing/PricingPageClient";
import mongoClient from "@/lib/mongodb";
import { PlansRepository } from "@/repositories/plans.repo";
import type { SerializedPlan } from "@/types/pricing";

export const metadata: Metadata = {
  title: "CELPIP Practice Test Pricing Plans | Choose Your Plan",
  description:
    "Compare CELPIP practice test plans. Free tier, weekly, monthly, and yearly options with 60+ mock exams, AI feedback, and 3,000+ sample questions. Trusted by 70k+ test-takers.",
  keywords: [
    "CELPIP pricing",
    "CELPIP practice test cost",
    "CELPIP subscription plans",
    "CELPIP mock exam price",
    "CELPIP preparation plans Canada",
  ],
  openGraph: {
    title: "CELPIP Practice Test Pricing Plans | Choose Your Plan",
    description:
      "Compare CELPIP practice test plans. Free tier, weekly, monthly, and yearly options with 60+ mock exams, AI feedback, and 3,000+ sample questions.",
    type: "website",
  },
  alternates: {
    canonical: "https://celpippracticetest.com/pricing",
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Where can one take a full CELPIP practice test free of charge online?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You can take a free full-length CELPIP practice test right here on CELPIPPracticetest.com. Simply sign up for a free account to access our sample test which includes Listening, Reading, Writing, and Speaking sections with AI-powered scoring.",
      },
    },
    {
      "@type": "Question",
      name: "How exact are CELPIP practice tests compared to the real test?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Our simulations attempt to replicate the actual CELPIP test format and duration. With AI-based scoring, your scores reflect real exam performance, enabling you to better estimate your CLB levels.",
      },
    },
    {
      "@type": "Question",
      name: "Will I get instant online CELPIP scores and feedback?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes! Our platform provides instant AI scoring and detailed feedback for all sections, including Speaking and Writing, so you can identify your strengths and weaknesses immediately.",
      },
    },
  ],
};

function serializePlan(plan: {
  _id?: unknown;
  title: string;
  type: string;
  planTitle: string;
  oldPrice: string;
  price: string;
  discount: string;
  buttonTitle: string;
  features: string[];
  iconType?: string;
  iconWrapperColor?: string;
}): SerializedPlan {
  const id = plan._id;
  const idStr =
    typeof id === "string" ? id : (id as { toString?: () => string })?.toString?.();
  return {
    _id: idStr ?? undefined,
    title: plan.title,
    type: plan.type,
    planTitle: plan.planTitle,
    oldPrice: plan.oldPrice,
    price: plan.price,
    discount: plan.discount,
    buttonTitle: plan.buttonTitle,
    features: plan.features,
    iconType: plan.iconType as SerializedPlan["iconType"],
    iconWrapperColor: plan.iconWrapperColor,
  };
}

export default async function PricingPage() {
  const db = await mongoClient.db();
  const plansRepo = new PlansRepository(db);
  const plans = await plansRepo.getActivePlans();
  const serializedPlans = plans.map(serializePlan);

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: serializedPlans.map((plan, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Course",
        name: plan.planTitle || plan.title,
        description: plan.features?.join(". ") || "CELPIP Practice Plan",
        provider: {
          "@type": "Organization",
          name: "CELPIP Practice Test",
          sameAs: "https://celpippracticetest.com",
        },
        offers: {
          "@type": "Offer",
          price: plan.price?.replace?.(/[^0-9.]/g, "") || "0",
          priceCurrency: "CAD",
        },
      },
    })),
  };

  return (
    <>
      <JsonLd data={faqSchema} />
      <JsonLd data={itemListSchema} />
      <PricingPageClient plans={serializedPlans} />
    </>
  );
}
