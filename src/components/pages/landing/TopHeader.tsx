"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import AuthButtons from "./AuthButtons";
import { useEventTracker } from "@/hooks/useTracking";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import { hasPaidPracticeAccess } from "@/lib/subscriptionAccess";

const navLinks = [
  { label: "Practice", href: "/practice-overview" },
  { label: "Mock Exams", href: "/exam-overview" },
  { label: "Learning", href: "/learning" },
  { label: "Words", href: "/words" },
  { label: "Blog", href: "https://blog.celpippracticetest.com" },
];

const CrownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 7l4 4 5-7 5 7 4-4-2 12H5z" />
    <path d="M5 21h14" />
  </svg>
);

const PricingPill = ({ onClick }: { onClick?: () => void }) => (
  <Link
    href="/pricing"
    onClick={onClick}
    className="flex items-center h-[44px]"
  >
    <span className="flex items-center gap-[6px] h-[34px] px-[14px] rounded-full bg-[#C4453A] text-white text-[14px] font-semibold shadow-[2.5px_2.5px_0_0_#759CFF] transition-transform duration-200 hover:-translate-y-[1px]">
      <CrownIcon />
      Pricing
    </span>
  </Link>
);

const Logo = () => (
  <Link href="/" aria-label="CELPIP Practice Test home" className="flex items-center h-[44px] shrink-0">
    <Image
      src="/images/header-logo-left.png"
      alt=""
      width={31}
      height={31}
      className="w-[29px] h-[29px] screen744:!w-[31px] screen744:!h-[31px]"
      priority
      sizes="31px"
    />
    <Image
      src="/images/header-logo-right.png"
      alt="CELPIP Practice Test"
      width={84}
      height={40}
      className="w-[84px] h-auto"
      priority
      sizes="84px"
    />
  </Link>
);

const TopHeader = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { user, isLoaded, isSignedIn } = useHybridWebUser();
  const { trackCTA } = useEventTracker();

  const hasActivePlan = hasPaidPracticeAccess(user?.publicMetadata?.plan);
  const authReady = mounted && isLoaded;
  const showSignedOut = authReady && !isSignedIn;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock page scroll and allow Escape to close while the menu is open.
  useEffect(() => {
    if (!isMenuOpen) return;
    document.body.classList.add("overflow-hidden");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMenuOpen(false);
    };
    const onResize = () => {
      if (window.innerWidth >= 1280) setIsMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.body.classList.remove("overflow-hidden");
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [isMenuOpen]);

  const closeMenu = () => setIsMenuOpen(false);

  const handleStart = (location: string) => {
    closeMenu();
    trackCTA("Start Free Practice", location);
  };

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-[50] flex justify-center pointer-events-none">
        <div className="pointer-events-auto w-full screen744:!mx-[24px] screen1280:!mx-0 max-w-[1176px] h-[68px] screen744:!h-[72px] screen1280:!h-[80px] pl-[18px] pr-[10px] screen744:!pl-[28px] screen744:!pr-[16px] screen1280:!px-[40px] flex items-center justify-between border border-t-0 border-[#E3EBFF] rounded-b-[24px] screen744:!rounded-b-[28px] screen1280:!rounded-b-[32px] backdrop-blur-[8px] bg-[linear-gradient(90deg,rgba(255,255,255,0.8)_0%,rgba(255,255,255,0.45)_100%)] screen1280:!bg-[linear-gradient(90deg,rgba(255,255,255,0.75)_0%,rgba(255,255,255,0.35)_100%)]">
          <Logo />

          {/* Desktop navigation */}
          <nav aria-label="Main" className="hidden screen1280:!flex items-center">
            {navLinks.map((link, index) => (
              <React.Fragment key={link.label}>
                {index > 0 && <span className="w-px h-[35px] bg-[#D5D6D8]" aria-hidden="true" />}
                <Link
                  href={link.href}
                  className="flex items-center h-[44px] px-[20px] text-[14px] text-[#37465C] hover:text-[#2554D6] transition-colors"
                >
                  {link.label}
                </Link>
              </React.Fragment>
            ))}
            {!hasActivePlan && (
              <span className="ml-[12px]">
                <PricingPill />
              </span>
            )}
          </nav>

          <div className="flex items-center gap-[6px] screen744:!gap-[14px] screen1280:!gap-[18px]">
            {!authReady && (
              <span className="w-[100px] screen744:!w-[200px] h-[40px] screen1280:!h-[47px] rounded-full bg-white/60 animate-pulse" />
            )}

            {showSignedOut && (
              <>
                <Link
                  href="/sign-in"
                  className="hidden screen744:!flex items-center h-[44px] px-[4px] text-[14px] font-semibold text-[#2554D6] hover:text-[#1B3FA8] transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/practice-overview"
                  onClick={() => handleStart("header")}
                  className="flex items-center justify-center h-[40px] px-[16px] screen744:!h-[44px] screen744:!px-[20px] screen1280:!h-[47px] screen1280:!w-[200px] rounded-full bg-[#2554D6] text-white text-[14px] screen744:!text-[15px] screen1280:!text-[16px] font-medium whitespace-nowrap shadow-[3px_3px_0_0_#759CFF] screen744:!shadow-[3.7px_3.9px_0_0_#759CFF] transition-all duration-200 hover:-translate-y-[2px] active:translate-y-[2px] active:shadow-none"
                >
                  <span className="screen744:!hidden">Start Free</span>
                  <span className="hidden screen744:!inline">Start Free Practice</span>
                </Link>
              </>
            )}

            {authReady && isSignedIn && (
              <div className="flex items-center h-[44px] [&>div]:!mr-0">
                <AuthButtons />
              </div>
            )}

            <button
              type="button"
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMenuOpen}
              aria-controls="site-menu"
              onClick={() => setIsMenuOpen((open) => !open)}
              className="screen1280:!hidden flex items-center justify-center w-[44px] h-[44px] text-[#1E293B]"
            >
              {isMenuOpen ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile & tablet menu */}
      {isMenuOpen && (
        <div className="screen1280:!hidden">
          <div
            className="fixed inset-0 z-[48] bg-[rgba(33,46,66,0.45)] screen744:!bg-[rgba(33,46,66,0.35)] animate-in fade-in duration-200"
            onClick={closeMenu}
            aria-hidden="true"
          />
          <div
            id="site-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="fixed z-[49] top-0 inset-x-0 pt-[68px] rounded-b-[24px] bg-white shadow-[0_24px_48px_-16px_rgba(33,46,66,0.35)] screen744:!top-[84px] screen744:!left-auto screen744:!right-[24px] screen744:!w-[300px] screen744:!pt-[8px] screen744:!pb-[4px] screen744:!rounded-[20px] screen744:!border screen744:!border-[#E3EBFF] animate-in fade-in slide-in-from-top-2 duration-200"
          >
            <nav aria-label="Main" className="flex flex-col px-[20px] pt-[4px] border-t border-[#E3EBFF] screen744:!px-0 screen744:!pt-0 screen744:!border-t-0">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={closeMenu}
                  className="flex items-center h-[52px] px-[2px] screen744:!px-[24px] text-[16px] text-[#212E42] border-b border-[#EDEEF0] hover:text-[#2554D6] transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              {!hasActivePlan && (
                <div className="flex items-center h-[64px] px-[2px] screen744:!px-[24px]">
                  <PricingPill onClick={closeMenu} />
                </div>
              )}
            </nav>

            {showSignedOut && (
              <div className="flex flex-col gap-[4px] px-[20px] pt-[8px] pb-[24px] screen744:!hidden">
                <Link
                  href="/practice-overview"
                  onClick={() => handleStart("mobile_menu")}
                  className="flex items-center justify-center h-[52px] rounded-full bg-[#2554D6] text-white text-[16px] font-medium shadow-[3.7px_3.9px_0_0_#759CFF]"
                >
                  Start Free Practice
                </Link>
                <Link
                  href="/sign-in"
                  onClick={closeMenu}
                  className="flex items-center justify-center h-[48px] text-[16px] font-semibold text-[#2554D6]"
                >
                  Sign in
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default TopHeader;
