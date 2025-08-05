export const metadata = {
  title: "Terms of Service | CELPIPPRACTICETEST.com",
  description:
    "Review the Terms of Service for CELPIPPRACTICETEST.com to understand the rules and conditions for using our CELPIP preparation platform.",
  alternates: {
    canonical: "https://celpippracticetest.com/terms-of-service",
  },
};

import dynamic from "next/dynamic";
import React from "react";
const TermsOfServiceComponent = dynamic(
  () => import("@/components/pages/landing/TermsOfService"),
  {
    ssr: true,
  }
);

const appBaseUrl = process.env.APP_BASE_URL || "";
const isPreview = appBaseUrl.includes("vercel.app");

const TermsOfService = () => {
  return (
    <>
      {isPreview && (
        <head>
          <meta name="robots" content="noindex, nofollow" />
        </head>
      )}
      <TermsOfServiceComponent />
    </>
  );
};

export default TermsOfService;
