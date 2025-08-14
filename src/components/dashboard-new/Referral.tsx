"use client";
import React, { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import SvgInfo from "../icons/Info";
import SvgCopy from "../icons/Copy";
import SvgShare from "../icons/Share";

const ReferralProgress = ({ earned }: { earned: number }) => {
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
};

const generateInfoBox = (message: string, value: number) => {
  return (
    <div className="w-full rounded-[12px] justify-between flex-col  h-[96px] flex p-[16px] bg-[#F2F6FF]">
      <div className="flex justify-between w-full">
        <span className="text-[16px] text-[#37465C]">{message}</span>
        <SvgInfo />
      </div>
      <div className="text-[#212E42] text-[18px]">{value}</div>
    </div>
  );
};

function isValidEmail(email: string) {
  // Basic email validation regex
  return /\S+@\S+\.\S+/.test(email);
}

export default function Referral() {
  const { user } = useUser();

  const router = useRouter();

  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (user === null) {
      router.push("/practice-overview");
    }
  }, [user]);

  if (!user) return null;

  const earned = 60;

  const referralLink = "https://example.com/referral"; // Assuming a referral link

  const handleSendInvite = async () => {
    if (!isValidEmail(email)) {
      alert("Please enter a valid email address.");
      return;
    }
    try {
      setIsSending(true);
      const res = await fetch("/api/referrals/send-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: email, link: referralLink }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data && data.error) || "Failed to send email");
      }
      alert("Invite email sent successfully.");
      setEmail("");
    } catch (err) {
      console.error(err);
      alert("Couldn't send from server. Please try again later.");
    } finally {
      setIsSending(false);
    }
  };

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
              <div className="relative px-[16px] h-[56px] w-full rounded-[12px] max-w-[420px]  border border-[#D5D6D8]">
                <div className="absolute right-[16px] top-[16px] group">
                  <SvgCopy />
                  {/* Tooltip */}
                  <div className="absolute left-1/2 -translate-x-1/2 top-[calc(100%+8px)] z-20 hidden group-hover:block">
                    <div className="relative">
                      <div className="w-full max-w-[351px] rounded-[10px] bg-[#2F3C50] text-white text-[12px] leading-[18px] px-[12px] py-[8px] shadow-lg">
                        You earn 20% of successful payments made through your
                        referral link. If your reward isn’t visible yet, the
                        referred account’s payment may still be pending.
                      </div>
                      {/* Upward arrow */}
                      <div className="absolute -top-[8px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-r-[8px] border-b-[8px] border-l-transparent border-r-transparent border-b-[#2F3C50]"></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-[8px] h-[40px] max-w-[170px] rounded-[24px] items-center justify-center w-full bg-[#4A7DFF] text-white text-[14px] font-normal">
                <SvgShare />
                <span>Share</span>
              </div>
            </div>

            <div className="mt-[24px]">
              <span className="text-[14px] font-normal text-[#37465C]">
                Send via email
              </span>
            </div>
            <div className="flex gap-[16px]  items-center mt-[16px]">
              <input
                type="email"
                className="px-[16px] h-[56px] w-full rounded-[12px] max-w-[420px] border border-[#D5D6D8]"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your friend's email"
              />
              <button
                type="button"
                onClick={handleSendInvite}
                disabled={isSending}
                className="flex h-[40px] max-w-[170px] rounded-[24px] items-center justify-center w-full bg-[#4A7DFF] text-white text-[14px] font-medium hover:opacity-90 active:opacity-80 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSending ? "Sending..." : "Send Invite"}
              </button>
            </div>
          </div>

          <div className="w-[1px] bg-[#E6E6E6]"></div>

          <div className="flex flex-col items-center max-w-[533px] w-full justify-center">
            <ReferralProgress earned={earned} />
            <div className=" group mt-[26px] items-center flex gap-[24px]">
              <div className="flex items-center gap-[8px]">
                <div className="w-[16px] h-[16px] bg-[#0DAA94] rounded-full"></div>
                <span className="text-[14px] text-[#37465C]">
                  Successful purchase
                </span>
              </div>
              <div className="group relative">
                <SvgInfo />
                <div className="absolute w left-1/2 -translate-x-1/2 top-[calc(100%+8px)] z-20 hidden group-hover:block">
                  <div className="relative">
                    <div className="w-[351px] rounded-[10px] bg-[#2F3C50] text-white text-[12px] leading-[18px] px-[12px] py-[8px] shadow-lg">
                      You earn {earned} of successful payments made through your
                      referral link. If your reward isn’t visible yet, the
                      referred account’s payment may still be pending.
                    </div>
                    <div className="absolute -top-[8px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-r-[8px] border-b-[8px] border-l-transparent border-r-transparent border-b-[#2F3C50]"></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-center items-center mt-[24px] max-w-[188px] w-full h-[40px] border border-[#F27059] rounded-[24px]">
              <span className="text-[14px] font-normal text-[#F27059]">
                Transfer to my paypal
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-[12px]  mt-[32px]">
          {generateInfoBox("Total Invitees", 10)}
          {generateInfoBox("Total Invitees", 10)}
          {generateInfoBox("Total Invitees", 10)}
        </div>
        <div className="flex flex-col rounded-[8px] mt-[32px] border border-[#E4E7EC]">
          <div className="h-[69px] py-[20px] px-[24px]">
            <span className="text-[#101828] font-semibold text-[18px]">
              Transactions
            </span>
          </div>
          <div className="flex w-full border-t  border-[#E4E7EC] h-[44px] py-[13px] px-[24px]">
            <span className=" w-full  text-[#37465C] font-medium text-[12px]">
              Date
            </span>
            <span className="  w-full  text-[#37465C] font-medium text-[12px]">
              Description
            </span>
            <span className="  w-full  text-[#37465C] font-medium text-[12px]">
              Amount
            </span>
          </div>
          <div className="flex w-full border-t  border-[#E4E7EC] h-[44px] py-[13px] px-[24px]">
            <span className=" w-full  text-[#37465C] font-medium text-[12px]">
              Aug 4, 2025
            </span>
            <span className="  w-full  text-[#37465C] font-medium text-[12px]">
              Translate to paypal{" "}
            </span>
            <span className="  w-full  text-[#37465C] font-medium text-[12px]">
              $ 125{" "}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
