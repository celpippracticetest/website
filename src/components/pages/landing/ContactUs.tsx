"use client";

import React from "react";
import Link from "next/link";
import TopHeader from "./TopHeader";
import Footer from "./Footer";

const SUPPORT_EMAIL = "support@celpippracticetest.com";
const REFUND_URL = "https://refund.celpippractice.ca";

function openLiveChat() {
  if (typeof window === "undefined") return;
  const w = window as unknown as {
    Intercom?: (cmd: string) => void;
    showIntercom?: () => void;
  };
  if (w.showIntercom) {
    w.showIntercom();
    return;
  }
  if (w.Intercom) {
    w.Intercom("show");
  }
}

const contactMethods = [
  {
    title: "Email",
    description:
      "Best for account, billing, and detailed questions. We typically reply within 1–2 business days.",
    actionLabel: SUPPORT_EMAIL,
    href: `mailto:${SUPPORT_EMAIL}`,
  },
  {
    title: "Live chat",
    description:
      "Chat with our support team for quick help while you're on the site.",
    actionLabel: "Open live chat",
    onClick: openLiveChat,
  },
  {
    title: "Refund requests",
    description:
      "Refund requests must be submitted through our refund platform. Email and chat are not accepted for refund submissions.",
    actionLabel: "Go to refund platform",
    href: REFUND_URL,
    external: true,
  },
];

const helpTopics = [
  "Account access, sign-in, and password resets",
  "Subscription, billing, and plan questions",
  "Practice tests, mock exams, and scoring feedback",
  "Technical issues on the website or mobile app",
];

const ContactUs = () => {
  return (
    <>
      <TopHeader />

      <main className="flex flex-col max-w-[1156px] mx-auto justify-center mt-[120px] px-[16px] mb-[116px]">
        <h1 className="text-primary1 font-bold text-[28px]">Contact Us</h1>
        <p className="mt-[16px] font-normal text-[18px] text-text3 max-w-[720px]">
          Need help with CELPIP Practice Test? Reach our support team by email
          or live chat. We&apos;re here for account, billing, and practice
          questions.
        </p>

        <section className="mt-[40px]" aria-labelledby="ways-to-reach-us">
          <h2
            id="ways-to-reach-us"
            className="font-semibold text-[20px] text-text1"
          >
            Ways to reach us
          </h2>

          <ul className="mt-[24px] flex flex-col gap-[20px]">
            {contactMethods.map((method) => (
              <li
                key={method.title}
                className="rounded-[12px] border border-outline bg-white px-[20px] py-[20px]"
              >
                <h3 className="font-semibold text-[18px] text-text1">
                  {method.title}
                </h3>
                <p className="mt-[8px] font-normal text-[16px] text-text3">
                  {method.description}
                </p>
                {method.href ? (
                  <Link
                    href={method.href}
                    {...(method.external
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                    className="mt-[12px] inline-flex font-medium text-[16px] text-primary1 underline-offset-2 hover:underline"
                  >
                    {method.actionLabel}
                  </Link>
                ) : (
                  <button
                    type="button"
                    id="contact-live-chat-button"
                    onClick={method.onClick}
                    className="mt-[12px] inline-flex cursor-pointer font-medium text-[16px] text-primary1 underline-offset-2 hover:underline"
                  >
                    {method.actionLabel}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-[48px]" aria-labelledby="what-we-can-help-with">
          <h2
            id="what-we-can-help-with"
            className="font-semibold text-[20px] text-text1"
          >
            What we can help with
          </h2>
          <ul className="mt-[16px] pl-[20px]">
            {helpTopics.map((topic) => (
              <li key={topic} className="list-disc text-[18px] text-text1">
                {topic}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-[48px]" aria-labelledby="before-you-write">
          <h2
            id="before-you-write"
            className="font-semibold text-[20px] text-text1"
          >
            Before you write
          </h2>
          <p className="mt-[16px] font-normal text-[18px] text-text1">
            Including your account email and a short description of the issue
            helps us respond faster. For refunds, use the{" "}
            <Link
              href={REFUND_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary1 underline-offset-2 hover:underline"
            >
              refund platform
            </Link>{" "}
            and keep your tracking code for status updates.
          </p>
          <p className="mt-[16px] font-normal text-[18px] text-text1">
            Related policies:{" "}
            <Link
              href="/privacy-policy"
              className="text-primary1 underline-offset-2 hover:underline"
            >
              Privacy Policy
            </Link>
            ,{" "}
            <Link
              href="/terms-of-service"
              className="text-primary1 underline-offset-2 hover:underline"
            >
              Terms of Service
            </Link>
            , and{" "}
            <Link
              href="/refund-policy"
              className="text-primary1 underline-offset-2 hover:underline"
            >
              Refund Policy
            </Link>
            .
          </p>
        </section>

        <div className="h-[1px] bg-outline mt-[61px]" />
        <p className="font-normal text-[16px] text-text3 mt-[20px]">
          © {new Date().getFullYear()} CELPIPPRACTICETEST.com. All rights
          reserved. CELPIPPRACTICETEST.com is not affiliated with, endorsed by,
          or sponsored by any official testing organization.
        </p>
      </main>

      <Footer />
    </>
  );
};

export default ContactUs;
