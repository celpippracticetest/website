"use client";

import React from "react";
import Link from "next/link";
import PublicPageShell from "./PublicPageShell";
import { Box } from "@/components/ui/Box";

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
