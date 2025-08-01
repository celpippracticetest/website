import React from "react";
import { Down, Svg7, Svg9 } from "../../../icons";

const Improve = () => {
  return (
    <>
      <div className="text-text3   rounded-[8px] border-[1px] border-[#D5D6D8] min-h-[369px]">
        <div className="flex justify-between px-[16px] flex-col-reverse screen744:!flex-row">
          <h2 className="text-[14px] font-normal leading-[24px] pt-[8px] pb-[12px] screen744:!py-[16px]">
            A Peaceful Countryside Road
          </h2>
          <div className="flex items-center gap-[16px] pt-[12px] screen744:!py-[12px] justify-end">
            <span className="text-error2 font-medium text-[16px]">24:10</span>
            <div className="flex justify-center max-w-[129px] w-full rounded-[24px] border-solid border-[1px] border-neutral2 px-[24px] py-[8px] items-center">
              <span className="text-text2 leading-[16px] text-[12px] font-normal flex-shrink-0">
                Next Question
              </span>
            </div>
          </div>
        </div>
        <div className="flex border-t-[1px] border-[#D5D6D8] flex-col screen744:flex-row">
          <div className="flex-1 h-auto max-w-[530px] screen1280:!border-r-[1px] border-[#D5D6D8] flex  p-[16px] flex-col">
            <span className="text-text2 text-[12px] font-normal leading-[24px]">
              A local business council is exploring ways to strengthen the
              economy by helping screen744all businesses and wants your input
              after seeing their struggles and potential. They’ve sent a survey
              to find the best support method, aiming to lift the community’s
              prosperity. This is your chance to boost local growth! Which
              option do you prefer? Why? -Option A: Provide tax incentives and
              grants to screen744all businesses. -Option B: Create community
              markets and pop-up events for local entrepreneurs.
            </span>

            <div className="rounded-[12px] mt-[10px] px-[16px] py-[8px] border-[1px] border-solid border-[#D5D6D8]">
              <div className="flex flex-col gap-[10px] justify-between font-normal text-[14px] text-text2">
                <div className="flex justify-between">
                  <span>Sample Response (Beginner)</span>
                  <span>
                    <Down />
                  </span>
                </div>
                <div className="h-[1px] bg-[#D5D6D8]"></div>
                <div className="flex justify-between">
                  <span> Sample Response (Intermediate)</span>
                  <span>
                    <Down />
                  </span>
                </div>
                <div className="h-[1px] bg-[#D5D6D8]"></div>
                <div className="flex justify-between">
                  <span> Sample Response (Advanced)</span>
                  <span>
                    <Down />
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1 flex min-h-[294px] p-[16px] bg-[#F8FAFC] flex-col">
            <div>
              <h2 className="text-text2 text-[18px] font-semibold">
                Your Submissions:
              </h2>

              <div className="flex justify-between mt-[8px] px-[16px] items-center bg-white h-[66px] rounded-[12px] border-[1px] border-solid border-outline">
                <span className="text-text2">1. 1 minute ago</span>
                <Svg9 />
              </div>
              <div className="flex justify-between mt-[8px]  px-[16px] items-center bg-white h-[66px] rounded-[12px] border-[1px] border-solid border-outline">
                <span className="text-text2">2. 8 minutes ago</span>
                <Svg7 />
              </div>
              <div className="flex justify-between mt-[8px]  px-[16px] items-center bg-white h-[66px] rounded-[12px] border-[1px] border-solid border-outline">
                <span className="text-text2">1. 1 minute ago</span>
                <Svg7 />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Improve;
