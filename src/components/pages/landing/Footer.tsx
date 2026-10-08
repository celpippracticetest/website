"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useInView } from "react-intersection-observer";
import { useButtonVisibleStore } from "@/store/buttonVisible.store";
import { getStoreUrl } from "@/lib/mobile/appVersionPolicy";
import { playOnView } from "@/hooks/usePlayOnView";

const columns = [
  {
    title: "Practice",
    links: [
      { label: "Listening", href: "/listening" },
      { label: "Reading", href: "/reading" },
      { label: "Writing", href: "/writing" },
      { label: "Speaking", href: "/speaking" },
      { label: "Mock Exams", href: "/exam-overview" },
    ],
  },
  {
    title: "Learn",
    links: [
      { label: "AI Tutor", href: "/learning" },
      { label: "Words", href: "/words" },
      { label: "Blog", href: "/blog" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Pricing", href: "/pricing" },
      { label: "Contact us", href: "/contact-us" },
      { label: "Log in", href: "/sign-in" },
    ],
  },
];

const legalLinks = [
  { label: "Terms of Service", href: "/terms-of-service" },
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Refund Policy", href: "/refund-policy" },
];

// `isSignedIn` is accepted for callers that pass it; the footer is the same for everyone.
const Footer = (_props: { isSignedIn?: boolean }) => {
  const { ref, inView } = useInView();
  const { setInFooter } = useButtonVisibleStore((state) => state);

  useEffect(() => {
    setInFooter(inView);
  }, [inView, setInFooter]);

  return (
    <footer ref={ref} aria-label="Site footer" className="mt-[44px] screen1280:!mt-[40px] w-full bg-[#E0E9FB] [&_:is(a,button):focus-visible]:outline-3 [&_:is(a,button):focus-visible]:outline-solid [&_:is(a,button):focus-visible]:outline-[#759CFF] [&_:is(a,button):focus-visible]:outline-offset-2">
      <div className="mx-auto w-full max-w-[1236px] px-[20px] pt-[40px] pb-[32px] screen744:!px-[48px] screen744:!pt-[48px] screen744:!pb-[36px] screen1280:!px-[40px] screen1440:!px-0 screen1280:!pt-[56px] screen1280:!pb-0 flex flex-col gap-[24px] screen1280:!gap-0">
        <div className="flex flex-col gap-[24px] screen1280:!grid screen1280:!grid-cols-[2fr_1fr_1fr_1fr] screen1280:!gap-[48px] screen1280:!pb-[40px]">
          {/* Brand */}
          <div className="flex flex-col gap-[12px] screen1280:!gap-[16px] screen1280:!pr-[40px]">
            <Link
              href="/"
              aria-label="CELPIP Practice Test home"
              className="flex items-center h-[44px] self-start transition-opacity duration-200 hover:opacity-80 data-[play]:opacity-80"
            >
              <Image
                src="/images/header-logo-left.png"
                alt=""
                width={34}
                height={34}
                className="w-[31px] h-[31px] screen1280:!w-[34px] screen1280:!h-[34px]"
              />
              <Image
                src="/images/header-logo-right.png"
                alt="CELPIP Practice Test"
                width={96}
                height={40}
                className="w-[90px] screen1280:!w-[96px] h-auto"
                style={{ height: "auto" }}
              />
            </Link>
            <p className="m-0 text-[14px] leading-[22px] screen1280:!text-[15px] screen1280:!leading-[24px] text-[#37465C]">
              Free CELPIP practice tests with instant AI scoring for Writing and Speaking.
            </p>
            <a
              ref={playOnView}
              href={getStoreUrl("android")}
              target="_blank"
              rel="noopener noreferrer"
              className="group self-start flex items-center gap-[8px] h-[44px] px-[16px] rounded-full bg-white border border-[#C9D5F5] text-[#2554D6] text-[14px] font-semibold transition-[transform,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[2px] data-[play]:-translate-y-[2px] hover:border-[#2554D6] data-[play]:border-[#2554D6] hover:shadow-[0_10px_20px_-14px_rgba(37,84,214,0.6)] data-[play]:shadow-[0_10px_20px_-14px_rgba(37,84,214,0.6)] active:translate-y-0 active:scale-[0.98]"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="transition-transform duration-300 group-hover:-rotate-6 group-data-[play]:-rotate-6">
                <rect x="6" y="2" width="12" height="20" rx="3" />
                <path d="M11 18h2" />
              </svg>
              Get the Android app
            </a>
          </div>

          {/* Link columns: two-up on mobile, three-up on tablet, own grid cells on desktop */}
          <nav
            aria-label="Footer navigation"
            className="grid grid-cols-2 gap-x-[16px] gap-y-[24px] screen744:!grid-cols-3 screen1280:!contents"
          >
            {columns.map((column) => (
              <div key={column.title} className="flex flex-col gap-[4px]">
                <h3 className="m-0 mb-[6px] text-[13px] font-bold tracking-[0.06em] uppercase text-[#212E42]">
                  {column.title}
                </h3>
                {column.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="self-start flex items-center min-h-[32px] text-[15px] text-[#37465C] transition-[color,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-[#2554D6] data-[play]:text-[#2554D6] hover:translate-x-[3px] data-[play]:translate-x-[3px]"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
        </div>

        {/* Disclaimer, copyright and legal links */}
        <div className="flex flex-col gap-[12px] pt-[18px] screen1280:!pt-[20px] screen1280:!pb-[28px] border-t border-[#C9D5F0] text-[12px] leading-[19px] screen1280:!text-[13px] screen1280:!leading-[20px] text-[#5B6B82]">
          <p className="m-0">
            CELPIPPracticeTest.com is an independent platform and is not affiliated with, endorsed by, or associated with
            Paragon Testing Enterprises or the official CELPIP test.
          </p>
          <div className="flex flex-col-reverse gap-[12px] screen1280:!flex-row screen1280:!items-center screen1280:!justify-between">
            <span>© {new Date().getFullYear()} CELPIPPracticeTest.com. All rights reserved.</span>
            <div className="flex flex-wrap gap-x-[18px] gap-y-[6px] screen1280:!gap-[24px]">
              {legalLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center min-h-[32px] screen1280:!min-h-0 text-[#37465C] transition-colors duration-200 hover:text-[#2554D6] data-[play]:text-[#2554D6] hover:underline data-[play]:underline underline-offset-2"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
