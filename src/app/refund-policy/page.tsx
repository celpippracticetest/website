import { Metadata } from "next";
import RefundPolicy from "@/components/pages/landing/RefundPolicy";

export const metadata: Metadata = {
  title: "Refund Policy | CELPIPPRACTICETEST.com",
  description:
    "Read the Refund Policy for CELPIPPRACTICETEST.com to understand eligibility, timelines, and conditions for refunds on CELPIP prep plans.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function RefundPolicyPage() {
  return <RefundPolicy />;
}

import dynamic from "next/dynamic";
import React from "react";
import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const appBaseUrl = process.env.APP_BASE_URL || "";
  const isPreview = appBaseUrl.includes("vercel.app");
  return {
    title: "Refund Policy | CELPIPPRACTICETEST.com",
    description:
      "Review CELPIP Practice Test refund eligibility, timelines, and refund request process.",
    keywords: [
      "CELPIP refund policy",
      "CELPIP subscription refund",
      "refund request terms",
      "CELPIP Practice Test refund",
    ],
    openGraph: {
      title: "Refund Policy | CELPIPPRACTICETEST.com",
      description:
        "Review CELPIP Practice Test refund eligibility, timelines, and refund request process.",
      type: "article",
      url: "https://celpippracticetest.com/refund-policy",
    },
    alternates: {
      canonical: "https://celpippracticetest.com/refund-policy",
    },
    robots: {
      index: !isPreview,
      follow: !isPreview,
    },
  };
}

const RefundPolicyComponent = dynamic(
  () => import("@/components/pages/landing/RefundPolicy"),
  {
    ssr: true,
  }
);

const RefundPolicy = () => {
  return <RefundPolicyComponent />;
};

export default RefundPolicy;
