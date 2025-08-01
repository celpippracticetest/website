import React from "react";
import Image from "next/image";
import { Microphone } from "@/components/icons";

const AIReview = () => {
  return (
    <div className="text-text3   rounded-[8px] border-[1px] border-[#D5D6D8] min-h-[255px]">
      <div className="flex justify-between px-[16px] flex-col-reverse ">
        <span className="text-[12px] font-normal  text-text2 pb-[12px] ">
          A Peaceful Countryside Road
        </span>
        <div className="flex items-center gap-[16px] pt-[12px]  justify-end">
          <span className="text-error2 font-medium text-[14px]">01:10</span>
          <div className="flex justify-center max-w-[129px] w-full rounded-[24px] border-solid border-[1px] border-neutral2 px-[24px] py-[8px] items-center">
            <span className="text-text2  text-[12px] font-normal flex-shrink-0">
              Next Question
            </span>
          </div>
        </div>
      </div>
      <div className="flex border-t-[1px] border-[#D5D6D8] flex-col ">
        <div className="flex-1 sm:!max-w-[530px]  border-[#D5D6D8] flex  p-[16px] flex-col">
          <div className="relative w-full max-w-[262px] h-[129px]  ">
            <Image
              src={`/images/peaceful-countryside.png`}
              layout="fill"
              alt="Peaceful countryside road used for CELPIP speaking practice prompt"
              loading="lazy"
              className="absolute"
            />
          </div>
          <div>
            <span className="text-text2 text-[14px] font-normal">
              Recording time:{" "}
              <span className="text-[14px] font-semibold">60s</span>
            </span>
          </div>
        </div>
        <div className="flex-1 flex min-h-[134px] sm:!min-h-[294px] p-[16px]  items-center flex-col">
          <div className="flex justify-center mt-[8px] sm:!mt-[15px]  leading-[24px] text-center ">
            <h2 className="text-text2 font-semibold text-[18px] text-center">
              Record to Get Score!
            </h2>
          </div>
          <div className="mt-[8px] md:!mt-[24px]">
            <Microphone />
          </div>
          <div className="text-text3 font-normal text-[11px] h-[24px] sm:!mt-[40px]">
            Calculating your score...
          </div>
          <Image
            src={`/images/progress.png`}
            width={1112}
            height={8}
            alt="Score progress bar"
            loading="lazy"
            style={{ height: "8px", width: "auto" }}
          />{" "}
        </div>
      </div>
    </div>
  );
};

export default AIReview;
