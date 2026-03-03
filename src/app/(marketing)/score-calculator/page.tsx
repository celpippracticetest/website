import { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import ScoreCalculatorPageClient from "@/components/pages/marketing/ScoreCalculatorPageClient";

const canonicalUrl = "https://celpippracticetest.com/score-calculator";

export const metadata: Metadata = {
  title: "Free CELPIP Score Calculator | Estimate CRS Points (2025 Criteria)",
  description:
    "Use this free CELPIP score calculator to estimate CRS points for Express Entry using current 2025 criteria. Enter Listening, Reading, Writing, and Speaking scores for a fast estimate.",
  keywords: [
    "free CELPIP score calculator",
    "CELPIP CRS calculator",
    "estimate CRS points",
    "CELPIP to CRS points",
    "Express Entry score calculator",
    "CELPIP CLB calculator",
    "CRS criteria 2025",
  ],
  openGraph: {
    title: "Free CELPIP Score Calculator | Estimate CRS Points (2025 Criteria)",
    description:
      "Estimate CRS points from your CELPIP scores in seconds using current Express Entry criteria. Includes language, education, Canadian work, and transferability estimates.",
    type: "website",
    url: canonicalUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "Free CELPIP Score Calculator | Estimate CRS Points (2025 Criteria)",
    description:
      "Estimate CRS points from CELPIP scores using current Express Entry criteria.",
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
  name: "Free CELPIP Score Calculator",
  description:
    "Free calculator to estimate CRS points from CELPIP Listening, Reading, Writing, and Speaking scores.",
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
