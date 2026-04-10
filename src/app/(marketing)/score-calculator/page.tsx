import { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import ScoreCalculatorPageClient from "@/components/pages/marketing/ScoreCalculatorPageClient";

const canonicalUrl = "https://celpippracticetest.com/score-calculator";

const SCORE_CALC_TITLE =
  "CELPIP Score Calculator | CRS Estimate & CLB Levels (2026)";
const SCORE_CALC_DESCRIPTION =
  "Enter CELPIP Listening, Reading, Writing, and Speaking scores to see CLB-style levels and an educational CRS estimate for Express Entry (verify on Canada.ca).";

export const metadata: Metadata = {
  title: SCORE_CALC_TITLE,
  description: SCORE_CALC_DESCRIPTION,
  openGraph: {
    title: SCORE_CALC_TITLE,
    description:
      "Educational CRS estimate from CELPIP scores: language, education, Canadian work, and transferability. Not an official IRCC tool.",
    type: "website",
    url: canonicalUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: SCORE_CALC_TITLE,
    description: SCORE_CALC_DESCRIPTION,
  },
  alternates: {
    canonical: canonicalUrl,
  },
  robots: {
    index: true,
    follow: true,
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Is this CELPIP score calculator the official IRCC CRS tool?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. This page provides an educational estimate based on published CRS criteria. Final CRS points are determined only in your official IRCC Express Entry profile.",
      },
    },
    {
      "@type": "Question",
      name: "Do job offers still add CRS points?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Current CRS criteria indicate job offer points were removed as of March 25, 2025. Always verify the latest updates on the official Canada.ca CRS criteria page.",
      },
    },
    {
      "@type": "Question",
      name: "Can CLB 9 or higher improve CRS points?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Reaching CLB 9 or higher can significantly increase first-language points and skill transferability points in many Express Entry profiles.",
      },
    },
  ],
};

const webpageSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "CELPIP Score Calculator",
  description: SCORE_CALC_DESCRIPTION,
  url: canonicalUrl,
  inLanguage: "en-CA",
  isPartOf: {
    "@type": "WebSite",
    name: "CELPIP Practice Test",
    url: "https://celpippracticetest.com",
  },
};

export default function ScoreCalculatorPage() {
  return (
    <>
      <JsonLd data={faqSchema} />
      <JsonLd data={webpageSchema} />
      <ScoreCalculatorPageClient />
    </>
  );
}
