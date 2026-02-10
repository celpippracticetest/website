"use client";

import Link from "next/link";
import { Box } from "@/components/ui/Box";
import { Button } from "@/components/ui/button";
import Image from "next/image";

const CTA_HEADLINE =
  "View real CELPIP-style writing tasks and see how scoring works in practice.";
const CTA_BUTTON_LABEL = "practice with us";
const CTA_IMAGE_SRC = "/images/BeaverPractice.png";
const CTA_LINK = "/exam-overview";

export function BlogCtaSection() {
  return (
    <Box className="mt-16 w-full">
      <Box className="overflow-hidden rounded-3xl bg-[#E85D3C] shadow-lg">
        <Box className="flex flex-col md:flex-row md:items-center md:justify-between">
          {/* Left: text + button */}
          <Box className="flex flex-1 flex-col justify-center p-8 md:p-10 lg:p-12">
            <h2 className="mb-6 text-2xl font-bold leading-tight text-white md:text-3xl lg:text-[1.75rem]">
              {CTA_HEADLINE}
            </h2>
            <Box>
              <Link href={CTA_LINK}>
                <Button
                  size="lg"
                  className="cursor-pointer rounded-xl bg-white px-8 py-6 text-base font-semibold text-slate-900 shadow-sm hover:bg-slate-50"
                >
                  {CTA_BUTTON_LABEL}
                </Button>
              </Link>
            </Box>
          </Box>

          {/* Right: mascot illustration */}
          <Box className="relative flex shrink-0 items-end justify-center md:justify-end md:pr-6 md:pb-2">
            <Box className="relative h-48 w-48 md:h-56 md:w-56 lg:h-64 lg:w-64">
              <Image
                src={CTA_IMAGE_SRC}
                alt="CELPIP practice mascot"
                fill
                className="object-contain object-bottom"
                sizes="(max-width: 768px) 192px, 256px"
                priority={false}
              />
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
