import dynamic from "next/dynamic";
import { Metadata } from "next";
import { getIndexingRobotsDirective } from "@/lib/searchIndexing";

export async function generateMetadata(): Promise<Metadata> {
  const appBaseUrl = process.env.APP_BASE_URL || "";
  return {
    title: "Privacy Policy | CELPIPPRACTICETEST.com",
    description:
      "Read CELPIPPRACTICETEST.com's Privacy Policy to understand how we collect, use, and protect your personal data when preparing for CELPIP tests online.",
    alternates: {
      canonical: "https://celpippracticetest.com/privacy-policy",
    },
    robots: getIndexingRobotsDirective(appBaseUrl),
  };
}

const PrivacyPolicyComponent = dynamic(
  () => import("@/components/pages/landing/PrivacyPolicy"),
  {
    ssr: true,
  }
);

export default function PrivacyPolicyPage() {
  return <PrivacyPolicyComponent />;
}
