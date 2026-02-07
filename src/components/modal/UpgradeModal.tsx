"use client";

import React, { useEffect, useRef } from "react";
import { usePlans } from "@/hooks/usePlans";
import Image from "next/image";
import PlanCard from "../pages/dashboard/PlanCard";
import SvgClose from "../icons/Close";
import { useModalTracking } from "@/hooks/useTracking";

const UpgradeModal = (params: any) => {
  const { setShowModal } = params;
  const { plans } = usePlans();
  const { viewed, closed } = useModalTracking();

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Track modal viewed on mount
    viewed("Upgrade Modal", "promotional");

    function handleClickOutside(event: any) {
      if (ref.current && !ref.current.contains(event.target)) {
        closed("Upgrade Modal", "dismissed");
        setShowModal(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [viewed, closed]);

  const handleClose = () => {
    closed("Upgrade Modal", "dismissed");
    setShowModal(false);
  };

  return (
    <div className="z-[999] fixed top-0 items-center left-0 px-[14px] screen744:!px-[16px] screen1280:!px-[20px] right-0 bottom-0 overflow-y-auto bg-[#17161680] flex justify-center">
      <div
        ref={ref}
        className="flex-col mt-[80px] mb-[40px] relative w-full h-auto   screen1280:!w-[670px] screen744:!w-[584px] pt-[20px]  pb-[24px]  min-h-[474px] rounded-[24px] bg-[#F2F6FF] flex bg-[linear-gradient(to_right,_#F4845F26,_#759CFF26)]"
      >
        <div
          onClick={handleClose}
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
        <div className="flex gap-[12px] flex-col-reverse screen744:!flex-row  ">
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
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;
