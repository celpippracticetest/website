"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";

import SvgBook from "../icons/animated/book/Book";
import SvgArticle from "../icons/animated/article/Article";
import SvgCheck from "../icons/animated/check/Check";
import SvgWord from "../icons/Word";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";

const DesktopNavigation = () => {
  const pathname = usePathname();
  const { isSignedIn } = useHybridWebUser();

  const [practice, setPractice] = useState(false);
  const [mockTest, setMockTest] = useState(false);
  const isLearning = pathname.includes("/learning");
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const [learningPending, setLearningPending] = useState(0);

  useEffect(() => {
    if (!isSignedIn) {
      setLearningPending(0);
      return;
    }
    let cancelled = false;
    void fetch("/api/learning/pending")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.pendingCount != null) {
          setLearningPending(Number(data.pendingCount) || 0);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isSignedIn, pathname]);

  useEffect(() => {
    if (
      pathname === "/practice-overview" ||
      pathname.includes("listening") ||
      pathname.includes("reading") ||
      pathname.includes("writing") ||
      pathname.includes("speaking")
    ) {
      setPractice(true);
      setMockTest(false);
    } else if (pathname === "/exam-overview" || pathname.includes("exams")) {
      setMockTest(true);
      setPractice(false);
    } else if (pathname.includes("/learning")) {
      setPractice(false);
      setMockTest(false);
    } else {
      setPractice(false);
      setMockTest(false);
    }
  }, [pathname]);

  const isWords = pathname === "/words";

  const navItems = [
    {
      label: "Practice",
      href: "/practice-overview",
      isActive: practice,
      StaticIcon: SvgBook,
    },
    {
      label: "Exams",
      href: "/exam-overview",
      isActive: mockTest,
      StaticIcon: SvgArticle,
    },
    {
      label: "Learning",
      href: "/learning",
      isActive: isLearning,
      StaticIcon: SvgCheck,
    },
    {
      label: "Words",
      href: "/words",
      isActive: isWords,
      StaticIcon: SvgWord,
    },
  ];

  return (
    <nav
      className="hidden shrink-0 items-center gap-6 screen1280:!flex"
      aria-label="Main"
    >
      {navItems.map((item) => {
        const isHovered = hoveredLabel === item.label;

        return (
          <Link
            key={item.label}
            href={item.href}
            className="group relative flex items-center gap-2 hover:cursor-pointer"
            onMouseEnter={() => setHoveredLabel(item.label)}
            onMouseLeave={() => setHoveredLabel(null)}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center">
              <item.StaticIcon
                className={clsx(
                  "transition-colors duration-200",
                  item.isActive
                    ? "text-black"
                    : isHovered
                      ? "text-[#316BFF]"
                      : "text-[#76808F]"
                )}
                aria-hidden
              />
            </span>
            <span
              className={clsx(
                "transition-colors duration-200",
                item.isActive
                  ? "text-black"
                  : "text-[#76808F] group-hover:text-[#316BFF]"
              )}
            >
              {item.label}
            </span>
            {item.label === "Learning" && !isLearning && (
              <span className="rounded bg-secondary2 px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none text-white">
                NEW
              </span>
            )}
            {item.label === "Learning" && learningPending > 0 && !isLearning && (
              <span className="absolute -right-3 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-error1 px-1 text-[10px] font-bold text-white">
                {learningPending > 9 ? "9+" : learningPending}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
};

export default DesktopNavigation;
