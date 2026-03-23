"use client";
import React from "react";
import SvgCheck from "../../icons/Check";
import CheckoutAttributionFields from "@/components/analytics/CheckoutAttributionFields";
import { useEcommerceTracking } from "@/hooks/useTracking";
import {
  formatBillingCycle,
  formatPlanCadPrice,
  parsePrice,
} from "@/lib/pricing";
import type { PlanBillingInterval } from "@/types/pricing";
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
  compact?: boolean;
  featureLimit?: number;
  mockExamStatus?: "included" | "notIncluded";
  billingInterval?: PlanBillingInterval;
  billingIntervalCount?: number;
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
  compact = false,
  featureLimit,
  mockExamStatus,
  billingInterval,
  billingIntervalCount,
}: IPlanCard) => {
  const { selectItem, beginCheckout } = useEcommerceTracking();
  const { user } = useUser();
  const hasDiscountValue = Number.parseFloat(discount) > 0;
  const shouldShowSavingsBadge = Boolean(savingsText) || hasDiscountValue;
  const visibleFeatures =
    typeof featureLimit === "number" ? features.slice(0, featureLimit) : features;
  const normalizedPrice = parsePrice(price);
  const billingCycle = formatBillingCycle(billingInterval, billingIntervalCount);
  const checkoutAction = stripePriceId ? `/api/checkout_session?price=${stripePriceId}` : "";

  const handlePlanClick = () => {
    const item = {
      item_id: planTitle,
      item_name: title,
      price: normalizedPrice,
      quantity: 1,
      item_brand: "CELPIP Practice Test",
      item_category: "Subscription",
    };

    selectItem([item], "plans_page", "Pricing Plans");

    beginCheckout([item], "CAD", normalizedPrice, undefined, {
      email: user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase(),
      address: {
        first_name: user?.firstName || "",
        last_name: user?.lastName || "",
      },
    });
  };

  return (
    <form
      className="relative h-full w-full screen1280:!max-w-[420px]"
      action={checkoutAction}
      method="POST"
    >
      <CheckoutAttributionFields />
      {highlightLabel && (
        <div className={`absolute left-1/2 top-0 z-[3] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-orange-500 via-amber-400 to-blue-500 font-semibold uppercase tracking-[0.08em] text-white shadow-lg ${
          compact ? "px-3 py-1 text-[10px]" : "px-4 py-1 text-[12px]"
        }`}>
          {highlightLabel}
        </div>
      )}
      <article
        aria-label={`Plan card for ${title} plan`}
        className={`relative z-[1] flex h-full flex-col before:absolute before:inset-0 before:transition-shadow before:duration-300 before:ease before:content-[''] before:transform before:translate-z-[-1px] ${
          compact
            ? "top-[6px] min-h-[255px] rounded-[18px] p-3 before:rounded-[18px]"
            : "top-[20px] min-h-[470px] rounded-[24px] p-[12px] before:rounded-[24px] screen1280:!p-[18px]"
        } ${
          highlight
            ? "border-2 border-amber-300 bg-[linear-gradient(180deg,_#FFF8E8_0%,_#FFFFFF_34%,_#F5F9FF_100%)] shadow-[0_18px_45px_rgba(117,156,255,0.18)] before:shadow-[0_18px_45px_rgba(247,157,101,0.18)]"
            : muted
              ? "border border-slate-200 bg-slate-50/80 before:shadow-none"
              : "bg-white hover:before:shadow-[6px_4px_16px_0px_#FC7A5066,_-6px_-4px_16px_0px_#4A7DFF66]"
        }`}
      >
        {!compact && (
          <div className="flex items-start justify-between gap-3">
            <div className={`flex shrink-0 items-center justify-center rounded-[16px] bg-white/80 shadow-sm ${
              compact ? "h-[34px] w-[34px]" : "h-[40px] w-[40px]"
            }`}>
              <div
                className={`flex items-center justify-center rounded-[24px] ${iconWrapperColor} ${
                  compact ? "h-[28px] w-[28px]" : "h-[32px] w-[32px]"
                }`}
              >
                {icon}
              </div>
            </div>
            <div className="flex flex-1 flex-wrap justify-end gap-2">
              {accessLabel && (
                <div className={`rounded-full border border-slate-200 bg-white font-semibold uppercase tracking-[0.08em] text-slate-700 ${
                  compact ? "px-2.5 py-1 text-[10px]" : "px-3 py-1 text-[11px]"
                }`}>
                  {accessLabel}
                </div>
              )}
              <div
                className={`flex items-center justify-center rounded-[16px] font-semibold ${
                  compact ? "h-[30px] px-3 text-[11px]" : "h-[35px] px-[16px] text-[12px]"
                } ${
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
        )}

        {currentPlanTitle === planTitle && (
          <div className="mt-4 rounded-[16px] bg-[#F0FFFD] px-4 py-2 text-[14px] font-medium text-[#0DAA94]">
            Your Current Plan
          </div>
        )}

        <div className={compact ? "mt-4" : "mt-5"}>
          {compact ? (
            <>
              <h3 className="text-[16px] font-semibold leading-tight text-text1">
                {accessLabel || title}
              </h3>
              {mockExamStatus === "notIncluded" && (
                <a
                  href="#compare-access"
                  className="mt-1 inline-flex text-[12px] font-medium text-slate-400 underline decoration-slate-300 underline-offset-2"
                >
                  Mock exams not included
                </a>
              )}
              {mockExamStatus === "included" && (
                <p className="mt-1 text-[12px] font-bold text-amber-600">
                  Mock exams included
                </p>
              )}
            </>
          ) : (
            <>
              <p className={`font-medium uppercase tracking-[0.08em] text-slate-500 ${
                compact ? "text-[11px]" : "text-[13px]"
              }`}>
                {planTitle}
              </p>
              <h3 className={`mt-2 font-semibold leading-tight text-text1 ${
                compact ? "text-[20px]" : "text-[24px] screen1280:!text-[28px]"
              }`}>
                {title}
              </h3>
              {description && (
                <p className={`mt-2 text-slate-600 ${compact ? "text-[13px] leading-5" : "text-[14px] leading-6"}`}>
                  {description}
                </p>
              )}
            </>
          )}
          {type != "Free" && shouldShowSavingsBadge && (
            <span
              className={`mt-3 flex w-fit items-center justify-center rounded-[16px] font-semibold ${
                compact ? "h-[30px] px-3 text-[12px]" : "h-[35px] px-[16px] text-[14px]"
              } ${
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

        <div className={`flex flex-col ${compact ? "mt-3 min-h-[56px] gap-1" : "mt-6 min-h-[48px] items-end gap-[10px]"}`}>
          {type != "Free" && (
            <>
              {oldPrice && (
                <span
                  className={`font-medium text-slate-400 line-through ${
                    compact ? "text-[13px]" : "text-[15px]"
                  }`}
                >
                  CA$ {formatPlanCadPrice(oldPrice)}
                </span>
              )}
            </>
          )}
          <span className={`font-bold text-black ${
            compact ? "text-[22px]" : "text-[22px] screen744:!text-[32px] screen1280:!text-[36px]"
          }`}>
            CA$ {formatPlanCadPrice(price)}
            {type != "Free" && billingCycle && (
              <span className="ml-1 text-sm font-medium text-slate-500">
                / {billingCycle}
              </span>
            )}
            {type == "Free" && (
              <span className="text-gray font-normal text-[20px]">
                {" "}
                (forever)
              </span>
            )}
          </span>
        </div>

        {!compact && footerNote && (
          <p className={`mt-2 font-medium text-slate-500 ${compact ? "text-[12px] leading-5" : "text-[13px]"}`}>
            {footerNote}
          </p>
        )}

        <button
          type="submit"
          onClick={handlePlanClick}
          aria-label={`Select ${title} plan`}
          disabled={!checkoutAction}
          className={`relative z-[2] hover:cursor-pointer shadow-startButton flex gap-[8px] w-full mw-full items-center justify-center rounded-[24px] ${
            compact ? "mt-4 h-[38px] px-[18px]" : "mt-[24px] h-[40px] px-[24px]"
          } ${
            highlight
              ? "bg-[linear-gradient(270deg,_#F79D65_0%,_#759CFF_100%)] hover:opacity-95"
              : muted
                ? "bg-slate-700 hover:bg-slate-800"
                : "bg-primary2 hover:!bg-[linear-gradient(270deg,_#F79D65_0%,_#759CFF_100%)]"
          } ${!checkoutAction ? "cursor-not-allowed opacity-60 hover:opacity-60" : ""}`}
        >
          <span className={`flex items-center justify-center text-white font-normal leading-[16px] ${
            compact ? "text-[13px]" : "text-[14px]"
          }`}>
            {buttonTitle}
          </span>
        </button>
        <ul className={`flex flex-1 flex-col ${compact ? "mt-3 gap-[6px]" : "mt-6 gap-[10px]"}`}>
          {visibleFeatures.map((item, index) => (
            <li className="flex items-start gap-[10px]" key={index}>
              <SvgCheck className="mt-0.5 text-[0DAA94]" />
              <span className={`text-text2 ${compact ? "text-[12px] leading-4" : "text-[14px] leading-6 screen1280:!text-[15px]"}`}>
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
