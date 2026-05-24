"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";

import SvgBook from "../icons/animated/book/Book";
import SvgArticle from "../icons/animated/article/Article";
import SvgCheck from "../icons/animated/check/Check";
import SvgWord from "../icons/Word";

const BottomNavigation = () => {
  const pathname = usePathname();
  const router = useRouter();

  const [practice, setPractice] = useState(false);
  const [mockTest, setMockTest] = useState(false);
  const isLearning = pathname.includes("/learning");

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

  const items = [
    {
      label: "Practice",
      href: "/practice-overview",
      isActive: practice,
      Icon: SvgBook,
      onClick: undefined as (() => void) | undefined,
    },
    {
      label: "Exams",
      href: undefined,
      isActive: mockTest,
      Icon: SvgArticle,
      onClick: () => router.push("/exam-overview"),
    },
    {
      label: "Learnings",
      href: "/learning",
      isActive: isLearning,
      Icon: SvgCheck,
      onClick: undefined,
    },
    {
      label: "Words",
      href: "/words",
      isActive: isWords,
      Icon: SvgWord,
      onClick: undefined,
    },
  ] as const;

  return (
    <nav
      className="fixed bottom-4 left-1/2 z-20 w-[calc(100%-32px)] max-w-[400px] -translate-x-1/2 screen1280:!hidden"
      aria-label="Mobile main"
      style={{ height: 70 }}
    >
      <div className="absolute inset-0 h-full w-full rounded-full bg-white shadow-[0px_4px_24px_0px_rgba(0,0,0,0.08)]" />

      <div className="relative z-10 grid h-full grid-cols-4 items-center justify-items-center px-4">
        {items.map((item) => {
          const inner = (
            <>
              {item.isActive && (
                <span
                  className="absolute -z-10 h-14 w-20 rounded-full bg-[#E8ECF4]"
                  aria-hidden
                />
              )}
              <span className="flex flex-col items-center gap-1">
                <span className="flex h-6 w-6 items-center justify-center">
                  <item.Icon
                    className={clsx(item.isActive ? "text-black" : "text-[#37465C]")}
                    aria-hidden
                  />
                </span>
                <span
                  className={clsx(
                    item.label === "Words" ? "text-[10px]" : "text-xs",
                    item.isActive ? "text-black" : "text-[#37465C]"
                  )}
                >
                  {item.label}
                </span>
              </span>
            </>
          );

          const className =
            "relative flex h-full w-full cursor-pointer items-center justify-center";

          if (item.onClick) {
            return (
              <button
                key={item.label}
                type="button"
                className={className}
                onClick={item.onClick}
              >
                {inner}
              </button>
            );
          }

          return (
            <Link key={item.label} href={item.href!} prefetch className={className}>
              {inner}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigation;
