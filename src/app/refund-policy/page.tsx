import dynamic from "next/dynamic";
import { Metadata } from "next";
import { getIndexingRobotsDirective } from "@/lib/searchIndexing";

export async function generateMetadata(): Promise<Metadata> {
  const appBaseUrl = process.env.APP_BASE_URL || "";
  const description =
    "Understand CELPIP Practice Test refund rules, eligibility windows, non-refundable cases, and steps to submit, review, and track your refund request online.";
  return {
    title: "Refund Policy | CELPIPPRACTICETEST.com",
    description,
    keywords: [
      "CELPIP refund policy",
      "CELPIP subscription refund",
      "refund request terms",
      "CELPIP Practice Test refund",
    ],
    openGraph: {
      title: "Refund Policy | CELPIPPRACTICETEST.com",
      description,
      type: "article",
      url: "https://celpippracticetest.com/refund-policy",
    },
    alternates: {
      canonical: "https://celpippracticetest.com/refund-policy",
    },
    robots: getIndexingRobotsDirective(appBaseUrl),
  };
}

const RefundPolicyComponent = dynamic(
  () => import("@/components/pages/landing/RefundPolicy"),
  {
    ssr: true,
  }
);

export default function RefundPolicyPage() {
  return <RefundPolicyComponent />;
}
