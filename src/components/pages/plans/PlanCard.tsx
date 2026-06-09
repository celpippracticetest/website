"use client";
import type { ReactNode } from "react";
import { useMemo } from "react";
import CheckoutAttributionFields from "@/components/analytics/CheckoutAttributionFields";
import { useEcommerceTracking } from "@/hooks/useTracking";
import {
  formatBillingCycle,
  formatPlanCadPrice,
  parsePrice,
} from "@/lib/pricing";
import type { PlanBillingInterval } from "@/types/pricing";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import {
  getSignedCheckoutSessionBase,
  redirectToSignUpForCheckout,
} from "@/lib/checkoutRequireAuth";
import { StripeCheckoutDiscountBadge } from "@/components/checkout/StripeCheckoutDiscountBadge";
import { getStripeCheckoutAutoDiscountLabel } from "@/lib/stripeCheckoutDiscountLabel";

interface IPlanCard {
  title: string;
  type: string;
  oldPrice: string;
  price: string;
  discount: string;
  buttonTitle: string;
  features: string[];
  icon: ReactNode;
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
  /** First N feature lines render bold (e.g. Premium Plus mock-exam highlights on /pricing). */
  leadingBoldFeatureCount?: number;
  /** When false in compact mode, hide the in-card feature list (e.g. shared comparison table below). */
  showCompactFeatures?: boolean;
  billingInterval?: PlanBillingInterval;
  billingIntervalCount?: number;
  /** Hidden inputs appended to checkout POST (e.g. pricing A/B variant). */
  checkoutHiddenFields?: Record<string, string>;
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
  leadingBoldFeatureCount = 0,
  showCompactFeatures = true,
  billingInterval,
  billingIntervalCount,
  checkoutHiddenFields,
}: IPlanCard) => {
  const { selectItem, beginCheckout } = useEcommerceTracking();
  const { user, isSignedIn, isLoaded } = useHybridWebUser();
  const stripeCheckoutDiscountLabel = useMemo(
    () =>
      isSignedIn && type !== "Free"
        ? getStripeCheckoutAutoDiscountLabel({ userPublicMetadata: user?.publicMetadata })
        : null,
    [isSignedIn, type, user?.publicMetadata]
  );
  const hasDiscountValue = Number.parseFloat(discount) > 0;
  const shouldShowSavingsBadge = Boolean(savingsText) || hasDiscountValue;
  const visibleFeatures =
    typeof featureLimit === "number" ? features.slice(0, featureLimit) : features;
  const normalizedPrice = parsePrice(price);
  const billingCycle = formatBillingCycle(billingInterval, billingIntervalCount);
  const checkoutBase = getSignedCheckoutSessionBase(isLoaded, isSignedIn);
  const checkoutAction =
    stripePriceId && checkoutBase && typeof checkoutBase === "string"
      ? `${checkoutBase}?price=${encodeURIComponent(stripePriceId)}`
      : "";

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (!isLoaded) {
      event.preventDefault();
      return;
    }
    if (!isSignedIn) {
      event.preventDefault();
      redirectToSignUpForCheckout();
    }
  };

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
      className={`relative w-full screen1280:!max-w-[420px] ${
        compact ? "flex h-full min-h-0 flex-col" : ""
      } ${!compact ? "h-full" : ""}`}
      action={checkoutAction}
      method="POST"
      onSubmit={handleFormSubmit}
    >
      <CheckoutAttributionFields />
      {checkoutHiddenFields &&
        Object.entries(checkoutHiddenFields).map(([name, value]) =>
          value ? <input key={name} type="hidden" name={name} value={value} /> : null
        )}
      {highlightLabel && (
        <div className={`absolute left-1/2 top-0 z-[3] -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-orange-500 via-amber-400 to-blue-500 font-semibold uppercase tracking-[0.08em] text-white shadow-lg ${
          compact ? "px-3 py-1 text-[10px]" : "px-4 py-1 text-[12px]"
        }`}>
          {highlightLabel}
        </div>
      )}
      <article
        aria-label={`Plan card for ${title} plan`}
        className={`relative z-[1] flex flex-col before:absolute before:inset-0 before:transition-shadow before:duration-300 before:ease before:content-[''] before:transform before:translate-z-[-1px] ${
          compact
            ? "top-[6px] min-h-[220px] min-w-0 flex-1 rounded-[18px] p-2.5 before:rounded-[18px]"
            : "top-[20px] h-full min-h-[470px] rounded-[24px] p-[12px] before:rounded-[24px] screen1280:!p-[18px]"
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

        {compact ? (
          <>
            <div className="mt-2 shrink-0">
              <h3 className="text-[16px] font-semibold leading-tight text-text1">
                {accessLabel || title}
              </h3>
              {type != "Free" && shouldShowSavingsBadge && (
                <span
                  className={`mt-1 flex min-h-0 w-fit items-center justify-center rounded-[16px] px-2.5 py-1 text-[12px] font-semibold ${
                    highlight
                      ? "bg-gradient-to-r from-orange-500 to-amber-400 text-white shadow-md"
                      : muted
                        ? "border border-slate-200 bg-white text-slate-700"
                        : "bg-error2 text-white"
                  }`}
                >
                  {savingsText || `${discount}% OFF`}
                </span>
              )}
            </div>

            {showCompactFeatures && (
              <div className="mt-2 w-full shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50/40">
                <table className="w-full border-collapse text-left">
                  <tbody>
                    {visibleFeatures.map((item, index) => (
                      <tr
                        key={index}
                        className="border-b border-slate-200 bg-white last:border-b-0 odd:bg-white even:bg-slate-50/80"
                      >
                        <td className="px-2.5 py-1.5 align-top text-[12px] leading-snug text-text2">
                          <span
                            className={
                              index < leadingBoldFeatureCount ? "font-bold text-text1" : ""
                            }
                          >
                            {item}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="min-h-0 min-w-0 flex-1 basis-0" aria-hidden />

            <div className="flex shrink-0 flex-col gap-2 pt-0">
              <div className="flex min-h-0 flex-col justify-end gap-0.5">
                {type != "Free" && oldPrice && (
                  <span className="text-[13px] font-medium text-slate-400 line-through">
                    CA$ {formatPlanCadPrice(oldPrice)}
                  </span>
                )}
                <span className="text-[22px] font-bold text-black">
                  CA$ {formatPlanCadPrice(price)}
                  {type == "Free" && (
                    <span className="text-[20px] font-normal text-gray">
                      {" "}
                      (forever)
                    </span>
                  )}
                </span>
              </div>
              <button
                type="submit"
                onClick={handlePlanClick}
                aria-label={`Select ${title} plan`}
                disabled={!isLoaded || !stripePriceId}
                className={`relative z-[2] flex h-[38px] w-full shrink-0 items-center justify-center gap-[8px] rounded-[24px] px-[18px] shadow-startButton hover:cursor-pointer ${
                  highlight
                    ? "bg-[linear-gradient(270deg,_#F79D65_0%,_#759CFF_100%)] hover:opacity-95"
                    : muted
                      ? "bg-slate-700 hover:bg-slate-800"
                      : "bg-primary2 hover:!bg-[linear-gradient(270deg,_#F79D65_0%,_#759CFF_100%)]"
                } ${!isLoaded || !stripePriceId ? "cursor-not-allowed opacity-60 hover:opacity-60" : ""}`}
              >
                <StripeCheckoutDiscountBadge label={stripeCheckoutDiscountLabel} />
                <span className="flex items-center justify-center text-[13px] font-normal leading-[16px] text-white">
                  {buttonTitle}
                </span>
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mt-5">
              <p className="text-[13px] font-medium uppercase tracking-[0.08em] text-slate-500">
                {planTitle}
              </p>
              <h3 className="mt-2 text-[24px] font-semibold leading-tight text-text1 screen1280:!text-[28px]">
                {title}
              </h3>
              {description && (
                <p className="mt-2 text-[14px] leading-6 text-slate-600">
                  {description}
                </p>
              )}
              {type != "Free" && shouldShowSavingsBadge && (
                <span
                  className={`mt-3 flex h-[35px] w-fit items-center justify-center rounded-[16px] px-[16px] text-[14px] font-semibold ${
                    highlight
                      ? "bg-gradient-to-r from-orange-500 to-amber-400 text-white shadow-md"
                      : muted
                        ? "border border-slate-200 bg-white text-slate-700"
                        : "bg-error2 text-white"
                  }`}
                >
                  {savingsText || `${discount}% OFF`}
                </span>
              )}
            </div>

            <div className="mt-6 flex min-h-[48px] flex-col items-end gap-[10px]">
              {type != "Free" && (
                <>
                  {oldPrice && (
                    <span className="text-[15px] font-medium text-slate-400 line-through">
                      CA$ {formatPlanCadPrice(oldPrice)}
                    </span>
                  )}
                </>
              )}
              <span className="text-[22px] font-bold text-black screen744:!text-[32px] screen1280:!text-[36px]">
                CA$ {formatPlanCadPrice(price)}
                {type != "Free" && billingCycle && (
                  <span className="ml-1 text-sm font-medium text-slate-500">/ {billingCycle}</span>
                )}
                {type == "Free" && (
                  <span className="text-[20px] font-normal text-gray">
                    {" "}
                    (forever)
                  </span>
                )}
              </span>
            </div>

            {footerNote && (
              <p className="mt-2 text-[13px] font-medium text-slate-500">{footerNote}</p>
            )}

            <button
              type="submit"
              onClick={handlePlanClick}
              aria-label={`Select ${title} plan`}
              disabled={!isLoaded || !stripePriceId}
              className={`relative z-[2] mt-[24px] flex h-[40px] w-full items-center justify-center gap-[8px] rounded-[24px] px-[24px] shadow-startButton hover:cursor-pointer ${
                highlight
                  ? "bg-[linear-gradient(270deg,_#F79D65_0%,_#759CFF_100%)] hover:opacity-95"
                  : muted
                    ? "bg-slate-700 hover:bg-slate-800"
                    : "bg-primary2 hover:!bg-[linear-gradient(270deg,_#F79D65_0%,_#759CFF_100%)]"
              } ${!isLoaded || !stripePriceId ? "cursor-not-allowed opacity-60 hover:opacity-60" : ""}`}
            >
              <StripeCheckoutDiscountBadge label={stripeCheckoutDiscountLabel} />
              <span className="flex items-center justify-center text-[14px] font-normal leading-[16px] text-white">
                {buttonTitle}
              </span>
            </button>
            <ul className="mt-6 flex flex-1 list-none flex-col gap-[10px] p-0">
              {visibleFeatures.map((item, index) => (
                <li key={index}>
                  <span
                    className={`text-[14px] leading-6 text-text2 screen1280:!text-[15px] ${
                      index < leadingBoldFeatureCount ? "font-bold text-text1" : ""
                    }`}
                  >
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </article>
    </form>
  );
};

export default PlanCard;
