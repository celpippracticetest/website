import Link from "next/link";
import React from "react";
import { cn } from "@/lib/utils";

interface IExamSectionCard {
  title: string;
  icon: React.ReactNode;
  bgColor?: string;
  link: string;
  isLast?: boolean;
  spanFullRow?: boolean;
  className?: string;
}

const pressAnimationClass =
  "group select-none transition-all duration-300 ease-out transform-gpu will-change-transform hover:-translate-y-[5px] hover:scale-[1.03] active:translate-y-[8px] active:translate-x-[3px] active:scale-[0.98]";

const ExamSectionCard = ({
  title,
  icon,
  bgColor = "bg-black",
  link,
  isLast,
  spanFullRow = false,
  className,
}: IExamSectionCard) => {
  return (
    <Link
      href={link}
      className={cn(
        "relative col-span-1 h-[115px] w-full screen744:flex-1 screen744:!flex-nowrap screen1280:h-[116px]",
        (spanFullRow || isLast) && "col-span-2",
        isLast && "screen744:hidden screen1024:flex",
        pressAnimationClass,
        "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
    >
      <article
        className="relative z-[1] flex h-full w-full flex-col items-center justify-center gap-[16px] rounded-[16px] border border-transparent bg-white transition-colors duration-300 group-hover:border-primary5/60"
        aria-label={`Go to ${title} section`}
      >
        <span
          className={cn(
            "flex h-[40px] w-[40px] items-center justify-center rounded-[8px] transition-transform duration-300 ease-out group-hover:scale-110",
            bgColor,
          )}
        >
          {icon}
        </span>
        <h3 className="text-[16px] font-medium text-text1 transition-colors duration-300 group-hover:text-primary1">{title}</h3>
      </article>
    </Link>
  );
};

export default ExamSectionCard;
