"use client";
import React from "react";
import SvgCheck from "../../icons/Check";
import CheckoutAttributionFields from "@/components/analytics/CheckoutAttributionFields";
import { useEcommerceTracking } from "@/hooks/useTracking";
import { useUser } from "@clerk/nextjs";

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
  highlight?: boolean;
  muted?: boolean;
  savingsText?: string;
  highlightLabel?: string;
  accessLabel?: string;
  description?: string;
  footerNote?: string;
  stripePriceId?: string;
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
  highlight = false,
  muted = false,
  savingsText,
  highlightLabel,
  accessLabel,
  description,
  footerNote,
  stripePriceId,
}: IPlanCard) => {
  const { selectItem, beginCheckout } = useEcommerceTracking();
  const { user } = useUser();
  const hasDiscountValue = Number.parseFloat(discount) > 0;
  const shouldShowSavingsBadge = Boolean(savingsText) || hasDiscountValue;

  const handlePlanClick = () => {
    // Track plan selection
    const item = {
      item_id: planTitle,
      item_name: title,
      price: parseFloat(price),
      quantity: 1,
      item_brand: 'CELPIP Practice Test',
      item_category: 'Subscription',
    };

    selectItem([item], 'plans_page', 'Pricing Plans');

    // Track beginning of checkout
    beginCheckout([item], "CAD", parseFloat(price), undefined, {
      email: user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase(),
      address: {
        first_name: user?.firstName || "",
        last_name: user?.lastName || "",
      },
    });

  };

  const checkoutAction = stripePriceId
    ? `/api/checkout_session?price=${stripePriceId}`
    : type == "Easy Start"
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
            : "";

  return (
    <form
      className="relative h-full w-full screen1280:!max-w-[420px]"
      action={checkoutAction}
      method="POST"
    >
      <CheckoutAttributionFields />
      {highlightLabel && (
        <div className="absolute left-1/2 top-0 z-[3] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-orange-500 via-amber-400 to-blue-500 px-4 py-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-white shadow-lg">
          {highlightLabel}
        </div>
      )}
      <article
        aria-label={`Plan card for ${title} plan`}
        className={`relative top-[20px] z-[1] flex min-h-[470px] flex-col rounded-[24px] p-[12px] before:absolute before:inset-0 before:rounded-[24px] before:transition-shadow before:duration-300 before:ease before:content-[''] before:transform before:translate-z-[-1px] screen1280:!p-[18px] ${
          highlight
            ? "border-2 border-amber-300 bg-[linear-gradient(180deg,_#FFF8E8_0%,_#FFFFFF_34%,_#F5F9FF_100%)] shadow-[0_18px_45px_rgba(117,156,255,0.18)] before:shadow-[0_18px_45px_rgba(247,157,101,0.18)]"
            : muted
              ? "border border-slate-200 bg-slate-50/80 before:shadow-none"
              : "bg-white hover:before:shadow-[6px_4px_16px_0px_#FC7A5066,_-6px_-4px_16px_0px_#4A7DFF66]"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-[16px] bg-white/80 shadow-sm">
            <div
              className={`flex h-[32px] w-[32px] items-center justify-center rounded-[24px] ${iconWrapperColor}`}
            >
              {icon}
            </div>
          </div>
          <div className="flex flex-1 flex-wrap justify-end gap-2">
            {accessLabel && (
              <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700">
                {accessLabel}
              </div>
            )}
            <div
              className={`px-[16px] h-[35px] flex items-center rounded-[16px] justify-center text-[12px] font-semibold ${
                highlight
                  ? "bg-amber-100 text-amber-700"
                  : muted
                    ? "bg-white text-slate-600"
                    : "bg-secondary6 text-error1"
              }`}
            >
              {type}
            </div>
          </div>
        </div>

        {currentPlanTitle === planTitle && (
          <div className="mt-4 rounded-[16px] bg-[#F0FFFD] px-4 py-2 text-[14px] font-medium text-[#0DAA94]">
            Your Current Plan
          </div>
        )}

        <div className="mt-5">
          <p className="text-[13px] font-medium uppercase tracking-[0.08em] text-slate-500">
            {planTitle}
          </p>
          <h3 className="mt-2 text-[24px] font-semibold leading-tight text-text1 screen1280:!text-[28px]">
            {title}
          </h3>
          {description && (
            <p className="mt-3 text-[14px] leading-6 text-slate-600">
              {description}
            </p>
          )}
          {type != "Free" && shouldShowSavingsBadge && (
            <span
              className={`mt-4 flex h-[35px] w-fit items-center justify-center rounded-[16px] px-[16px] text-[14px] font-semibold ${
                highlight
                  ? "bg-gradient-to-r from-orange-500 to-amber-400 text-white shadow-md"
                  : muted
                    ? "bg-white text-slate-700 border border-slate-200"
                    : "bg-error2 text-white"
              }`}
            >
              {savingsText || `${discount}% OFF`}
            </span>
          )}
        </div>

        <div className="mt-6 flex min-h-[48px] items-end gap-[10px]">
          {type != "Free" && (
            <>
              {oldPrice && (
                <>
                  <span className="relative text-[16px] font-medium text-text3 screen744:!text-[28px] screen1280:!text-[26px]">
                    $ {oldPrice}
                    <span
                      className={`${id == 1
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
          <span className="text-[22px] font-bold text-black screen744:!text-[32px] screen1280:!text-[36px]">
            $ {price}
            {type == "Free" && (
              <span className="text-gray font-normal text-[20px]">
                {" "}
                (forever)
              </span>
            )}
          </span>
        </div>

        {footerNote && (
          <p className="mt-2 text-[13px] font-medium text-slate-500">
            {footerNote}
          </p>
        )}

        <button
          type="submit"
          onClick={handlePlanClick}
          aria-label={`Select ${title} plan`}
          className={`relative z-[2] mt-[24px] hover:cursor-pointer shadow-startButton flex gap-[8px] px-[24px] w-full mw-full h-[40px] rounded-[24px] items-center justify-center ${
            highlight
              ? "bg-[linear-gradient(270deg,_#F79D65_0%,_#759CFF_100%)] hover:opacity-95"
              : muted
                ? "bg-slate-700 hover:bg-slate-800"
                : "bg-primary2 hover:!bg-[linear-gradient(270deg,_#F79D65_0%,_#759CFF_100%)]"
          }`}
        >
          <span className="text-white text-[14px] font-normal leading-[16px] flex items-center justify-center">
            {buttonTitle}
          </span>
        </button>
        <ul className="mt-6 flex flex-1 flex-col gap-[10px]">
          {features.map((item, index) => (
            <li className="flex items-start gap-[10px]" key={index}>
              <SvgCheck className="mt-0.5 text-[0DAA94]" />
              <span className="text-[14px] leading-6 text-text2 screen1280:!text-[15px]">
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
