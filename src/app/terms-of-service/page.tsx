import dynamic from "next/dynamic";
import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const appBaseUrl = process.env.APP_BASE_URL || "";
  const isPreview = appBaseUrl.includes("vercel.app");
  return {
    title: "Terms of Service | CELPIPPRACTICETEST.com",
    description:
      "Read CELPIP Practice Test Terms of Service covering account use, subscriptions, payments, prohibited conduct, intellectual property, and dispute resolution.",
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

export default function TermsOfServicePage() {
  return <TermsOfServiceComponent />;
}
