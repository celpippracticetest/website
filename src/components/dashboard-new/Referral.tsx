"use client";
import React from "react";
import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import SvgInfo from "../icons/Info";

function ReferralProgress({ earned }: { earned: number }) {
  const total = 100;
  const sections = 5;
  const sectionValue = total / sections;
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const baseOffset = circumference * 1.75;
  const strokeWidth = 20;
  const isFull = earned >= total;

  const getStrokeDasharray = (index: number) => {
    const earnedSections = Math.floor(earned / sectionValue);
    const partialEarned = earned % sectionValue;
    if (index < earnedSections) {
      return circumference / sections;
    } else if (index === earnedSections && partialEarned > 0) {
      return (circumference / sections) * (partialEarned / sectionValue);
    } else {
      return 0;
    }
  };

  return (
    <div className="flex justify-center items-center w-full h-[160px] max-w-[533px]">
      <svg width={160} height={160} viewBox="0 0 160 160">
        <circle
          cx="80"
          cy="80"
          r={radius}
          className="text-gray-300"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="none"
        />
        {isFull ? (
          <circle
            cx="80"
            cy="80"
            r={radius}
            strokeWidth={strokeWidth}
            stroke="rgb(34 197 94)"
            fill="none"
            strokeDasharray={`${circumference} 0`}
            strokeDashoffset={baseOffset}
          />
        ) : (
          [...Array(sections)].map((_, i) => {
            const dasharray = getStrokeDasharray(i);
            const dashoffset =
              baseOffset +
              (circumference / sections) * i +
              (circumference / sections - dasharray);
            return (
              <circle
                key={i}
                cx="80"
                cy="80"
                r={radius}
                strokeWidth={strokeWidth}
                stroke={dasharray > 0 ? "#0DAA94" : "rgb(209 213 219)"}
                fill="none"
                strokeDasharray={`${dasharray} ${circumference}`}
                strokeDashoffset={dashoffset}
                className="transition-colors duration-300"
              />
            );
          })
        )}
        <text
          x="80"
          y="70"
          textAnchor="middle"
          className="text-[#76808F] text-[12px] font-medium"
        >
          Total Earned
        </text>
        <text
          x="80"
          y="100"
          textAnchor="middle"
          className="text-gray-900 text-[24px] font-bold"
        >
          ${earned}
        </text>
      </svg>
    </div>
  );
}

export default function Referral() {
  const { user } = useUser();

  const router = useRouter();

  useEffect(() => {
    if (user === null) {
      router.push("/practice-overview");
    }
  }, [user]);

  if (!user) return null;

  const earned = 60;

  return (
    <div className="flex flex-col p-[16px] bg-[#F2F6FF] w-full">
      <div className="relative bg-white px-[24px] py-[40px]">
        <div className=" flex-wrap flex rounded-[16px] justify-between w-full h-[123px] bg-[#FDF4FF] px-[40px] py-[28px]">
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

        <div className="flex gap-[40px] mt-[32px] bg-white p-[24px] border border-[#D5D6D8] rounded-[16px]">
          <div className="flex max-w-[606px] flex-col w-full">
            <div className="px-[16px] flex rounded-[12px] gap-[16px] py-[18px] h-[60px] w-full bg-[linear-gradient(270deg,_#F79D65_0%,_#759CFF_100%)] ">
              <div className="flex gap-[16px] text-white w-full">
                <span>They get</span>
                <span>%20</span>
              </div>
              <div className="w-[1px] bg-[#E6E6E6]"></div>
              <div className="flex gap-[16px] text-white w-full">
                <span>You get</span>
                <span>%20</span>
              </div>
            </div>

            <div className="mt-[24px]">
              <span className="text-[14px] font-normal text-[#37465C]">
                Invitation link
              </span>
            </div>
            <div className="flex gap-[16px]  items-center mt-[16px]">
              <div className="px-[16px] h-[56px] w-full rounded-[12px] max-w-[420px]  border border-[#D5D6D8]"></div>
              <div className="flex h-[40px] max-w-[170px] rounded-[24px] items-center justify-center w-full bg-[#4A7DFF] text-white text-[14px] font-normal">
                <span>Share</span>
              </div>
            </div>

            <div className="mt-[24px]">
              <span className="text-[14px] font-normal text-[#37465C]">
                Send via email
              </span>
            </div>
            <div className="flex gap-[16px]  items-center mt-[16px]">
              <div className="px-[16px] h-[56px] w-full rounded-[12px] max-w-[420px]  border border-[#D5D6D8]"></div>
              <div className="flex h-[40px] max-w-[170px] rounded-[24px] items-center justify-center w-full bg-[#4A7DFF] text-white text-[14px] font-normal">
                <span>Send Invite</span>
              </div>
            </div>
          </div>

          <div className="w-[1px] bg-[#E6E6E6]"></div>

          <div className="flex flex-col items-center max-w-[533px] w-full justify-center">
            <ReferralProgress earned={earned} />
            <div className="mt-[26px] items-center flex gap-[24px]">
              <div className="flex items-center gap-[8px]">
                <div className="w-[16px] h-[16px] bg-[#0DAA94] rounded-full"></div>
                <span className="text-[14px] text-[#37465C]">
                  Successful purchase
                </span>
              </div>
              <SvgInfo />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
