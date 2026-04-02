import React from "react";
import SvgPlus from "../../icons/Plus";
import Image from "next/image";
import Link from "next/link";

const Practice = () => {
  return (
    <section aria-labelledby="practice-heading">
      <div className="mx-auto max-w-[1440px] ">
        <div className="relative flex screen744:!block flex-col justify-end items-center mx-[16px] screen744:!mx-[24px] screen1280:!mx-[40px] rounded-[32px] h-[340px] screen744:!h-[200px] screen1280:!h-[240px] p-[24px] screen744:!p-[32px] screen1280:!p-[40px] screen1280:!pl-[104px] mt-[120px] screen744:!mt-[160px] screen1280:!mt-[200px] bg-[radial-gradient(50%_265.62%_at_50%_50%,_#F26B3E_0%,_#FC8A65_100%)] shadow-[0_8px_32px_rgba(242,107,62,0.2)]">
          <h2
            id="practice-heading"
            className="max-w-[280px] screen744:!max-w-[420px] font-semibold text-[20px] screen744:!text-[28px] screen1280:!text-[32px]  text-white leading-[28px] screen744:!leading-[36px]"
          >
            Effective Practice Approaches for CELPIP Preparation
          </h2>
          <div className="mt-[28px] screen744:!mt-[32px] screen1280:!mt-[40px] flex flex-col screen1280:!flex-row items-center screen744:!items-start screen1280:!items-center gap-[16px] screen1280:!gap-[24px] ">
            <div className="group hover:cursor-pointer hover:!bg-[linear-gradient(270deg,_#F79D65_0%,_#759CFF_100%)] shadow-[0_4px_12px_rgba(0,0,0,0.1)] active:shadow-[0_2px_4px_rgba(0,0,0,0.1)] active:scale-95 transition-all flex gap-[8px] pl-[16px] bg-white max-w-[280px] screen744:!max-w-[240px] screen1280:!max-w-[220px] h-[44px] rounded-[24px] items-center justify-center">
              <SvgPlus className="text-text2 group-hover:text-white flex-shrink-0" />
              <Link
                href={"/practice-overview"}
                className="text-text2 group-hover:text-white text-[14px] screen744:!text-[15px] pr-[24px] leading-[16px] font-semibold"
              >
                Start Your Free Practice
              </Link>
            </div>

            <span className="font-normal text-[13px] screen744:!text-[14px] screen1280:!text-[16px] text-white">
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
            className="absolute left-auto right-auto screen744:!right-[16px] -top-[120px] flex screen1280:!hidden"
            src="/images/bear_student_tablet.png"
            alt="Bear student mascot using a tablet for CELPIP preparation"
            width={220}
            height={270}
          />
        </div>
      </div>
    </section>
  );
};

export default Practice;
