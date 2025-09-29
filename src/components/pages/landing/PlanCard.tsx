import React, { useRef, useState } from "react";
import SvgCheck from "../../icons/Check";
import { SignInButton, SignUpButton, useUser } from "@clerk/nextjs";
import { Close } from "@/components/icons";
import LoginModal from "@/components/modal/LoginModal";

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
}: IPlanCard) => {
  const { user, isLoaded, isSignedIn } = useUser();
  const noUser = isLoaded ? !isSignedIn : false;
  const [showLoginModal, setShowLoginModal] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      className="relative  before:absolute before:rounded-[24px] hover:before:shadow-[6px_4px_16px_0px_#FC7A5066,_-6px_-4px_16px_0px_#4A7DFF66] before:transition-shadow before:duration-300 flex-col screen1280:!flex-row before:ease before:content-[''] before:inset-0 before:transform before:translate-z-[-1px] hover:cursor-pointer w-full screen1280:!w-[437px] h-[438px] screen1280:!h-[428px] rounded-[24px] p-[16px] bg-white"
      ref={formRef}
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
      <article aria-label={`Plan card for ${title} plan`} className="">
        {noUser && showLoginModal && (
          <LoginModal setShowLoginModal={setShowLoginModal} />
        )}
        <div className="flex gap-[16px] justify-between screen1280:!justify-start">
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
            } flex items-center mt-[12px] screen1280:!mt-0 text-[18px] screen1280:!text-[24px] font-medium text-text1`}
          >
            {title}
          </h3>
          {type != "Free" && (
            <>
              {discount && (
                <span className="px-[24px] shrink-0  font-semibold w-fit  screen1280:!mt-0 text-[16px] text-white flex items-center justify-center bg-error2 h-[35px] rounded-[16px]">
                  {discount}% OFF
                </span>
              )}
            </>
          )}
        </div>
        <div className="flex gap-[10px] items-center mt-[24px] h-[34px] screen1280:!h-[48px]">
          {type != "Free" && (
            <>
              {oldPrice && (
                <>
                  <span className="relative text-text3 text-[18px] font-medium">
                    $ {oldPrice}
                    <span
                      className={`${
                        id == 1
                          ? "-left-2 screen1280:!left-[12px] w-[86px] screen1280:!w-[60px]"
                          : "-left-2 screen1280:!left-[12px] w-[86px] screen1280:!w-[60px]"
                      } absolute  screen1280:!flex top-[14px] w-[60px] h-[2px] bg-error1 -translate-y-1/2`}
                    ></span>
                  </span>
                  <span className="text-gray font-normal text-[20px]">CA</span>
                </>
              )}
            </>
          )}
          <span className="text-black font-bold text-[25px]">
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
          aria-label={`Select ${title} plan`}
          onClick={(e) => {
            e.preventDefault();
            if (noUser) {
              setShowLoginModal(true);
            } else {
              formRef.current?.submit();
            }
          }}
          className="relative z-[2] mt-[24px] hover:cursor-pointer hover:!bg-[linear-gradient(270deg,_#F79D65_0%,_#759CFF_100%)]  shadow-startButton  flex gap-[8px] px-[24px] w-full bg-primary2 mw-full h-[40px] rounded-[24px] items-center justify-center"
        >
          <span className="text-white text-[14px] font-normal leading-[16px] flex items-center justify-center">
            {buttonTitle}
          </span>
        </button>
        <ul className="flex flex-col gap-[12px] mt-[24px]">
          {features.map((item, index) => (
            <li className="flex gap-[8px] items-center" key={index}>
              <SvgCheck className="text-[0DAA94]" />
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
