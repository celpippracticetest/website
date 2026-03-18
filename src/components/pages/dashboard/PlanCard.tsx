"use client";
import React from "react";
import CheckoutAttributionFields from "@/components/analytics/CheckoutAttributionFields";
import { useEcommerceTracking } from "@/hooks/useTracking";

interface IPlanCard {
  title: string;
  type: string;
  oldPrice: string;
  price: string;
  buttonTitle: string;
  icon: React.ReactNode;
  iconWrapperColor: string;
  id: number;
}
const PlanCard = ({
  title,
  type,
  oldPrice,
  price,
  buttonTitle,
  icon,
  iconWrapperColor,
  id,
}: IPlanCard) => {
  const { beginCheckout, selectItem } = useEcommerceTracking();

  const handleCheckoutTracking = () => {
    const amount = Number.parseFloat(price);
    if (!Number.isFinite(amount) || amount <= 0 || type === "Free") return;

    const item = {
      item_id: type,
      item_name: title,
      price: amount,
      quantity: 1,
      item_brand: "CELPIP Practice Test",
      item_category: "Subscription",
    };

    selectItem([item], "dashboard_pricing", "Dashboard Pricing Plans");
    beginCheckout([item], "CAD", amount);
  };

  return (
    <form
      className="relative mt-[12px] screen1280:!mt-[32px] w-full screen744:!w-[176px] screen744:!h-[214px] screen1280:!w-[202px] screen1280:!h-[215px]"
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
      <CheckoutAttributionFields />
      <article
        aria-label={`Plan card for ${title} plan`}
        className="relative  mx-[16px]  z-[1] before:absolute before:rounded-[24px]  hover:before:shadow-[6px_4px_16px_0px_#FC7A5066,_-6px_-4px_16px_0px_#4A7DFF66] before:transition-shadow before:duration-300 before:ease before:content-[''] before:inset-0 before:transform before:translate-z-[-1px] hover:cursor-pointer screen744:!w-[176px] screen744:!h-[211px] screen1280:!w-[202px] screen1280:!h-[215px] rounded-[24px] px-[12px] py-[16px] screen1280:!p-[16px] bg-white"
      >
        <div className=" flex gap-[16px] justify-between flex-col screen1280:!flex-row  ">
          <div
            className={`hidden screen1280:!flex shrink-0 w-[32px] h-[32px] rounded-[24px] items-center justify-center ${iconWrapperColor}`}
          >
            {icon}
          </div>
          <div
            className={`px-[24px] text-[11px] font-normal bg-secondary6 h-[35px] flex items-center rounded-[16px] justify-center text-error1`}
          >
            {type}
          </div>
        </div>

        <div
          className={`flex mt-[24px]  ${
            type === "Free" ? "justify-end  h-[22px]" : " h-[17px] "
          } `}
        >
          <h3
            className={`flex items-center  text-[14px] font-medium text-text1`}
          >
            {title}
          </h3>
        </div>
        <div className="flex  items-center mt-[24px] h-[19px] ">
          {type != "Free" && (
            <>
              {oldPrice && (
                <>
                  <span className="relative text-text3 text-[12px] screen1280:!text-[15px]   font-medium">
                    $ {oldPrice}
                    <span
                      className={`-left-1 w-[60px] screen1280:!w-[72px] screen1290:!w-[101px] absolute top-[11px]  screen1280:!top-[13px]  h-[2px] bg-error1 -translate-y-1/2`}
                    ></span>
                  </span>
                  <span className="text-gray font-normal text-[14px] screen1280:!text-[15px]  ml-[5px] mr-[5px]">
                    CA
                  </span>
                </>
              )}
            </>
          )}
          <span className="text-black font-bold text-[16px] ">
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
          onClick={handleCheckoutTracking}
          aria-label={`Select ${title} plan`}
          className="relative z-[2] mt-[24px] hover:cursor-pointer hover:!bg-[linear-gradient(270deg,_#F79D65_0%,_#759CFF_100%)]  shadow-startButton  flex gap-[8px] px-[24px] w-full bg-primary2 mw-full h-[40px] rounded-[24px] items-center justify-center"
        >
          <span className="text-white text-[14px] font-normal leading-[16px] flex items-center justify-center">
            {buttonTitle}
          </span>
        </button>
      </article>
    </form>
  );
};

export default PlanCard;
