"use client";

import React, { useEffect, useRef, useState } from "react";
import { useOnlineUsersLiveStat } from "@/hooks/useRecentSignupsLiveStat";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import QuizIcon from "@mui/icons-material/Quiz";
import SchoolIcon from "@mui/icons-material/School";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import AbcIcon from "@mui/icons-material/Abc";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { TopHeaderRightSide } from "@/components/v2/TopHeaderRightSide";
import { cn } from "@/lib/utils";

const mainNav = [
  {
    label: "Mock Exams",
    href: "/exam-overview",
    icon: QuizIcon,
  },
  {
    label: "Practice",
    href: "/practice-overview",
    icon: SchoolIcon,
  },
  {
    label: "Learning",
    href: "/learning",
    icon: MenuBookIcon,
  },
  {
    label: "Words",
    href: "/words",
    icon: AbcIcon,
  },
] as const;

function HeaderOnlineBadge({
  compact,
  className,
  variant = "default",
}: {
  compact?: boolean;
  className?: string;
  variant?: "default" | "onNavy";
}) {
  const { display } = useOnlineUsersLiveStat("4,100");
  const label = compact
    ? `${display}+ practicing right now`
    : `${display}+ online now`;

  return (
    <div
      className={cn(
        "inline-flex max-w-full items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold",
        variant === "default" &&
          "border border-emerald-200 bg-emerald-50 text-emerald-700",
        variant === "onNavy" &&
          "border border-white/20 bg-white/10 text-emerald-50 backdrop-blur-sm",
        compact && "w-full justify-start py-2 pl-3",
        className,
      )}
    >
      <span className="relative flex h-2 w-2 shrink-0">
        <span
          className={cn(
            "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
            variant === "default" && "bg-emerald-400",
            variant === "onNavy" && "bg-emerald-300",
          )}
        />
        <span
          className={cn(
            "relative inline-flex h-2 w-2 rounded-full",
            variant === "default" && "bg-emerald-500",
            variant === "onNavy" && "bg-emerald-300",
          )}
        />
      </span>
      <span className="truncate">{label}</span>
    </div>
  );
}

const TopHeader = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mobileOpen) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => document.body.classList.remove("overflow-hidden");
  }, [mobileOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    if (mobileOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!mobileOpen || !drawerRef.current) return;
      const t = e.target as Node;
      if (!drawerRef.current.contains(t)) setMobileOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [mobileOpen]);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-[1200] border-b border-slate-200/90",
          "bg-white/95 backdrop-blur-[16px] supports-[backdrop-filter]:bg-white/90",
        )}
      >
        <div className="mx-auto flex h-16 min-h-[64px] w-full max-w-[1200px] items-center justify-between gap-3 px-4 screen744:h-[72px] screen744:min-h-[72px] screen744:px-8">
          <Link
            className="flex shrink-0 flex-row items-center gap-2"
            href="/"
            aria-label="CELPIP Practice Test home"
            onClick={() => setMobileOpen(false)}
          >
            <Image
              src="/images/header-logo-left.png"
              alt=""
              width={32}
              height={32}
              className="block h-8 w-8 shrink-0"
              priority
              sizes="32px"
            />
            <Image
              src="/images/header-logo-right.png"
              alt=""
              width={84}
              height={40}
              className="hidden h-8 w-auto min-[376px]:block"
              priority
              sizes="84px"
            />
          </Link>

          <nav className="hidden items-center gap-1 screen1280:flex">
            {mainNav.map(({ label, href, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[15px] font-medium text-slate-800 transition-colors hover:bg-slate-100 hover:text-[#2563EB]"
              >
                <Icon sx={{ fontSize: 18, color: "#3B82F6" }} aria-hidden />
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex flex-1 items-center justify-end gap-2 screen744:gap-3">
            <div className="hidden screen1280:block">
              <HeaderOnlineBadge />
            </div>
            <TopHeaderRightSide />
            <button
              type="button"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-800 transition-colors hover:bg-slate-100 screen1280:hidden"
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
            >
              <MenuIcon />
            </button>
          </div>
        </div>
      </header>

      {mobileOpen ? (
        <div
          className="fixed inset-0 z-[1199] bg-[#0F172A]/45 backdrop-blur-[6px] screen1280:hidden"
          aria-hidden
        />
      ) : null}

      <motion.div
        ref={drawerRef}
        initial={false}
        animate={{ x: mobileOpen ? 0 : "100%" }}
        transition={{ type: "tween", duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
        className={cn(
          "fixed right-0 top-0 z-[1201] flex h-[100dvh] max-h-[100dvh] w-[min(100%,400px)] flex-col overflow-hidden rounded-l-3xl border-l border-slate-200/90 bg-[#FAFBFF] shadow-[-12px_0_40px_rgba(15,23,42,0.12)] screen1280:hidden",
          mobileOpen ? "pointer-events-auto" : "pointer-events-none",
        )}
      >
        <div className="shrink-0 bg-gradient-to-br from-[#1B2B5A] via-[#2E4494] to-[#3B5998] px-5 pb-5 pt-[max(1rem,env(safe-area-inset-top))]">
          <div
            className="mb-4 mr-auto h-1 w-10 rounded-full bg-white/30"
            aria-hidden
          />
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
                CELPIP Practice
              </p>
              <h2 className="mt-1 text-xl font-bold tracking-tight text-white">Menu</h2>
              <p className="mt-1 text-sm text-white/75">Mock exams, practice, and study tools.</p>
            </div>
            <button
              type="button"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
            >
              <CloseIcon sx={{ fontSize: 22 }} />
            </button>
          </div>
          <div className="mt-4">
            <HeaderOnlineBadge compact variant="onNavy" className="w-full" />
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-y-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
          <nav className="flex flex-col gap-2">
            {mainNav.map(({ label, href, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                className="flex items-center gap-3 rounded-2xl border border-slate-200/90 bg-white px-3.5 py-3.5 text-[15px] font-semibold text-slate-800 shadow-sm transition-[border-color,box-shadow] hover:border-slate-300 hover:shadow-md active:scale-[0.99]"
                onClick={() => setMobileOpen(false)}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#EFF6FF] to-[#E0E7FF] text-[#2563EB]">
                  <Icon sx={{ fontSize: 22 }} aria-hidden />
                </span>
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex flex-col gap-2.5">
            <Link
              href="/pricing"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-amber-400/90 bg-white px-4 py-3.5 text-sm font-semibold text-amber-950 shadow-sm transition-colors hover:bg-amber-50/80"
              onClick={() => setMobileOpen(false)}
            >
              <AutoAwesomeIcon sx={{ fontSize: 20 }} />
              View pricing
            </Link>
            <Link
              href="/practice-overview"
              className="inline-flex w-full items-center justify-center rounded-full bg-gradient-to-br from-[#1B2B5A] to-[#2E4494] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(27,43,90,0.35)] transition-[transform,box-shadow] hover:shadow-[0_10px_28px_rgba(27,43,90,0.42)] active:scale-[0.99]"
              onClick={() => setMobileOpen(false)}
            >
              Start free practice
            </Link>
          </div>

          <div className="mt-auto rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3.5 text-center text-xs leading-relaxed text-slate-600 backdrop-blur-sm">
            Trusted by <strong className="text-slate-800">70,000+</strong> test-takers worldwide
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default TopHeader;
