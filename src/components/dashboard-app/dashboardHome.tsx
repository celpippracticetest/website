"use client";

import React from "react";
import SvgSuccess from "../icons/Success";
import ArrowLeft from "../icons/ArrowLeft";
import { useRouter } from "next/navigation";

const DashboardHome = ({
  session,
  email,
}: {
  session: any;
  email: string | undefined | null;
}) => {
  const router = useRouter();
  if (!session) {
    return <div>Loading...</div>;
  }

  return (
    <main className="w-full flex flex-col  items-center   bg-[#F4F7FF] min-h-screen pt-[96px]">
      <div className="flex flex-col max-w-[456px] w-full items-center justify-center   ">
        <div className="flex flex-col items-center gap-[24px]">
          <SvgSuccess />
          <h1 className="text-[28px] font-medium text-[#212E42]">
            Payment Successful
          </h1>
        </div>
        <div className="flex flex-col w-full max-w-[456px] gap-[24px] mt-[40px] px-[16px]">
          <div className="flex items-center justify-between">
            <span className="text-[20px] text-[#76808F] font-normal">
              Payment type
            </span>
            <span className="text-[22px] font-normal text-[#212E42]">
              {session?.payment_method_types?.[0] ?? "-"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[20px] text-[#76808F] font-normal">
              Mobile
            </span>
            <span className="text-[22px] font-normal text-[#212E42]">
              {session?.customer_details?.phone ?? "-"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[20px] text-[#76808F] font-normal">
              Email
            </span>
            <span className="text-[22px] font-normal text-[#212E42]">
              {session?.customer_email ?? "-"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[20px] text-[#76808F] font-normal">
              Amount paid
            </span>
            <span className="text-[22px] font-normal text-[#212E42]">
              {((session?.amount_total ?? 0) / 100).toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[20px] text-[#76808F] font-normal">
              Transaction id
            </span>
            <span className="text-[22px] font-normal text-[#212E42]">
              {session?.invoice ?? "-"}
            </span>
          </div>
        </div>
        <div
          onClick={() => router.push("/practice-overview")}
          className="flex cursor-pointer pl-[16px] pr-[24px] mt-[40px] gap-[8px] justify-center items-center bg-[#4A7DFF] h-[40px] rounded-[24px]"
        >
          <span>
            <ArrowLeft className="text-white" />
          </span>
          <span className="text-[14px] text-white font-normal">
            Back to dashboard
          </span>
        </div>
      </div>
    </main>
  );
};

export default DashboardHome;
