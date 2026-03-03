import { Metadata } from "next";
import PrivacyPolicy from "@/components/pages/landing/PrivacyPolicy";

export const metadata: Metadata = {
  title: "Privacy Policy | CELPIPPRACTICETEST.com",
  description:
    "Read the Privacy Policy for CELPIPPRACTICETEST.com to understand how we collect, use, and protect your personal information.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacyPolicyPage() {
  return <PrivacyPolicy />;
}

import dynamic from "next/dynamic";
import React from "react";
import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const appBaseUrl = process.env.APP_BASE_URL || "";
  const isPreview = appBaseUrl.includes("vercel.app");
  return {
    title: "Privacy Policy | CELPIPPRACTICETEST.com",
    description:
      "Read CELPIPPRACTICETEST.com's Privacy Policy to understand how we collect, use, and protect your personal data when preparing for CELPIP tests online.",
    alternates: {
      canonical: "https://celpippracticetest.com/privacy-policy",
    },
    robots: {
      index: !isPreview,
      follow: !isPreview,
    },
  };
}

const PrivacyPolicyComponent = dynamic(
  () => import("@/components/pages/landing/PrivacyPolicy"),
  {
    ssr: true,
  }
);

const PrivacyPolicy = () => <PrivacyPolicyComponent />;

export default PrivacyPolicy;
