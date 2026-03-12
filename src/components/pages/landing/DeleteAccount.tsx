"use client";

import React from "react";
import Link from "next/link";
import TopHeader from "./TopHeader";
import { Box } from "@/components/ui/Box";

const DeleteAccount = () => {
  return (
    <>
      <TopHeader />

      <Box className="flex flex-col max-w-[1156px] mx-auto justify-center mt-[120px] px-[16px] mb-[116px]">
        <h1 className="text-primary1 font-bold text-[28px]">
          Delete Your Account
        </h1>
        <p className="mt-[16px] font-normal text-[18px] text-text3">
          We're sorry to see you go. If you'd like to permanently delete your
          account and all associated data, our support team can process your
          request — no login required.
        </p>

        <Box className="flex flex-col mt-[40px]">
          <h2 className="font-semibold text-[20px]">How to Request Deletion</h2>
          <p className="font-normal text-[18px] mt-[17px]">
            Send an email to our support team at:
          </p>
          <p className="font-normal text-[18px] mt-[12px]">
            <Link
              href="mailto:support@celpippracticetest.com?subject=Account%20Deletion%20Request"
              className="text-primary1 underline underline-offset-2"
            >
              support@celpippracticetest.com
            </Link>
          </p>
          <p className="font-normal text-[18px] mt-[12px]">
            Use the subject line: <strong>Account Deletion Request</strong>
          </p>
        </Box>

        <Box className="flex flex-col mt-[40px]">
          <h2 className="font-semibold text-[20px]">What to Include in Your Email</h2>
          <ul className="pl-[20px] mt-[17px]">
            <li className="list-disc text-[18px]">
              The email address associated with your account
            </li>
            <li className="list-disc text-[18px]">
              Your full name (as registered)
            </li>
            <li className="list-disc text-[18px]">
              A brief statement confirming you want to permanently delete your
              account and all data
            </li>
          </ul>
        </Box>

        <Box className="flex flex-col mt-[40px]">
          <h2 className="font-semibold text-[20px]">What Happens After Your Request</h2>
          <ul className="pl-[20px] mt-[17px]">
            <li className="list-disc text-[18px]">
              Our team will verify your identity using the email address you
              provide
            </li>
            <li className="list-disc text-[18px]">
              Your account and all personal data will be permanently deleted
              within <strong>7 business days</strong>
            </li>
            <li className="list-disc text-[18px]">
              You will receive a confirmation email once the deletion is
              complete
            </li>
            <li className="list-disc text-[18px]">
              Active subscriptions must be cancelled before or as part of the
              deletion request — any remaining subscription period will not be
              refunded
            </li>
          </ul>
        </Box>

        <Box className="flex flex-col mt-[40px]">
          <h2 className="font-semibold text-[20px]">Important Notes</h2>
          <ul className="pl-[20px] mt-[17px]">
            <li className="list-disc text-[18px]">
              Account deletion is <strong>permanent and irreversible</strong> —
              your practice history, scores, and progress cannot be recovered
            </li>
            <li className="list-disc text-[18px]">
              If you have an active paid subscription, please review our{" "}
              <Link
                href="/refund-policy"
                className="text-primary1 underline underline-offset-2"
              >
                Refund Policy
              </Link>{" "}
              before proceeding
            </li>
            <li className="list-disc text-[18px]">
              Typical response time: within 24 hours on business days
            </li>
          </ul>
        </Box>

        <Box className="flex flex-col mt-[40px]">
          <h2 className="font-semibold text-[20px]">Need Help Instead?</h2>
          <p className="font-normal text-[18px] mt-[17px]">
            If you're having trouble with your account or subscription, we'd
            love the chance to help before you go. Feel free to reach out via
            our{" "}
            <Link
              href="/contact-us"
              className="text-primary1 underline underline-offset-2"
            >
              Contact Us
            </Link>{" "}
            page.
          </p>
        </Box>

        <Box className="h-px bg-outline mt-[61px]" />
        <p className="font-normal text-[16px] text-text3 mt-[20px]">
          © 2026 CELPIPPRACTICETEST.com. All rights reserved.
          CELPIPPRACTICETEST.com is not affiliated with, endorsed by, or
          sponsored by any official testing organization.
        </p>
      </Box>
    </>
  );
};

export default DeleteAccount;
