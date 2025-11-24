"use client";

import { TExamSchemaDto } from "@/models/exam.model";
import { useSelectedExam } from "@/store/useSelectedExam.store";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "nextjs-toploader/app";
import { useEffect, useRef, useState } from "react";
import LoginModal from "../modal/LoginModal";
import SvgClose from "../icons/Close";
import Image from "next/image";
import PlanCard from "../pages/dashboard/PlanCard";
import { planDetails } from "../dashboard-new/Plans";

const ExamOverview = ({ exams }: { exams: TExamSchemaDto[] }) => {
  const router = useRouter();
  const { user, isLoaded, isSignedIn } = useUser();
  const freeUser = user?.publicMetadata.plan == "free";
  const noUser = isLoaded ? !isSignedIn : false;
  const [showLoginModal, setShowLoginModal] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const { setSelectedExam } = useSelectedExam();
  const UpgradeModal = () => {
    return (
      <div className="z-[999] fixed px-[14px] top-0 left-0 right-0 bottom-0 screen744:!px-[16px] screen1280:!px-[20px] overflow-y-auto bg-[#17161680] flex justify-center items-start">
        <div
          ref={ref}
          className="flex-col mt-[80px] mb-[40px] relative w-full h-auto   screen1280:!w-[670px] screen744:!w-[584px] pt-[20px]  pb-[24px]  min-h-[474px] rounded-[24px] bg-[#F2F6FF] flex bg-[linear-gradient(to_right,_#F4845F26,_#759CFF26)]"
        >
          <div
            onClick={() => setShowUpgradeModal(false)}
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
            {planDetails.map((item, index) => (
              <PlanCard
                key={index}
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

  useEffect(() => {
    function handleClickOutside(event: any) {
      if (ref.current && !ref.current.contains(event.target)) {
        setShowUpgradeModal(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [freeUser, noUser]);

  return (
    <main
      className={`w-full pt-[24px] mx-auto max-w-[1280px] px-[16px] screen744:!px-0`}
    >
      {freeUser ? (
        showUpgradeModal && <UpgradeModal />
      ) : noUser ? (
        showLoginModal && <LoginModal setShowLoginModal={setShowLoginModal} />
      ) : (
        <></>
      )}
      <div className="w-full  flex flex-col gap-4">
        <div className="flex flex-wrap w-full gap-[16px] pb-[10px]">
          {exams.map((exam: TExamSchemaDto, i: number) => {
            return (
              <div
                key={i}
                className="flex grow basis-0 min-w-[calc(50%-8px)] screen744:min-w-[calc(25%-12px)] max-w-full screen744:max-w-[calc(25%-12px)] rounded-[12px] h-[124px] bg-white overflow-hidden cursor-pointer items-center justify-center flex-col hover:shadow-md transition-shadow"
                onClick={() => {
                  if (freeUser) {
                    setShowUpgradeModal(true);
                    return;
                  } else if (noUser) {
                    setShowLoginModal(true);
                    return;
                  }
                  setSelectedExam(exam.name);
                  router.push(`/exams/exam_${exam.id}/part1`);
                }}
              >
                <div className="flex items-center gap-[16px] justify-center flex-col            ">
                  <p className=" text-[#37465C]  font-medium text-center w-full">
                    {exam.name}
                  </p>
                  <div className="w-[112px] text-[14px] font-[14px] hover:!bg-[#4A7DFF] hover:!text-white flex items-center justify-center text-[#76808F] h-[40px] bg-[#F3F2F2] rounded-[24px]">
                    Take Test
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
};

export default ExamOverview;
