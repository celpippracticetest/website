"use client";

import ArrowLeft from "@/components/icons/ArrowLeft";
import SvgFailed from "@/components/icons/Failed";
import LoginModal from "@/components/modal/LoginModal";
import UpgradeModal from "@/components/modal/UpgradeModal";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import { trackKpi } from "@/lib/analytics";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function Success() {
  const { user, isLoaded, isSignedIn } = useHybridWebUser();
  const freeUser = user?.publicMetadata.plan == "free";
  const noUser = isLoaded ? !isSignedIn : false;
  const proUser = user?.publicMetadata.plan == "premium";
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    trackKpi.checkoutError({
      errorType: "payment_failed_page",
      step: "stripe_return",
    });
    trackKpi.paymentFailed({
      errorCode: "stripe_checkout_return",
      declineReason: "payment_failed_page",
      paymentType: "checkout",
      attemptNumber: 1,
    });
  }, []);

  return (
    <main className="w-full flex flex-col  items-center   bg-[#F4F7FF] min-h-screen pt-[96px]">
      {freeUser || proUser ? (
        showModal && <UpgradeModal setShowModal={setShowModal} />
      ) : noUser ? (
        showLoginModal && <LoginModal setShowLoginModal={setShowLoginModal} />
      ) : (
        <></>
      )}{" "}
      <div className="flex flex-col items-center justify-center   ">
        <div className="flex flex-col items-center gap-[24px]">
          <SvgFailed />
          <span className="text-[28px] font-medium text-[#212E42]">
            Payment Failed
          </span>
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
              <ArrowLeft className="text-white" />
            </span>
            <span className="text-[14px] text-white font-normal">
              Back to dashboard
            </span>
          </div>
          <Link
            href="/pricing"
            className="flex items-center justify-center mt-[40px] font-normal bg-[#4A7DFF] text-white text-[14px] h-[40px] rounded-[24px] px-[24px] py-[12px]"
          >
            Try again
          </Link>
        </div>
      </div>
    </main>
  );
}
