import dynamic from "next/dynamic";
import React from "react";

export const metadata = {
  title: "Privacy Policy | CELPIPPRACTICETEST.com",
  description:
    "Read CELPIPPRACTICETEST.com's Privacy Policy to understand how we collect, use, and protect your personal data when preparing for CELPIP tests online.",
  alternates: {
    canonical: "https://celpippracticetest.com/privacy-policy",
  },
};

const PrivacyPolicyComponent = dynamic(
  () => import("@/components/pages/landing/PrivacyPolicy"),
  {
    ssr: true,
  }
);
const PrivacyPolicy = () => {
  return (
    <>
      <PrivacyPolicyComponent />
    </>
  );
};

export default PrivacyPolicy;
