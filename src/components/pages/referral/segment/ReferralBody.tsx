import dynamic from "next/dynamic";

const ArrowDown = dynamic(() => import("@/components/icons/ArrowDown"), {
  ssr: false,
});
const ArrowUp = dynamic(() => import("@/components/icons/ArrowUp"), {
  ssr: false,
});
import React, { useState } from "react";

const ReferralBody = () => {
  const [isVisible, setIsVisible] = useState<{ id: number; show: boolean }[]>([
    { id: 0, show: false },
    { id: 1, show: false },
    { id: 2, show: false },
  ]);

  const data = [
    {
      question: "Is the discount applied automatically?",
      answer:
        "Yes, just create your account using this link—no extra steps required.",
    },
    {
      question: "Can I use this discount later?",
      answer:
        "This offer is only valid on your first paid subscription and expires soon. Don’t miss it.",
    },
    {
      question: "What if I already have an account?",
      answer:
        "This discount is for new users only. You can still refer others and earn rewards!",
    },
  ];

  return (
    <div className="mt-[40px] mx-[16px] screen1280:!mx-[80px]  cursor-pointer">
      {data?.map((item, index: number) => (
        <div
          key={index}
          onClick={() =>
            setIsVisible((prev) =>
              prev.map((el) =>
                el.id === index ? { ...el, show: !el.show } : el
              )
            )
          }
          className="mt-[16px]"
        >
          <div
            className={`transition-all duration-500 ease-in-out overflow-hidden rounded-[16px] w-full bg-[#E8EFF2] screen744:!px-[16px] screen1280:!px-[40px] ${
              isVisible[index].show
                ? "h-[131px]"
                : "h-[56px] screen744:!h-[80px]"
            }`}
          >
            <div className="flex justify-between items-center px-[16px] screen744:!px-[40px] h-[56px] screen744:!h-[80px]">
              <div className="text-text1 text-[14px] screen744:!text-[20px] ">
                {item.question}
              </div>
              {isVisible[index].show ? <ArrowUp /> : <ArrowDown />}
            </div>
            <div className={`transition-opacity duration-500 ease-in-out `}>
              <div className="bg-[#E8EFF2] rounded-[16px] px-[16px] screen744:!px-[40px] text-[12px] screen744:!text-[18px]">
                {item.answer}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ReferralBody;
