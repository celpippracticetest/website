"use client";

import React from "react";
import SvgPlus from "../../icons/Plus";
import Image from "next/image";
import Link from "next/link";
import { useHomepageCta } from "@/hooks/useHomepageCta";

const Practice = () => {
  const { href, label, trackClick } = useHomepageCta();

  return (
    <section id="practice" className="scroll-mt-24" aria-labelledby="practice-heading">
      <div className="mx-auto max-w-[1440px] ">
        <div className="relative flex screen744:!block flex-col justify-end items-center mx-[20px] screen1280:!mx-[40px] rounded-[40px] h-[357px] screen744:!h-[209px] screen1280:!h-[256px] p-[24px] screen1280:!p-[40px] screen1280:!pl-[104px] mt-[184px] screen744:!mt-[180px] screen1280:!mt-[256px] bg-[radial-gradient(50%_265.62%_at_50%_50%,_#F26B3E_0%,_#FC8A65_100%)]">
          <h2
            id="practice-heading"
            className="max-w-[311px] screen1280:!max-w-[480px] font-medium text-[20px] screen1280:!text-[32px]  text-white"
          >
            Effective Practice Approaches for CELPIP Preparation
          </h2>
          <div className="mt-[32px] screen1280:!mt-[40px] flex flex-col screen1280:!flex-row items-center screen744:!items-start screen1280:!items-center gap-[16px] screen1280:!gap-[24px] ">
            <div className="group hover:cursor-pointer hover:!bg-[linear-gradient(270deg,_#F79D65_0%,_#759CFF_100%)] shadow-startButton flex gap-[8px] pl-[16px] bg-white max-w-[311px] screen1280:!max-w-[223px] h-[40px] rounded-[24px] items-center justify-center">
              <SvgPlus className="text-text2 group-hover:text-white" />
              <Link
                href={href}
                onClick={() => trackClick("practice_section")}
                className="text-text2 group-hover:text-white text-[14px] pr-[24px] leading-[16px] font-medium"
              >
                {label}
              </Link>
            </div>

            <span className="font-normal text-[14px] screen1280:!text-[16px] text-white">
              No credit card required
            </span>
          </div>
          <Image
            className="absolute right-[104px] -top-[210px] hidden screen1280:!flex"
            src="/images/bear_student.png"
            alt="Bear student mascot holding a CELPIP study guide"
            width={325}
            height={488}
          />
          <Image
            className="absolute left-auto right-auto screen744:!right-[21px] -top-[168px] screen744:-top-[126px] flex screen1280:!hidden"
            src="/images/bear_student_tablet.png"
            alt="Bear student mascot using a tablet for CELPIP preparation"
            width={242}
            height={297}
          />
        </div>
      </div>
    </section>
  );
};

export default Practice;
