"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import PublicPageShell from "./PublicPageShell";
import { Box } from "@/components/ui/Box";

const recoveryLinks = [
  { href: "/free-celpip-practice-test", label: "Free CELPIP practice test" },
  { href: "/celpip-writing-task-1-samples", label: "Writing Task 1 samples" },
  { href: "/celpip-speaking-samples", label: "Speaking samples" },
  { href: "/wiki/celpip-score-guide", label: "CELPIP score guide" },
  { href: "/exam-overview", label: "Exam overview" },
];

const NotFoundPage = () => {
  return (
    <PublicPageShell>
      <Box className="mx-auto mb-[116px] mt-8 flex max-w-[900px] flex-col px-[16px]">
        <span className="text-[18px] font-semibold text-primary1">Error 404</span>
        <h1 className="mt-[12px] text-[36px] font-bold text-primary1">
          Page not found
        </h1>
        <p className="mt-[16px] text-[18px] font-normal text-text3">
          The page you are looking for may have been moved, renamed, or no
          longer exists.
        </p>

        <Box className="mt-[28px] grid gap-[10px] screen744:grid-cols-2">
          {recoveryLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex min-h-[52px] items-center justify-between rounded-[8px] border border-outline bg-white px-[16px] py-[12px] text-[15px] font-medium text-text1 transition-colors hover:border-primary1 hover:text-primary1"
            >
              <span>{item.label}</span>
              <ArrowRight
                aria-hidden="true"
                className="h-[18px] w-[18px] flex-shrink-0 transition-transform group-hover:translate-x-[2px]"
              />
            </Link>
          ))}
        </Box>

        <Box className="mt-[32px] flex flex-wrap gap-[12px]">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-[12px] bg-primary1 px-[20px] py-[12px] text-[16px] font-medium text-white"
          >
            Back to Home
          </Link>
          <Link
            href="/contact-us"
            className="inline-flex items-center justify-center rounded-[12px] border border-outline px-[20px] py-[12px] text-[16px] font-medium text-text1"
          >
            Contact Support
          </Link>
        </Box>
      </Box>
    </PublicPageShell>
  );
};

export default NotFoundPage;
