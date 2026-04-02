import Link from "next/link";
import React from "react";

interface IExamSectionCard {
  title: string;
  icon: React.ReactNode;
  bgColor?: string;
  key: number;
  link: string;
  isLast?: boolean;
  className?: string;
}

const ExamSectionCard = ({
  title,
  icon,
  bgColor = "bg-black",
  link,
  isLast,
  className,
}: IExamSectionCard) => {
  return (
    <Link
      href={link}
      className={`relative col-span-1 ${isLast ? "col-span-2 screen744:hidden screen1024:flex" : ""
        } h-[120px] w-full screen744:flex-1 screen744:!flex-nowrap screen1280:h-[120px] screen1280:!max-w-[212px] before:absolute before:rounded-[20px] hover:before:shadow-[6px_4px_16px_0px_#FC7A5066,_-6px_-4px_16px_0px_#4A7DFF66] before:transition-shadow before:duration-300 before:ease before:content-[''] before:inset-0 before:transform before:translate-z-[-1px] hover:cursor-pointer active:scale-95 transition-transform ${className}`}
    >
      <article
        className="relative w-full z-[1] flex flex-col rounded-[20px] h-full bg-white items-center gap-[12px] justify-center shadow-[0_2px_8px_rgba(33,46,66,0.08)] hover:shadow-[0_8px_24px_rgba(33,46,66,0.12)] transition-shadow duration-300"
        aria-label={`Go to ${title} section`}
      >
        <span
          className={`flex items-center justify-center w-[44px] h-[44px] rounded-[12px] ${bgColor} transition-transform duration-300`}
        >
          {icon}
        </span>
        <h3 className="text-text1 font-semibold text-[15px] screen744:!text-[16px] text-center px-[8px]">{title}</h3>
      </article>
    </Link>
  );
};

export default ExamSectionCard;
