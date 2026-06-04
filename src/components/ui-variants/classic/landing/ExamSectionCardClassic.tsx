import Link from "next/link";
import React from "react";
import { cn } from "@/lib/utils";

interface ExamSectionCardClassicProps {
  title: string;
  icon: React.ReactNode;
  bgColor?: string;
  link: string;
  isLast?: boolean;
  className?: string;
}

const ExamSectionCardClassic = ({
  title,
  icon,
  bgColor = "bg-black",
  link,
  isLast,
  className,
}: ExamSectionCardClassicProps) => {
  return (
    <Link
      href={link}
      className={cn(
        "relative col-span-1 h-[115px] w-full screen744:flex-1 screen744:!flex-nowrap screen1280:h-[116px] screen1280:!max-w-[212px]",
        isLast && "col-span-2 screen744:hidden screen1024:flex",
        "before:absolute before:inset-0 before:translate-z-[-1px] before:transform before:rounded-[24px] before:content-[''] before:transition-shadow before:duration-300 before:ease hover:cursor-pointer hover:before:shadow-[6px_4px_16px_0px_#FC7A5066,_-6px_-4px_16px_0px_#4A7DFF66]",
        className,
      )}
    >
      <article
        className="relative z-[1] flex h-full w-full flex-col items-center justify-center gap-[16px] rounded-[16px] bg-white"
        aria-label={`Go to ${title} section`}
      >
        <span
          className={cn(
            "flex h-[40px] w-[40px] items-center justify-center rounded-[8px]",
            bgColor,
          )}
        >
          {icon}
        </span>
        <h3 className="text-[16px] font-medium text-text1">{title}</h3>
      </article>
    </Link>
  );
};

export default ExamSectionCardClassic;
