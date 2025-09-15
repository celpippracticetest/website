import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useExtraDiscountStore } from "@/store/useExtraDiscount.store";
import SvgCopy from "../icons/Copy";
import { useUser } from "@clerk/nextjs";
import Close from "../icons/Close";

const ExtraDiscountModal = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { user } = useUser();
  const userCreatedAt = user?.createdAt;
  const { setShowExtraDiscount, couponId, setVisibleHorizontalCoupon } =
    useExtraDiscountStore((state) => state);

  const [timeLeft, setTimeLeft] = useState("00:00:00");
  const [copied, setCopied] = useState(false);

  const [isVisible, setIsVisible] = useState(false);
  const isNewUser =
    user?.createdAt &&
    new Date().getTime() - new Date(user.createdAt).getTime() <
      24 * 60 * 60 * 1000;
  const freeUser = user?.publicMetadata.plan == "free";

  useEffect(() => {
    const hasClosedModal =
      localStorage.getItem("hasClosedExtraDiscountModal") === "true";

    if (!hasClosedModal && freeUser && isNewUser) {
      setIsVisible(true);
    }
  }, [user]);

  useEffect(() => {
    if (!userCreatedAt) return;

    const expiry = new Date(userCreatedAt).getTime() + 24 * 60 * 60 * 1000;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = expiry - now;

      if (distance <= 0) {
        setVisibleHorizontalCoupon(false);
        setTimeLeft("00:00:00");
        clearInterval(interval);
      } else {
        const hours = String(
          Math.floor((distance / (1000 * 60 * 60)) % 24)
        ).padStart(2, "0");
        const minutes = String(
          Math.floor((distance / (1000 * 60)) % 60)
        ).padStart(2, "0");
        const seconds = String(Math.floor((distance / 1000) % 60)).padStart(
          2,
          "0"
        );

        setTimeLeft(`${hours}:${minutes}:${seconds}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [userCreatedAt]);

  if (!isVisible) return null;

  return (
    <div className="z-[9999] px-[16px] fixed top-0 left-0 right-0 mx-auto w-full h-full bg-[#17161680] flex justify-center items-center">
      <div
        ref={ref}
        className="flex-col items-center relative w-full max-w-[343px] screen744:!max-w-[584px]  screen1280:!max-w-[680px] z-[999999999] pt-[20px] px-[16px] screen744:!px-[24px] pb-[24px] h-[375px] screen744:!h-[394px] rounded-[24px] bg-[#F2F6FF] flex bg-[linear-gradient(to_right,_#F4845F26,_#759CFF26)]"
      >
        <div
          onClick={() => {
            setShowExtraDiscount(false);
            localStorage.setItem("hasClosedExtraDiscountModal", "true");
            setVisibleHorizontalCoupon(true);
            setIsVisible(false);
          }}
          className="absolute cursor-pointer right-[20px]"
        >
          <Close />
        </div>
        <Image
          alt="plan sale modal"
          width={80}
          height={70}
          className={`asbolute mx-auto left-0 right-0 w-[80px] h-[70px]`}
          src="/images/plan-sale-modal.png"
        />
        <div className="flex w-full h-auto min-h-[20px] text-[#37465C] justify-center pt-[18px] text-[16px] font-medium">
          Welcome Gift Just for You!
        </div>
        <div className="flex text-[#212E42] h-auto min-h-[48px] w-full justify-center mt-[24px] text-[28px] screen744:!text-[38px] font-bold">
          Extra 10% Discount
        </div>
        <div className="flex min-h-[23px] h-auto w-full text-[#37465C] justify-center  mt-[20px] text-[16px] screen744:!text-[18px] font-normal">
          For new users-use the code at checkout{" "}
        </div>
        <div className="minx-h-[23px] h-auto flex w-full gap-[8px] justify-center items-center  mt-[20px] ">
          <span className="text-[16px] screen744:!text-[18px] font-semibold text-[#37465C]">
            Expires in
          </span>{" "}
          <span className="text-[#EE4266] text-[20px] screen744:!text-[26px] font-bold">
            {timeLeft}
          </span>
        </div>
        <div className="rounded-[12px] max-w-[358px] w-full flex gap-[16px] px-[24px] py-[12px] bg-[#FFEBD6]  justify-center items-center  mt-[24px] ">
          <span className="text-[#F27059] text-[18px] font-semibold">
            {
              <span className="text-[#F27059] text-[18px] font-semibold">
                {couponId}
              </span>
            }
          </span>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard
                .writeText(couponId?.toString() ?? "")
                .then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                });
            }}
            className="flex-1 cursor-pointer flex px-[20px] py-[8px] h-[28px] rounded-[8px] bg-white items-center justify-center gap-[8px]"
          >
            <SvgCopy />
            <span className="text-[#37465C] text-[12px] font-semibold">
              Copy
            </span>
          </button>
        </div>
        {copied && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-[#37465C] text-white px-4 py-2 rounded-[8px] text-[14px] shadow-lg z-[9999] transition-opacity duration-300">
            Copied to clipboard!
          </div>
        )}
      </div>
    </div>
  );
};

export default ExtraDiscountModal;
