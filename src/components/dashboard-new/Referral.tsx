"use client";
import React from "react";
import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function Referral() {
  const { user } = useUser();

  const router = useRouter();

  useEffect(() => {
    if (user === null) {
      router.push("/practice-overview");
    }
  }, [user]);

  if (!user) return null;

  return (
    <div className="flex flex-col p-[16px] bg-[#F2F6FF] w-full">
      <div className="relative bg-white px-[24px] py-[40px]">
        <div className=" flex rounded-[16px] justify-between w-full h-[123px] bg-[#FDF4FF] px-[40px] py-[28px]">
          <div className="flex flex-col gap-[12px]">
            <span className="text-[#212E42] text-[29px] font-semibold">
              Refer your friend and get money
            </span>
            <span className="text-[14px] font-normal text-[#76808F]">
              Refer your friend and get money
            </span>
          </div>
          <Image
            alt="present"
            width={165}
            height={195}
            className={`absolute top-0 right-[40px] w-[165px] h-[195px]`}
            src="/images/present.png"
          />
        </div>
      </div>
    </div>
  );
}
