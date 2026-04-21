import { Metadata } from "next";
import { cookies } from "next/headers";
import { JsonLd } from "@/components/seo/JsonLd";
import PricingPageClient from "@/components/pages/pricing/PricingPageClient";
import { pricingFaqs } from "@/components/pages/pricing/pricingContent";
import mongoClient from "@/lib/mongodb";
import {
  PRICING_AB_COOKIE,
  parsePricingAbLayout,
  parsePricingStylePreviewQuery,
} from "@/lib/pricingAbTest";
import { attachStripePricingToSerializedPlans } from "@/lib/loadActivePlansWithStripePrices";
import { PlansRepository } from "@/repositories/plans.repo";
import type { SerializedPlan } from "@/types/pricing";

export const metadata: Metadata = {
  title: "CELPIP Practice Test Pricing Plans | Choose Your Plan",
  description:
    "CELPIP Plus plans: weekly, monthly, 3-month, and yearly billing with 60+ mock exams, AI feedback, and 3,000+ sample questions. Trusted by 70k+ test-takers.",
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
      "CELPIP Plus plans with weekly, monthly, 3-month, and yearly billing. Includes 60+ mock exams, AI feedback, and 3,000+ sample questions.",
    type: "website",
  },
  alternates: {
    canonical: "https://celpippracticetest.com/pricing",
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: pricingFaqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
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
  billingInterval?: "day" | "week" | "month" | "year";
  billingIntervalCount?: number;
  stripePriceId?: string;
  iconType?: string;
  iconWrapperColor?: string;
  order?: number;
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
    billingInterval: plan.billingInterval,
    billingIntervalCount: plan.billingIntervalCount,
    stripePriceId: plan.stripePriceId,
    iconType: plan.iconType as SerializedPlan["iconType"],
    iconWrapperColor: plan.iconWrapperColor,
    order: plan.order,
  };
}

type PricingPageProps = {
  searchParams: Promise<{ s?: string }>;
};

export default async function PricingPage({ searchParams }: PricingPageProps) {
  const { s } = await searchParams;
  const cookieStore = await cookies();
  const assignedLayout = parsePricingAbLayout(
    cookieStore.get(PRICING_AB_COOKIE)?.value
  );
  const previewLayout = parsePricingStylePreviewQuery(s);
  const pricingAbParticipatesInExperiment = previewLayout === null;
  const pricingAbLayout = previewLayout ?? assignedLayout;

  const db = await mongoClient.db();
  const plansRepo = new PlansRepository(db);
  const plans = await plansRepo.getActivePlans();
  const serializedPlans = plans.map(serializePlan);
  const plansWithStripePricing = await attachStripePricingToSerializedPlans(serializedPlans);

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: plansWithStripePricing.map((plan, index) => {
      const numericPrice = plan.price?.replace?.(/[^0-9.]/g, "") || "0";
      const isFree = numericPrice === "0";
      return {
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
            category: isFree ? "Free" : "Paid",
            price: numericPrice,
            priceCurrency: "CAD",
          },
          hasCourseInstance: {
            "@type": "CourseInstance",
            courseMode: "online",
            courseWorkload: "PT10H",
          },
        },
      };
    }),
  };

  return (
    <>
      <JsonLd data={faqSchema} />
      <JsonLd data={itemListSchema} />
      <PricingPageClient
        plans={plansWithStripePricing}
        pricingAbLayout={pricingAbLayout}
        pricingAbParticipatesInExperiment={pricingAbParticipatesInExperiment}
      />
    </>
  );
}
