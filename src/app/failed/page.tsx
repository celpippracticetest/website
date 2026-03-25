"use client";

import ArrowBack from "@mui/icons-material/ArrowBack";
import SvgFailed from "@/components/icons/Failed";
import LoginModal from "@/components/modal/LoginModal";
import { useUser } from "@clerk/nextjs";
import { hasPaidPracticeAccess } from "@/lib/subscriptionAccess";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Success() {
  const { user, isLoaded, isSignedIn } = useUser();
  const freeUser = user?.publicMetadata.plan == "free";
  const noUser = isLoaded ? !isSignedIn : false;
  const proUser = hasPaidPracticeAccess(
    user?.publicMetadata?.plan as string | undefined,
    user?.publicMetadata?.purchaseDate
  );
  const [showLoginModal, setShowLoginModal] = useState(false);
  const router = useRouter();

  return (
    <main className="w-full flex flex-col  items-center   bg-[#F4F7FF] min-h-screen pt-[96px]">
      {noUser ? (
        showLoginModal && <LoginModal setShowLoginModal={setShowLoginModal} />
      ) : (
        <></>
      )}{" "}
      <div className="flex flex-col items-center justify-center   ">
        <div className="flex flex-col items-center gap-[24px]">
          <SvgFailed />
          <h1 className="text-[28px] font-medium text-[#212E42]">
            Payment Failed
          </h1>
        </div>

        <div className="mt-[40px] text-[20px] font-normal text-[#76808F]">
          Your payment wasn’t successful. Please try again.
        </div>

        <div className="flex gap-[8px]">
          <div
            onClick={() => router.push("/practice-overview")}
            className="flex cursor-pointer pl-[16px] pr-[24px] mt-[40px] gap-[8px] justify-center items-center bg-black h-[40px] rounded-[24px]"
          >
            <span>
              <ArrowBack className="text-white" />
            </span>
            <span className="text-[14px] text-white font-normal">
              Back to dashboard
            </span>
          </div>
          <div
            onClick={() => {
              if (freeUser || proUser) {
                router.push("/pricing");
                return;
              }
              if (noUser) {
                setShowLoginModal(true);
              }
            }}
            className="flex items-center cursor-pointer justify-center mt-[40px] font-normal bg-[#4A7DFF] text-white text-[14px] h-[40px] rounded-[24px] px-[24px] py-[12px]"
          >
            Try again
          </div>
        </div>
      </div>
    </main>
  );
}
