import dynamic from "next/dynamic";
import { Metadata } from "next";
import { getIndexingRobotsDirective } from "@/lib/searchIndexing";

export async function generateMetadata(): Promise<Metadata> {
  const appBaseUrl = process.env.APP_BASE_URL || "";
  return {
    title: "Terms of Service | CELPIPPRACTICETEST.com",
    description:
      "Read CELPIP Practice Test Terms of Service covering account use, subscriptions, payments, prohibited conduct, intellectual property, and dispute resolution.",
    alternates: {
      canonical: "https://celpippracticetest.com/terms-of-service",
    },
    robots: getIndexingRobotsDirective(appBaseUrl),
  };
}

const TermsOfServiceComponent = dynamic(
  () => import("@/components/pages/landing/TermsOfService"),
  {
    ssr: true,
  }
);

export default function TermsOfServicePage() {
  return <TermsOfServiceComponent />;
}
