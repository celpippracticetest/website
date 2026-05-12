import React, { useMemo, useRef, useState } from "react";
import CheckoutAttributionFields from "@/components/analytics/CheckoutAttributionFields";
import SvgCheck from "../../icons/Check";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import LoginModal from "@/components/modal/LoginModal";
import { useEcommerceTracking } from "@/hooks/useTracking";
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
  icon: React.ReactNode;
  iconWrapperColor: string;
  id: number;
  className?: string;
  isModal?: boolean;
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
  className,
  isModal = false,
  stripePriceId,
}: IPlanCard) => {
  const { user, isLoaded, isSignedIn } = useHybridWebUser();
  const { beginCheckout, selectItem } = useEcommerceTracking();
  const noUser = isLoaded ? !isSignedIn : false;
  const stripeCheckoutDiscountLabel = useMemo(
    () =>
      isSignedIn && type !== "Free"
        ? getStripeCheckoutAutoDiscountLabel({ userPublicMetadata: user?.publicMetadata })
        : null,
    [isSignedIn, type, user?.publicMetadata]
  );
  const [showLoginModal, setShowLoginModal] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

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

    selectItem([item], "landing_pricing", "Landing Pricing Plans");
    beginCheckout(
      [item],
      "CAD",
      amount,
      undefined,
      {
        email: user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase(),
        address: {
          first_name: user?.firstName || "",
          last_name: user?.lastName || "",
        },
      }
    );
  };

  const checkoutAction = stripePriceId
    ? `/api/checkout_session?price=${stripePriceId}`
    : "";

  return (
    <form
      className={`relative  before:absolute before:rounded-[24px] hover:before:shadow-[6px_4px_16px_0px_#FC7A5066,_-6px_-4px_16px_0px_#4A7DFF66] before:transition-shadow before:duration-300 flex-col ${!isModal ? "screen1280:!flex-row screen1280:!w-[437px] screen1280:!h-[428px]" : ""} before:ease before:content-[''] before:inset-0 before:transform before:translate-z-[-1px] hover:cursor-pointer w-full h-[438px] rounded-[24px] p-[16px] bg-white ${className}`}
      ref={formRef}
      action={checkoutAction}
      method="POST"
    >
      <CheckoutAttributionFields />
      <article aria-label={`Plan card for ${title} plan`} className="">
        {noUser && showLoginModal && (
          <LoginModal setShowLoginModal={setShowLoginModal} />
        )}
        <div className={`flex gap-[16px] justify-between ${!isModal ? "screen1280:!justify-start" : ""}`}>
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
          className={`flex mt-[24px] flex-col-reverse ${!isModal ? "screen1280:!flex-row" : ""} ${type === "Free"
              ? `justify-end ${!isModal ? "screen1280:!justify-start" : ""} h-[22px]`
              : `${!isModal ? "screen1280:!justify-between screen1280:!h-fit" : ""} h-[69px]`
            } `}
        >
          <h3
            className={`${type === "Free" ? "h-[29px]" : "h-[35px]"
              } flex items-center mt-[12px] ${!isModal ? "screen1280:!mt-0 screen1280:!text-[24px]" : ""} text-[18px] font-medium text-text1`}
          >
            {title}
          </h3>
          {type != "Free" && (
            <>
              {discount && (
                <span className={`px-[24px] shrink-0  font-semibold w-fit ${!isModal ? "screen1280:!mt-0" : ""} text-[16px] text-white flex items-center justify-center bg-error2 h-[35px] rounded-[16px]`}>
                  {discount}% OFF
                </span>
              )}
            </>
          )}
        </div>
        <div className={`flex gap-[10px] items-center mt-[24px] h-[34px] ${!isModal ? "screen1280:!h-[48px]" : ""}`}>
          {type != "Free" && (
            <>
              {oldPrice && (
                <>
                  <span className="relative text-text3 text-[18px] font-medium">
                    $ {oldPrice}
                    <span
                      className={`${id == 1
                          ? `-left-2 ${!isModal ? "screen1280:!left-[12px] screen1280:!w-[60px]" : ""} w-[86px]`
                          : `-left-2 ${!isModal ? "screen1280:!left-[12px] screen1280:!w-[60px]" : ""} w-[86px]`
                        } absolute ${!isModal ? "screen1280:!flex" : ""} top-[14px] w-[60px] h-[2px] bg-error1 -translate-y-1/2`}
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
              handleCheckoutTracking();
              formRef.current?.submit();
            }
          }}
          disabled={!noUser && !checkoutAction}
          className={`relative z-[2] mt-[24px] shadow-startButton flex gap-[8px] px-[24px] w-full mw-full h-[40px] rounded-[24px] items-center justify-center ${
            noUser || checkoutAction
              ? "bg-primary2 hover:cursor-pointer hover:!bg-[linear-gradient(270deg,_#F79D65_0%,_#759CFF_100%)]"
              : "cursor-not-allowed bg-slate-400 opacity-60"
          }`}
        >
          <StripeCheckoutDiscountBadge label={stripeCheckoutDiscountLabel} />
          <span className="text-white text-[14px] font-normal leading-[16px] flex items-center justify-center">
            {buttonTitle}
          </span>
        </button>
        <ul className="flex flex-col gap-[12px] mt-[24px]">
          {features.map((item, index) => (
            <li className="flex gap-[8px] items-center" key={index}>
              <SvgCheck className="text-[0DAA94]" />
              <span className={`text-text2 font-normal text-[14px] ${!isModal ? "screen1280:!text-[16px]" : ""} leading-[16px]`}>
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
