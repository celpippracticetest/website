import dynamic from "next/dynamic";
import React from "react";
import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const appBaseUrl = process.env.APP_BASE_URL || "";
  const isPreview = appBaseUrl.includes("vercel.app");

  return {
    title: "Contact Us | CELPIPPRACTICETEST.com",
    description:
      "Contact CELPIPPRACTICETEST.com support for account, billing, and CELPIP practice help. Reach our team by email and get assistance quickly.",
    keywords: [
      "contact celpip practice",
      "celpip support",
      "celpippracticetest contact",
      "celpip account help",
      "celpip billing support",
    ],
    alternates: {
      canonical: "https://celpippracticetest.com/contact-us",
    },
    openGraph: {
      title: "Contact Us | CELPIPPRACTICETEST.com",
      description:
        "Get in touch with CELPIPPRACTICETEST.com support for account, billing, and practice questions.",
      url: "https://celpippracticetest.com/contact-us",
      siteName: "CELPIPPRACTICETEST.com",
      type: "website",
    },
    twitter: {
      card: "summary",
      title: "Contact Us | CELPIPPRACTICETEST.com",
      description:
        "Get in touch with CELPIPPRACTICETEST.com support for account, billing, and practice questions.",
    },
    robots: {
      index: !isPreview,
      follow: !isPreview,
    },
  };
}

const ContactUsComponent = dynamic(
  () => import("@/components/pages/landing/ContactUs"),
  {
    ssr: true,
  }
);

const ContactUsPage = () => {
  return <ContactUsComponent />;
};

export default ContactUsPage;
