import Link from "next/link";
import React from "react";

interface IExamSectionCard {
  title: string;
  icon: React.ReactNode;
  bgColor?: string;
  key: number;
  link: string;
  isLast?: boolean;
}

const ExamSectionCard = ({
  title,
  icon,
  bgColor = "bg-black",
  link,
  isLast,
}: IExamSectionCard) => {
  return (
    <Link
      href={link}
      className={`relative col-span-1 ${
        isLast ? "col-span-2" : ""
      } h-[115px] w-full screen744:flex-1 screen744:!flex-nowrap screen1280:h-[116px] screen1280:!max-w-[212px] before:absolute before:rounded-[24px] hover:before:shadow-[6px_4px_16px_0px_#FC7A5066,_-6px_-4px_16px_0px_#4A7DFF66] before:transition-shadow before:duration-300 before:ease before:content-[''] before:inset-0 before:transform before:translate-z-[-1px] hover:cursor-pointer`}
    >
      <article
        className="relative w-full z-[1] flex flex-col rounded-[16px] h-full bg-white items-center gap-[16px] justify-center"
        aria-label={`Go to ${title} section`}
      >
        <span
          className={`flex items-center justify-center w-[40px] h-[40px] rounded-[8px] ${bgColor}`}
        >
          {icon}
        </span>
        <h3 className="text-text1 font-medium text-[16px]">{title}</h3>
      </article>
    </Link>
  );
};

export default ExamSectionCard;
