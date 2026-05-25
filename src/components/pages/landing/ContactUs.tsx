"use client";

import React from "react";
import Link from "next/link";
import { Box } from "@/components/ui/Box";
import SupportEmailLink from "@/components/contact/SupportEmailLink";

const ContactUs = () => {
  return (
    <Box className="flex flex-col max-w-[1156px] mx-auto justify-center mt-[120px] px-[16px] mb-[116px]">
        <h1 className="text-primary1 font-bold text-[28px]">Contact Us</h1>
        <p className="mt-[16px] font-normal text-[18px] text-text3">
          Have a question about your CELPIP practice plan, billing, or account?
          Our support team is here to help.
        </p>
        <p className="mt-[12px] font-normal text-[18px] text-text3">
          We can help with subscription questions, login problems, refund-policy
          clarification, feature access, and general guidance on using the
          platform effectively for CELPIP preparation.
        </p>

        <Box className="flex flex-col mt-[40px]">
          <h2 className="font-semibold text-[20px]">Customer Support</h2>
          <p className="font-normal text-[18px] mt-[17px]">
            Email: <SupportEmailLink />
          </p>
          <p className="font-normal text-[18px] mt-[12px]">
            Typical response time: within 24 hours on business days.
          </p>
        </Box>

        <Box className="flex flex-col mt-[40px]">
          <h2 className="font-semibold text-[20px]">Common Reasons People Contact Us</h2>
          <ul className="pl-[20px] mt-[17px]">
            <li className="list-disc text-[18px]">
              Billing questions, renewals, cancellations, or refunds
            </li>
            <li className="list-disc text-[18px]">
              Login, account access, or email update requests
            </li>
            <li className="list-disc text-[18px]">
              Questions about mock exams, practice tasks, or score-related tools
            </li>
            <li className="list-disc text-[18px]">
              Technical issues such as missing content, loading errors, or browser problems
            </li>
          </ul>
        </Box>

        <Box className="flex flex-col mt-[40px]">
          <h2 className="font-semibold text-[20px]">What to Include in Your Email</h2>
          <ul className="pl-[20px] mt-[17px] list-disc space-y-2">
            <li className="text-[18px]">
              <strong>Your account email address</strong>: We need this to locate your practice history and subscription details.
            </li>
            <li className="text-[18px]">
              <strong>A short description of your question or issue</strong>: Please explain what you were trying to do and what happened.
            </li>
            <li className="text-[18px]">
              <strong>Screenshots (if applicable)</strong>: A picture is worth a thousand words. If you see an error message, please attach a screenshot to help us resolve the problem faster.
            </li>
            <li className="text-[18px]">
              <strong>Browser and Device Info</strong>: Knowing whether you are on a Mac, Windows PC, or mobile device, and what browser you are using (Chrome, Safari, etc.) can be very helpful for technical issues.
            </li>
          </ul>
        </Box>

        <Box className="flex flex-col mt-[40px]">
          <h2 className="font-semibold text-[20px]">Helpful Links</h2>
          <Box className="flex flex-col mt-[17px] gap-[10px]">
            <Link href="/pricing" className="text-[18px] text-primary1 underline underline-offset-2">
              Pricing
            </Link>
            <Link href="/refund-policy" className="text-[18px] text-primary1 underline underline-offset-2">
              Refund Policy
            </Link>
            <Link href="/terms-of-service" className="text-[18px] text-primary1 underline underline-offset-2">
              Terms of Service
            </Link>
            <Link href="/privacy-policy" className="text-[18px] text-primary1 underline underline-offset-2">
              Privacy Policy
            </Link>
          </Box>
        </Box>

        <Box className="h-px bg-outline mt-[61px]" />
        <p className="font-normal text-[16px] text-text3 mt-[20px]">
          © 2026 CELPIPPRACTICETEST.com. All rights reserved.
          CELPIPPRACTICETEST.com is not affiliated with, endorsed by, or
          sponsored by any official testing organization.
        </p>
      </Box>
  );
};

export default ContactUs;
