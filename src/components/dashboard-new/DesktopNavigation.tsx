"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

import NavIcon, { type NavIconName } from "./NavIcon";

const DesktopNavigation = () => {
  const pathname = usePathname();

  const isPractice =
    pathname === "/practice-overview" ||
    pathname.includes("listening") ||
    pathname.includes("reading") ||
    pathname.includes("writing") ||
    pathname.includes("speaking");
  const isMockExams =
    !isPractice && (pathname === "/exam-overview" || pathname.includes("exams"));
  const isLearning = pathname.includes("/learning");
  const isWords = pathname === "/words";

  const navItems: { label: string; href: string; isActive: boolean; icon: NavIconName }[] = [
    { label: "Practice", href: "/practice-overview", isActive: isPractice, icon: "practice" },
    { label: "Mock Exams", href: "/exam-overview", isActive: isMockExams, icon: "mockExams" },
    { label: "Learning", href: "/learning", isActive: isLearning, icon: "learning" },
    { label: "Words", href: "/words", isActive: isWords, icon: "words" },
  ];

  return (
    <nav aria-label="Main" className="hidden screen1280:!flex gap-[24px] shrink-0 items-center">
      {navItems.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          aria-current={item.isActive ? "page" : undefined}
          className={clsx(
            "group/nav relative flex items-center gap-[8px] h-[40px] rounded-full outline-none hover:!cursor-pointer",
            "transition-colors duration-200",
            "focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-[#759CFF] focus-visible:outline-offset-4",
            item.isActive ? "text-black" : "text-[#76808F] hover:text-[#316BFF] focus-visible:text-[#316BFF]",
          )}
        >
          <span className="flex w-[24px] h-[24px] items-center justify-center">
            {/* key: replay the "landed on this page" motion when it becomes active */}
            <NavIcon key={item.isActive ? "active" : "idle"} name={item.icon} active={item.isActive} />
          </span>
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
};

export default DesktopNavigation;
