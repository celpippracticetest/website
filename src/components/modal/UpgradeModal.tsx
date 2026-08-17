"use client";

import React, { useEffect, useRef } from "react";
import { usePlans } from "@/hooks/usePlans";
import Image from "next/image";
import PlanCard from "../pages/dashboard/PlanCard";
import SvgClose from "../icons/Close";
import { trackKpi } from "@/lib/analytics";

const UpgradeModal = (params: any) => {
  const { setShowModal, triggerSource } = params;
  const { plans } = usePlans();

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    trackKpi.paywallView({
      triggerSource: triggerSource || "upgrade_modal",
      plansShown: plans.length,
    });
  }, [plans.length, triggerSource]);

  useEffect(() => {
    function handleClickOutside(event: any) {
      if (ref.current && !ref.current.contains(event.target)) {
        setShowModal(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const planCount = plans.length;
  // Modal was sized for 3 cards; scale width so N fixed-width cards stay inside.
  const modalMaxWidthClass =
    planCount >= 4
      ? "screen744:!max-w-[780px] screen1280:!max-w-[920px]"
      : "screen744:!max-w-[584px] screen1280:!max-w-[670px]";

  return (
    <div className="z-[999] fixed top-0 items-center left-0 px-[14px] screen744:!px-[16px] screen1280:!px-[20px] right-0 bottom-0 overflow-y-auto bg-[#17161680] flex justify-center">
      <div
        ref={ref}
        className={`flex-col mt-[80px] mb-[40px] relative w-full h-auto ${modalMaxWidthClass} pt-[20px] pb-[24px] px-[12px] screen744:!px-[16px] min-h-[474px] rounded-[24px] bg-[#F2F6FF] flex overflow-hidden bg-[linear-gradient(to_right,_#F4845F26,_#759CFF26)]`}
      >
        <div
          onClick={() => setShowModal(false)}
          className="absolute right-[20px] cursor-pointer"
        >
          <SvgClose />
        </div>
        <Image
          alt="plan sale modal"
          width={80}
          height={70}
          className={`asbolute mx-auto left-0 right-0 w-[80px] h-[70px]`}
          src="/images/plan-sale-modal.png"
        />
        <div className="flex w-full justify-center pt-[16px] text-[16px] screen744:!text-[20px] font-semibold">
          Summer Flash Sale!
        </div>
        <div className="flex w-full justify-center h-[48px] mt-[24px] text-[24px] screen744:!text-[38px] font-bold">
          Up to 80% Off All Plans!{" "}
        </div>
        <div className="flex w-full gap-[12px] flex-col-reverse screen744:!flex-row screen744:!justify-center screen744:!flex-wrap">
          {plans.map((item, index) => (
            <PlanCard
              key={item._id || index}
              id={index}
              title={item.title}
              type={item.type}
              oldPrice={item.oldPrice}
              price={item.price}
              buttonTitle={item.buttonTitle}
              icon={item.icon}
              iconWrapperColor={item.iconWrapperColor}
              stripePriceId={item.stripePriceId}
              stripeProductId={item.stripeProductId}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;
