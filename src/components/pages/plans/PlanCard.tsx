"use client";
import React from "react";
import SvgCheck from "../../icons/Check";

interface IPlanCard {
  title: string;
  type: string;
  oldPrice: string;
  price: string;
  discount: string;
  buttonTitle: string;
  features: string[];
  icon: React.ReactNode;
  iconWrapperColor: string;
  id: number;
  currentPlanTitle: string;
  planTitle: string;
}
const PlanCard = ({
  title,
  type,
  oldPrice,
  price,
  discount,
  buttonTitle,
  features,
  icon,
  iconWrapperColor,
  id,
  currentPlanTitle,
  planTitle,
}: IPlanCard) => {
  return (
    <form
      className="relative w-full screen1280:!max-w-[420px]"
      action={
        type == "Easy Start"
          ? "/api/checkout_session?product=" +
            process.env.NEXT_PUBLIC_MONTHLY_ACCESS_PRODUCT
          : type == "Weekly"
          ? "/api/checkout_session?product=" +
            process.env.NEXT_PUBLIC_WEEKLY_ACCESS_PRODUCT
          : type == "Best Seller"
          ? "/api/checkout_session?product=" +
            process.env.NEXT_PUBLIC_QUARTER_ACCESS_PRODUCT
          : type == "Best Value"
          ? "/api/checkout_session?product=" +
            process.env.NEXT_PUBLIC_YEARLY_ACCESS_PRODUCT
          : ""
      }
      method="POST"
    >
      <article
        aria-label={`Plan card for ${title} plan`}
        className="relative  z-[1]  before:absolute before:rounded-[24px] hover:before:shadow-[6px_4px_16px_0px_#FC7A5066,_-6px_-4px_16px_0px_#4A7DFF66] before:transition-shadow before:duration-300 before:ease before:content-[''] before:inset-0 before:transform before:translate-z-[-1px] hover:cursor-pointer  h-[418px] top-[20px]  rounded-[24px] p-[8px] screen1280:!p-[16px] bg-white"
      >
        <div className=" flex gap-[16px] justify-between screen1280:!justify-start">
          <div
            className={`flex w-[32px] h-[32px] rounded-[24px] items-center justify-center ${iconWrapperColor}`}
          >
            {icon}
          </div>
          <div
            className={`px-[24px]  bg-secondary6 h-[35px] flex items-center rounded-[16px] justify-center text-error1`}
          >
            {type}
          </div>
          {currentPlanTitle === planTitle && (
            <div className="flex absolute items-center justify-end screen1280:!justify-end w-full text-[#0DAA94] font-medium position top-[110px] right-[16px]  screen1280:!top-[20px] text-[16px] screen1280:!left-auto screen1280:!right-[16px]">
              Your Current Plan
            </div>
          )}
        </div>

        <div
          className={`flex mt-[24px] flex-col-reverse screen1280:!flex-row ${
            type === "Free"
              ? "justify-end screen1280:!justify-start h-[22px]"
              : "screen1280:!justify-between h-[69px] screen1280:!h-fit"
          } `}
        >
          <h3
            className={`${
              type === "Free" ? "h-[29px]" : "h-[35px]"
            } flex items-center mt-[12px] screen1280:!mt-0 text-[18px]  screen1280:!text-[20px] font-medium text-text1`}
          >
            {title}
          </h3>
          {type != "Free" && (
            <span className="px-[24px] flex-shrink-0  font-semibold w-fit  screen1280:!mt-0 text-[16px] text-white flex items-center justify-center bg-error2 h-[35px] rounded-[16px]">
              {discount}% OFF
            </span>
          )}
        </div>
        <div className="flex gap-[10px] items-center mt-[24px] h-[34px] screen1280:!h-[48px]">
          {type != "Free" && (
            <>
              {oldPrice && (
                <>
                  <span className="relative text-text3 text-[16px] screen744:!text-[28px] screen1280:!text-[26px] font-medium">
                    $ {oldPrice}
                    <span
                      className={`${
                        id == 1
                          ? "-left-2 screen1280:!left-0 w-[101px]"
                          : "-left-2 screen1280:!left-[12px] w-[112px]"
                      } absolute  screen1280:!flex top-[13px]   screen744:!top-[20px] screen1280:!top-[22px]  screen1280:!w-[129px] h-[2px] bg-error1 -translate-y-1/2`}
                    ></span>
                  </span>

                  <span className="text-gray font-normal text-[16px] screen744:!text-[20px]">
                    CA
                  </span>
                </>
              )}
            </>
          )}
          <span className="text-black font-bold text-[18px] screen744:!text-[28px] screen1280:!text-[31px]">
            $ {price}
            {type == "Free" && (
              <span className="text-gray font-normal text-[20px]">
                {" "}
                (forever)
              </span>
            )}
          </span>
        </div>

        <button
          type="submit"
          aria-label={`Select ${title} plan`}
          className="relative z-[2] mt-[24px] hover:cursor-pointer hover:!bg-[linear-gradient(270deg,_#F79D65_0%,_#759CFF_100%)]  shadow-startButton  flex gap-[8px] px-[24px] w-full bg-primary2 mw-full h-[40px] rounded-[24px] items-center justify-center"
        >
          <span className="text-white text-[14px] font-normal leading-[16px] flex items-center justify-center">
            {buttonTitle}
          </span>
        </button>
        <ul className="flex flex-col gap-[6px] mt-[16px] screen1280:mt-[24px]">
          {features.map((item, index) => (
            <li className="flex gap-[8px] items-center" key={index}>
              <SvgCheck className="text-[0DAA94]"/>
              <span className="text-text2 font-normal text-[14px] screen1280:!text-[16px] leading-[16px]">
                {item}
              </span>
            </li>
          ))}
        </ul>
      </article>
    </form>
  );
};

export default PlanCard;
