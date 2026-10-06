"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import AuthButtons from "./AuthButtons";
import { useEventTracker } from "@/hooks/useTracking";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import { hasPaidPracticeAccess } from "@/lib/subscriptionAccess";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Practice", href: "/practice-overview" },
  { label: "Mock Exams", href: "/exam-overview" },
  { label: "Learning", href: "/learning" },
  { label: "Words", href: "/words" },
  { label: "Blog", href: "https://blog.celpippracticetest.com" },
];

// Section the header watches: the "Start Free Practice" button only joins the
// Pricing button once this element has scrolled out of view.
const HERO_ID = "home-hero";

const CrownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 7l4 4 5-7 5 7 4-4-2 12H5z" />
    <path d="M5 21h14" />
  </svg>
);

const Logo = () => (
  <Link
    href="/"
    aria-label="CELPIP Practice Test home"
    className="flex items-center h-[44px] shrink-0 transition-opacity duration-200 hover:opacity-80 active:opacity-60"
  >
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
      style={{ height: "auto" }}
      priority
      sizes="84px"
    />
  </Link>
);

const isActivePath = (pathname: string | null, href: string) =>
  !!pathname && href.startsWith("/") && (pathname === href || pathname.startsWith(`${href}/`));

const TopHeader = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pastHero, setPastHero] = useState(false);
  const pathname = usePathname();
  const { user, isLoaded, isSignedIn } = useHybridWebUser();
  const { trackCTA } = useEventTracker();

  const hasActivePlan = hasPaidPracticeAccess(user?.publicMetadata?.plan);
  const authReady = mounted && isLoaded;
  const showSignedOut = authReady && !isSignedIn;
  const showPricing = authReady && !hasActivePlan;
  const showStart = showSignedOut && pastHero;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Pages without a hero always show the full button group.
  useEffect(() => {
    const hero = document.getElementById(HERO_ID);
    if (!hero) {
      setPastHero(true);
      return;
    }
    setPastHero(false);
    const observer = new IntersectionObserver(
      ([entry]) => setPastHero(!entry.isIntersecting),
      { rootMargin: "-80px 0px 0px 0px", threshold: 0 }
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, [pathname]);

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
        <div className="pointer-events-auto w-full screen744:!mx-[24px] screen1280:!mx-0 max-w-[1176px] h-[68px] screen744:!h-[72px] screen1280:!h-[80px] pl-[14px] pr-[6px] min-[380px]:pl-[18px] min-[380px]:pr-[10px] screen744:!pl-[28px] screen744:!pr-[16px] screen1280:!px-[40px] flex items-center justify-between gap-[8px] border border-t-0 border-[#E3EBFF] rounded-b-[24px] screen744:!rounded-b-[28px] screen1280:!rounded-b-[32px] backdrop-blur-[8px] bg-[linear-gradient(90deg,rgba(255,255,255,0.8)_0%,rgba(255,255,255,0.45)_100%)] screen1280:!bg-[linear-gradient(90deg,rgba(255,255,255,0.75)_0%,rgba(255,255,255,0.35)_100%)]">
          <Logo />

          {/* Desktop navigation */}
          <nav aria-label="Main" className="hidden screen1280:!flex items-center">
            {navLinks.map((link, index) => {
              const active = isActivePath(pathname, link.href);
              return (
                <React.Fragment key={link.label}>
                  {index > 0 && <span className="w-px h-[35px] bg-[#D5D6D8]" aria-hidden="true" />}
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex items-center h-[44px] px-[20px] text-[14px] rounded-full outline-none",
                      "transition-[color,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                      "hover:text-[#2554D6] focus-visible:text-[#2554D6] active:scale-[0.96] motion-reduce:transition-none",
                      active ? "text-[#2554D6] font-semibold" : "text-[#37465C]"
                    )}
                  >
                    {link.label}
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute left-1/2 bottom-[6px] h-[2px] -translate-x-1/2 rounded-full bg-[#2554D6]",
                        "transition-[width,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                        active
                          ? "w-[calc(100%-40px)] opacity-100"
                          : "w-0 opacity-0 group-hover:w-[calc(100%-40px)] group-hover:opacity-100 group-focus-visible:w-[calc(100%-40px)] group-focus-visible:opacity-100"
                      )}
                    />
                  </Link>
                </React.Fragment>
              );
            })}
          </nav>

          <div className="flex items-center gap-[6px] screen744:!gap-[14px] screen1280:!gap-[18px]">
            {!authReady && (
              <span className="w-[96px] screen744:!w-[110px] h-[40px] screen744:!h-[44px] rounded-full bg-white/60 animate-pulse" />
            )}

            {showSignedOut && (
              <Link
                href="/sign-in"
                className="group relative hidden screen744:!flex items-center h-[44px] px-[4px] text-[14px] font-semibold text-[#2554D6] transition-[color,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-[#1B3FA8] active:scale-[0.96] motion-reduce:transition-none"
              >
                Sign in
                <span
                  aria-hidden="true"
                  className="absolute left-1/2 bottom-[8px] h-[2px] w-0 -translate-x-1/2 rounded-full bg-current opacity-0 transition-[width,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:w-[calc(100%-8px)] group-hover:opacity-100"
                />
              </Link>
            )}

            {/* Pricing + Start Free Practice button group */}
            {(showPricing || showSignedOut) && (
              <div className="flex items-center">
                {showPricing && (
                  <Link
                    href="/pricing"
                    aria-label="Pricing"
                    className={cn(
                      "group/pricing relative z-[1] flex items-center gap-[6px] h-[40px] screen744:!h-[44px] px-[12px] min-[380px]:px-[14px] screen744:!px-[16px]",
                      "bg-[#C4453A] text-white text-[14px] font-semibold whitespace-nowrap",
                      "shadow-[inset_0_1px_0_rgba(255,255,255,0.22),3px_3px_0_0_#759CFF]",
                      "transition-[border-radius,background-color,transform,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                      "hover:bg-[#B83E34] hover:-translate-y-[2px] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.22),4px_5px_0_0_#759CFF]",
                      "active:translate-x-[2px] active:translate-y-[2px] active:shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_0_0_0_#759CFF] active:duration-100",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C4453A] focus-visible:ring-offset-2",
                      "motion-reduce:transition-none",
                      showStart ? "rounded-l-[22px] rounded-r-[6px]" : "rounded-[22px]"
                    )}
                  >
                    <span className="flex origin-bottom group-hover/pricing:animate-crown-wiggle motion-reduce:!animate-none">
                      <CrownIcon />
                    </span>
                    <span className="max-[379px]:hidden">Pricing</span>
                  </Link>
                )}

                {showSignedOut && (
                  <div
                    aria-hidden={!showStart}
                    className={cn(
                      "grid transition-[grid-template-columns,opacity] duration-[650ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                      showStart ? "grid-cols-[1fr] opacity-100" : "grid-cols-[0fr] opacity-0"
                    )}
                  >
                    {/* Extra padding keeps the offset shadow and press motion from being clipped. */}
                    <div className="min-w-0 overflow-hidden -my-[8px] py-[8px] -mr-[8px] pr-[8px]">
                      <Link
                        href="/practice-overview"
                        tabIndex={showStart ? undefined : -1}
                        onClick={() => handleStart("header")}
                        className={cn(
                          "group/start flex items-center justify-center gap-[6px] h-[40px] screen744:!h-[44px] px-[14px] min-[380px]:px-[16px] screen744:!pl-[20px] screen744:!pr-[16px]",
                          "bg-[#2554D6] text-white text-[14px] screen744:!text-[15px] screen1280:!text-[16px] font-medium whitespace-nowrap",
                          "shadow-[inset_0_1px_0_rgba(255,255,255,0.2),3px_3px_0_0_#759CFF]",
                          "transition-[transform,background-color,box-shadow,border-radius] duration-[650ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
                          "hover:bg-[#1F48BD] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.2),4px_5px_0_0_#759CFF]",
                          "active:shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_0_0_0_#759CFF] active:duration-100",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2554D6] focus-visible:ring-offset-2",
                          "motion-reduce:transition-none",
                          showPricing ? "ml-[4px] rounded-r-[22px] rounded-l-[6px]" : "rounded-[22px]",
                          showStart
                            ? "translate-x-0 hover:-translate-y-[2px] active:translate-x-[2px] active:translate-y-[2px]"
                            : "-translate-x-[24px]"
                        )}
                      >
                        <span className="screen744:!hidden">Start Free</span>
                        <span className="hidden screen744:!inline">Start Free Practice</span>
                        <svg
                          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
                          className="hidden screen744:!block transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/start:translate-x-[3px]"
                        >
                          <path d="M5 12h14M13 6l6 6-6 6" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
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
              className="screen1280:!hidden relative flex items-center justify-center w-[44px] h-[44px] rounded-full text-[#1E293B] transition-[background-color,transform] duration-200 hover:bg-white/70 active:scale-90"
            >
              <svg
                width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
                className={cn(
                  "absolute transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                  isMenuOpen ? "opacity-0 rotate-90 scale-75" : "opacity-100 rotate-0 scale-100"
                )}
              >
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
              <svg
                width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
                className={cn(
                  "absolute transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                  isMenuOpen ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-75"
                )}
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile & tablet menu */}
      {isMenuOpen && (
        <div className="screen1280:!hidden">
          <div
            className="fixed inset-0 z-[48] bg-[rgba(33,46,66,0.45)] screen744:!bg-[rgba(33,46,66,0.35)] animate-in fade-in duration-300"
            onClick={closeMenu}
            aria-hidden="true"
          />
          <div
            id="site-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="fixed z-[49] top-0 inset-x-0 pt-[68px] rounded-b-[24px] bg-white shadow-[0_24px_48px_-16px_rgba(33,46,66,0.35)] screen744:!top-[84px] screen744:!left-auto screen744:!right-[24px] screen744:!w-[300px] screen744:!pt-[8px] screen744:!pb-[8px] screen744:!rounded-[20px] screen744:!border screen744:!border-[#E3EBFF] animate-in fade-in slide-in-from-top-3 duration-300 ease-out"
          >
            <nav aria-label="Main" className="flex flex-col px-[20px] pt-[4px] pb-[8px] border-t border-[#E3EBFF] screen744:!px-[8px] screen744:!py-0 screen744:!border-t-0">
              {navLinks.map((link, index) => {
                const active = isActivePath(pathname, link.href);
                return (
                  <Link
                    key={link.label}
                    href={link.href}
                    onClick={closeMenu}
                    aria-current={active ? "page" : undefined}
                    style={{ animationDelay: `${60 + index * 40}ms` }}
                    className={cn(
                      "group flex items-center justify-between h-[52px] px-[12px] screen744:!px-[16px] rounded-[12px] text-[16px]",
                      "animate-in fade-in slide-in-from-top-1 fill-mode-both duration-300",
                      "transition-[background-color,color,transform] duration-200 hover:bg-[#F4F7FF] hover:text-[#2554D6] active:scale-[0.98] active:bg-[#E3EBFF]",
                      active ? "text-[#2554D6] font-semibold bg-[#F4F7FF]" : "text-[#212E42]"
                    )}
                  >
                    {link.label}
                    <svg
                      width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
                      className="opacity-0 -translate-x-[6px] transition-[opacity,transform] duration-200 group-hover:opacity-100 group-hover:translate-x-0"
                    >
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </Link>
                );
              })}
            </nav>

            {showSignedOut && (
              <div className="flex flex-col gap-[4px] px-[20px] pt-[8px] pb-[24px] border-t border-[#EDEEF0] screen744:!hidden">
                <Link
                  href="/practice-overview"
                  onClick={() => handleStart("mobile_menu")}
                  className="flex items-center justify-center h-[52px] rounded-full bg-[#2554D6] text-white text-[16px] font-medium shadow-[3.7px_3.9px_0_0_#759CFF] transition-[transform,box-shadow,background-color] duration-200 hover:bg-[#1F48BD] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[0_0_0_0_#759CFF]"
                >
                  Start Free Practice
                </Link>
                <Link
                  href="/sign-in"
                  onClick={closeMenu}
                  className="flex items-center justify-center h-[48px] rounded-full text-[16px] font-semibold text-[#2554D6] transition-colors duration-200 hover:bg-[#F4F7FF] active:bg-[#E3EBFF]"
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
