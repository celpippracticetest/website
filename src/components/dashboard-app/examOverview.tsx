"use client";

import { TExamSchemaDto } from "@/models/exam.model";
import { useSelectedExam } from "@/store/useSelectedExam.store";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "nextjs-toploader/app";
import { useEffect, useRef, useState } from "react";
import LoginModal from "../modal/LoginModal";
import UpgradeModal from "../modal/UpgradeModal";
import SvgClose from "../icons/Close";
import Image from "next/image";
import PlanCard from "../pages/dashboard/PlanCard";

const ExamOverview = ({ exams }: { exams: TExamSchemaDto[] }) => {
  const router = useRouter();
  const { user, isLoaded, isSignedIn } = useUser();
  const freeUser = user?.publicMetadata.plan == "free";
  const noUser = isLoaded ? !isSignedIn : false;
  const [showLoginModal, setShowLoginModal] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const { setSelectedExam } = useSelectedExam();
  // Inline UpgradeModal removed


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
        showUpgradeModal && <UpgradeModal setShowModal={setShowUpgradeModal} />
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
                  <div className="w-[112px] text-[14px] font-[14px] hover:!bg-[#4A7DFF] hover:!text-white flex items-center justify-center text-[#76808F] h-[40px] bg-[#F3F2F2] rounded-[24px] transition-colors">
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
