import React from "react";
import Image from "next/image";
import { Microphone } from "@/components/icons";

const AIReview = () => {
  return (
    <div className="text-text3   rounded-[8px] border-[1px] border-[#D5D6D8] min-h-[255px]">
      <div className="flex justify-between px-[16px] flex-col-reverse screen744:!flex-row">
        <span className="text-[14px] font-normal leading-[24px] pt-[8px] pb-[12px] screen744:!py-[16px]">
          A Peaceful Countryside Road
        </span>
        <div className="flex items-center gap-[16px] pt-[12px] screen744:!py-[12px] justify-end">
          <span className="text-error2 font-medium text-[16px]">01:10</span>
          <div className="flex justify-center max-w-[129px] w-full rounded-[24px] border-solid border-[1px] border-neutral2 px-[24px] py-[8px] items-center">
            <span className="text-text2 leading-[16px] text-[12px] font-normal flex-shrink-0">
              Next Question
            </span>
          </div>
        </div>
      </div>
      <div className="flex border-t-[1px] border-[#D5D6D8] flex-col screen744:!flex-row ">
        <div className="flex-1 screen744:!max-w-[530px] screen744:!border-r-1 border-[#D5D6D8] flex min-h-[294px] p-[16px] flex-col">
          <span className="text-text2 text-[12px] font-normal leading-[24px]">
            Describe some things that are happening in the picture below as well
            as you can. The person with whom you are speaking cannot see the
            picture.
          </span>
          <div className="relative w-full max-w-[427px] h-[170px]  mt-[10px]">
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
        <div className="flex-1 flex min-h-[134px] screen744:!min-h-[294px] p-[16px]  items-center flex-col">
          <div className="flex justify-center mt-[8px] screen744:!mt-[15px]  leading-[24px] text-center ">
            <h2 className="text-text2 font-semibold text-[18px] text-center">
              Record to Get Score!
            </h2>
          </div>
          <div className="mt-[8px] screen1280:!mt-[24px]">
            <Microphone />
          </div>
          <div className="text-text3 font-normal text-[11px] h-[24px] screen744:!mt-[40px]">
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
