import dynamic from "next/dynamic";
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

export default function RefundPolicyPage() {
  return <RefundPolicyComponent />;
}
