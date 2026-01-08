import dynamic from "next/dynamic";
import React from "react";
import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const appBaseUrl = process.env.APP_BASE_URL || "";
  const isPreview = appBaseUrl.includes("vercel.app");
  return {
    title: "Refund Policy | CELPIPPRACTICETEST.com",
    description: "Review the Refund Policy for CELPIP preparation platform.",
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
