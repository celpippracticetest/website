"use client";

import React from "react";
import Link from "next/link";
import TopHeader from "./TopHeader";
import { Box } from "@/components/ui/Box";

const NotFoundPage = () => {
  return (
    <>
      <TopHeader />

      <Box className="flex flex-col max-w-[900px] mx-auto mt-[120px] mb-[116px] px-[16px]">
        <span className="text-primary1 font-semibold text-[18px]">Error 404</span>
        <h1 className="text-primary1 font-bold text-[36px] mt-[12px]">
          Page not found
        </h1>
        <p className="mt-[16px] font-normal text-[18px] text-text3">
          The page you are looking for may have been moved, renamed, or no
          longer exists.
        </p>

        <Box className="flex flex-wrap gap-[12px] mt-[32px]">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-[20px] py-[12px] rounded-[12px] bg-primary1 text-white text-[16px] font-medium"
          >
            Back to Home
          </Link>
          <Link
            href="/contact-us"
            className="inline-flex items-center justify-center px-[20px] py-[12px] rounded-[12px] border border-outline text-[16px] font-medium text-text1"
          >
            Contact Support
          </Link>
        </Box>
      </Box>
    </>
  );
};

export default NotFoundPage;
