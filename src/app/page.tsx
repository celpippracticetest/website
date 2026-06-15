import dynamic from "next/dynamic";
import type { Metadata } from "next";
import PublicPageShell from "@/components/pages/landing/PublicPageShell";
import PublicPageFooter from "@/components/pages/landing/PublicPageFooter";
import { JsonLd } from "@/components/seo/JsonLd";
import { pageSeo } from "@/lib/seo/pageSeo";
import { buildHomepageProductJsonLd } from "@/lib/seo/siteSchema";
import { getUiAbVariant } from "@/lib/uiAbTest.server";
import { readUiAbQueryParam } from "@/lib/uiAbTest";

export const metadata: Metadata = pageSeo("/");

const HomePageClient = dynamic(
  () => import("@/components/pages/landing/HomePageClient"),
  { ssr: true },
);

const HomePageClassicClient = dynamic(
  () => import("@/components/ui-variants/classic/landing/HomePageClassicClient"),
  { ssr: true },
);

const homepageFaqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Where can I take a free CELPIP practice test online?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You can start with the free CELPIP practice test on CELPIPPracticeTest.com. It links to Listening, Reading, Writing, and Speaking practice so you can try the format before choosing a paid plan.",
      },
    },
    {
      "@type": "Question",
      name: "Will I get instant online CELPIP scores and feedback?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Writing and Speaking answers receive instant AI feedback and scoring. Listening and Reading receive auto-scored answers and explanations.",
      },
    },
    {
      "@type": "Question",
      name: "Which CELPIP skills can I practice?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You can practice all four CELPIP skills: Listening, Reading, Writing, and Speaking.",
      },
    },
    {
      "@type": "Question",
      name: "How close are CELPIP practice tests to the real test?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The practice is designed to mirror CELPIP-style timing, sections, and question formats. It is independent exam-prep material, not the official CELPIP test.",
      },
    },
  ],
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const fromQuery =
    readUiAbQueryParam({
      get: (key) => {
        const value = params[key];
        if (Array.isArray(value)) return value[0] ?? null;
        return value ?? null;
      },
      has: (key) => key in params,
    }) ?? null;
  const variant = fromQuery ?? (await getUiAbVariant());

  const homepageProductSchema = buildHomepageProductJsonLd();

  if (variant === "classic") {
    return (
      <>
        <JsonLd data={homepageProductSchema} />
        <JsonLd data={homepageFaqSchema} />
        <HomePageClassicClient />
      </>
    );
  }

  return (
    <>
      <JsonLd data={homepageProductSchema} />
      <JsonLd data={homepageFaqSchema} />
      <PublicPageShell footer={<PublicPageFooter />}>
        <HomePageClient />
      </PublicPageShell>
    </>
  );
}
