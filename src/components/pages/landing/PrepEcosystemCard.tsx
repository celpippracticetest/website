import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type PrepEcosystemCardProps = {
  title: string;
  icon: ReactNode;
  bgColor: string;
  link: string;
  className?: string;
};

/**
 * Shared skill shortcut tile (style 1 & 2 heroes) — not the legacy ExamSectionCard link+glow.
 */
export function PrepEcosystemCard({
  title,
  icon,
  bgColor,
  link,
  className,
}: PrepEcosystemCardProps) {
  return (
    <Link
      href={link}
      className={cn(
        "flex flex-col items-center justify-center p-4 screen744:p-6 rounded-[24px] bg-white border border-primary5 shadow-sm hover:shadow-md transition-all group",
        className,
      )}
    >
      <div
        className={cn(
          "w-12 h-12 screen744:w-16 screen744:h-16 rounded-2xl flex items-center justify-center mb-3 screen744:mb-4 group-hover:scale-110 transition-transform",
          bgColor,
        )}
      >
        {icon}
      </div>
      <span className="text-sm screen744:text-base font-bold text-text1">
        {title}
      </span>
    </Link>
  );
}
