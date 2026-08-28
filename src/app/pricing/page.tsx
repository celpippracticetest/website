import { Metadata } from "next";
import { cookies } from "next/headers";
import PricingPageShell from "./PricingPageShell";
import { pricingFaqs } from "@/components/pages/pricing/pricingContent";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  PRICING_AB_COOKIE,
  parsePricingAbLayout,
  parsePricingStylePreviewQuery,
} from "@/lib/pricingAbTest";
import { getActivePlansCatalog } from "@/lib/plansCatalog";

export const metadata: Metadata = {
  title: "CELPIP Practice Test Pricing Plans | Choose Your Plan",
  description:
    "Pick the CELPIP Premium plan that fits you — weekly, monthly, or quarterly. 60 mock exams, 3,000+ practices, instant AI feedback. Cancel anytime.",
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

type PricingPageProps = {
  searchParams: Promise<{ s?: string }>;
};

export default async function PricingPage({ searchParams }: PricingPageProps) {
  const { s } = await searchParams;
  const cookieStore = await cookies();
  const assignedLayout = parsePricingAbLayout(
    cookieStore.get(PRICING_AB_COOKIE)?.value,
  );
  const previewLayout = parsePricingStylePreviewQuery(s);
  const pricingAbParticipatesInExperiment = previewLayout === null;
  const pricingAbLayout = previewLayout ?? assignedLayout;

  const plansWithStripePricing = await getActivePlansCatalog();

  return (
    <>
      <JsonLd data={faqSchema} />
      <PricingPageShell
        plans={plansWithStripePricing}
        pricingAbLayout={pricingAbLayout}
        pricingAbParticipatesInExperiment={pricingAbParticipatesInExperiment}
      />
    </>
  );
}
