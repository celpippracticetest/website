import { Metadata } from "next";
import TermsOfService from "@/components/pages/landing/TermsOfService";

export const metadata: Metadata = {
  title: "Terms of Service | CELPIPPRACTICETEST.com",
  description:
    "Review the Terms of Service for CELPIPPRACTICETEST.com to understand the rules and conditions for using our CELPIP preparation platform.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function TermsOfServicePage() {
  return <TermsOfService />;
}

import dynamic from "next/dynamic";
import React from "react";
import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const appBaseUrl = process.env.APP_BASE_URL || "";
  const isPreview = appBaseUrl.includes("vercel.app");
  return {
    title: "Terms of Service | CELPIPPRACTICETEST.com",
    description: "Review the Terms of Service for CELPIP preparation platform.",
    alternates: {
      canonical: "https://celpippracticetest.com/terms-of-service",
    },
    robots: {
      index: !isPreview,
      follow: !isPreview,
    },
  };
}

const TermsOfServiceComponent = dynamic(
  () => import("@/components/pages/landing/TermsOfService"),
  {
    ssr: true,
  }
);

const TermsOfService = () => {
  return <TermsOfServiceComponent />;
};

export default TermsOfService;
