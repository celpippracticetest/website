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

type InfoBoxProps = {
  message: string;
  value: string | number;
};

const InfoBox: React.FC<InfoBoxProps> = ({ message, value }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="w-full rounded-[12px] justify-between flex-col  h-[96px] flex p-[16px] bg-[#F2F6FF]">
      <div className="flex justify-between w-full">
        <span className="text-[16px] text-[#37465C]">{message}</span>
        <div className="group relative">
          <button
            type="button"
            aria-label="Show info"
            onClick={() => setIsOpen((o) => !o)}
            className="cursor-pointer"
          >
            <SvgInfo />
          </button>
          <div
            className={`absolute ${
              message === "Reward Level"
                ? "-left-[310px] translate-x-0 w-[351px] screen744:-left-[120px] screen744:-translate-x-1/2 screen744:w-[351px]"
                : "-left-[135px] screen744:!left-1/2 -translate-x-1/2 w-[351px]"
            } top-[calc(100%+8px)] z-20 ${
              isOpen ? "block" : "hidden"
            } group-hover:block`}
          >
            <div className="relative">
              <div
                className={`${
                  message === "Reward Level"
                    ? "w-full screen744:w-[351px]"
                    : "w-[351px]"
                } rounded-[10px] bg-[#2F3C50] text-white text-[12px] leading-[18px] px-[12px] py-[8px] shadow-lg`}
              >
                {message === "Total Invitees" &&
                  "The number of users who have signed up using your referral link, regardless of whether they have completed a purchase."}
                {message === "Total Reward" &&
                  "The total confirmed reward amount you’ve earned from successful payments made by your invitees. Pending or refunded transactions are not included."}
                {message === "Reward Level" &&
                  "Your current referral tier, determined by the total number of successful purchases or total purchase value from your invitees. Higher levels may increase your reward percentage."}
              </div>
              <div className="absolute -top-[8px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-r-[8px] border-b-[8px] border-l-transparent border-r-transparent border-b-[#2F3C50]"></div>
            </div>
          </div>
        </div>
      </div>
      <div className="text-[#212E42] text-[18px]">{value}</div>
    </div>
  );
};

function isValidEmail(email: string) {
  // Basic email validation regex
  return /\S+@\S+\.\S+/.test(email);
}

function extractReferralCode(link: string): string {
  try {
    const url = new URL(link);
    const qp = url.searchParams;
    const byParam = qp.get("ref") || qp.get("code") || qp.get("referral");
    if (byParam) return byParam;
    const segments = url.pathname.split("/").filter(Boolean);
    return segments[segments.length - 1] || "";
  } catch {
    return "";
  }
}

export default function Referral() {
  const { user } = useUser();
  const router = useRouter();

  // All useState hooks must be at the top level
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [referralLink, setReferralLink] = useState<string>("");
  const [referralStats, setReferralStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [withdrawalLoading, setWithdrawalLoading] = useState(false);
  const [toast, setToast] = useState<null | {
    msg: string;
    kind: "success" | "error" | "info";
  }>(null);

  const showToast = (
    msg: string,
    kind: "success" | "error" | "info" = "info"
  ) => {
    setToast({ msg, kind });
    window.clearTimeout((showToast as any)._t);
    (showToast as any)._t = window.setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [linkRes, statsRes] = await Promise.all([
          fetch("/api/referrals", { cache: "no-store" }),
          fetch("/api/referrals/stats", { cache: "no-store" }),
        ]);

        if (linkRes.ok) {
          const linkData = await linkRes.json();
          setReferralLink(linkData?.link || "");
        } else if (linkRes.status === 500) {
          // If no referral code exists, try to create one
          console.log("🔄 No referral code found, creating one...");
          try {
            const createRes = await fetch("/api/users/create-referral-code", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
            });

            if (createRes.ok) {
              const createData = await createRes.json();
              setReferralLink(createData?.link || "");
              console.log("✅ Referral code created:", createData?.code);
            } else {
              console.error("❌ Failed to create referral code");
            }
          } catch (createError) {
            console.error("❌ Error creating referral code:", createError);
          }
        }

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setReferralStats(statsData.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (user === null) {
      router.push("/practice-overview");
    }
  }, [user]);

  if (!user) return null;

  const canEmail = isValidEmail(email) && !!referralLink;

  const handleCopy = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      showToast("Link copied", "success");
    } catch (e) {
      console.error(e);
      showToast("Failed to copy link", "error");
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share && referralLink) {
        await navigator.share({
          title: "Join me on CELPIP Practice Test",
          text: "Use my referral link to get a discount!",
          url: referralLink,
        });
        showToast("Share dialog opened", "success");
      } else if (referralLink) {
        await navigator.clipboard.writeText(referralLink);
        showToast("Link copied", "success");
      }
    } catch (e) {
      console.error(e);
      showToast("Could not share the link", "error");
    }
  };

  const handleSendInvite = async () => {
    if (!isValidEmail(email)) {
      showToast("Please enter a valid email address.", "error");
      return;
    }
    try {
      setIsSending(true);
      const res = await fetch("/api/referrals/send-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name:
            (user?.fullName as string) ||
            (user?.username as string) ||
            (user?.primaryEmailAddress as any)?.emailAddress ||
            "",
          personalMessage: "",
          inviteLink: referralLink,
          referralCode: extractReferralCode(referralLink),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({} as any));
        throw new Error(
          (data && (data as any).error) || "Failed to send email"
        );
      }
      showToast("Invite email sent successfully.", "success");
      setEmail("");
    } catch (err) {
      console.error(err);
      showToast("Couldn't send from server. Please try again later.", "error");
    } finally {
      setIsSending(false);
    }
  };

  const handleWithdrawalRequest = async () => {
    if (!withdrawalAmount || !paypalEmail) {
      showToast("Please fill in all fields.", "error");
      return;
    }

    const amount = parseFloat(withdrawalAmount);
    if (isNaN(amount) || amount < 5) {
      showToast("Minimum withdrawal amount is $5.", "error");
      return;
    }

    if (!referralStats?.canWithdraw) {
      showToast(
        "You need at least $5 in confirmed rewards to withdraw.",
        "error"
      );
      return;
    }

    try {
      setWithdrawalLoading(true);
      const res = await fetch("/api/referrals/withdrawal-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          paypalEmail,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({} as any));
        throw new Error(data?.error || "Failed to submit withdrawal request");
      }

      showToast("Withdrawal request submitted successfully!", "success");
      setShowWithdrawalModal(false);
      setWithdrawalAmount("");
      setPaypalEmail("");

      // Reload stats to reflect the pending withdrawal
      const statsRes = await fetch("/api/referrals/stats", {
        cache: "no-store",
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setReferralStats(statsData.data);
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to submit withdrawal request.", "error");
    } finally {
      setWithdrawalLoading(false);
    }
  };

  return (
    <div className="flex flex-col p-0 screen744:!p-[16px] bg-[#F2F6FF] w-full">
      <div className="relative bg-white px-[16px] screen744:!px-[24px] py-[40px]">
        <div className=" flex-wrap flex rounded-[16px] justify-between w-full h-[123px] bg-[#FDF4FF] px-[16px] screen744:!px-[40px] py-[14px] screen744:!py-[24px] screen1280:!py-[28px]">
          <div className="flex max-w-[184px]  screen744:!max-w-[338px] w-full screen1280:!max-w-full flex-col gap-[12px]">
            <span className="text-[#212E42] leading-[18px] text-[16px] screen744:!text-[22px] screen1280:!text-[29px] font-semibold">
              Refer your friend and get money
            </span>
            <span className="text-[11px] screen744:!text-[14px] leading-[18px] font-normal text-[#76808F]">
              Every time your friend makes a purchase, a reward will be credited
              to your account{" "}
            </span>
          </div>
          <Image
            alt="present"
            width={165}
            height={195}
            className={`hidden screen744:!flex absolute top-0 right-[40px] w-[165px] h-[195px]`}
            src="/images/present.png"
          />
          <Image
            alt="present"
            width={102}
            height={120}
            className={`absolute flex screen744:!hidden top-[38px] right-[40px] w-[102px] h-[120px]`}
            src="/images/present-mobile.png"
          />
        </div>

        <div className="flex flex-wrap justify-center screen1280:!flex-nowrap gap-[40px] mt-[32px] bg-white px-[16px] py-[24px] screen744:!p-[24px] border border-[#D5D6D8] rounded-[16px]">
          <div className="flex max-w-[606px] flex-col w-full">
            <div className="px-[16px] flex rounded-[12px] gap-[16px] py-[18px] h-[60px] w-full bg-[linear-gradient(270deg,_#F79D65_0%,_#759CFF_100%)] ">
              <div className="flex gap-[16px] text-white w-full items-center">
                <span className="text-[14px] screen744:!text-[16px]">
                  They get
                </span>
                <span className="text-[20px]">20%</span>
              </div>
              <div className="w-[1px] bg-[#E6E6E6]"></div>
              <div className="flex gap-[16px] text-[14px] screen744:!text-[16px] text-white w-full items-center">
                <span className="text-[14px] screen744:!text-[16px]">
                  You get
                </span>
                <span className="text-[20px]">20%</span>
              </div>
            </div>

            <div className="mt-[24px]">
              <span className="text-[14px] font-normal text-[#37465C]">
                Invitation link
              </span>
            </div>

            <div className="flex gap-[16px] flex-wrap screen744:!flex-nowrap  items-center mt-[16px]">
              <div className="relative px-[16px] h-[56px] w-full rounded-[12px] max-w-full screen744:!max-w-[420px]  border border-[#D5D6D8]">
                <input
                  type="text"
                  readOnly
                  value={referralLink || "Loading..."}
                  className="pr-[44px] outline-none bg-transparent text-[#212E42] placeholder:text-[#76808F] text-[14px] h-full w-full"
                  aria-label="Your referral link"
                />
                <div className="absolute right-[16px] top-[16px] group">
                  <button
                    type="button"
                    onClick={handleCopy}
                    aria-label="Copy referral link"
                    className={`cursor-pointer disabled:cursor-not-allowed disabled:opacity-60`}
                    disabled={!referralLink}
                  >
                    <SvgCopy />
                  </button>
                  <div className="absolute left-1/2 -translate-x-1/2 top-[calc(100%+8px)] z-20 hidden group-hover:block">
                    <div className="relative">
                      <div className="w-[351px] rounded-[10px] bg-[#2F3C50] text-white text-[12px] leading-[18px] px-[12px] py-[8px] shadow-lg">
                        Copy your unique referral link.
                      </div>
                      <div className="absolute -top-[8px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-r-[8px] border-b-[8px] border-l-transparent border-r-transparent border-b-[#2F3C50]"></div>
                    </div>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleShare}
                disabled={!referralLink}
                className="flex gap-[8px] h-[40px] max-w-full screen744:!max-w-[96px] screen1280:!max-w-[170px] rounded-[24px] items-center justify-center w-full bg-[#4A7DFF] text-white text-[14px] font-normal hover:opacity-90 active:opacity-80 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <SvgShare />
                <span>Share</span>
              </button>
            </div>

            <div className="mt-[24px]">
              <span className="text-[14px] font-normal text-[#37465C]">
                Send via email
              </span>
            </div>
            <div className="flex gap-[16px] flex-wrap screen744:!flex-nowrap   items-center mt-[16px]">
              <input
                type="email"
                className="px-[16px] h-[56px] w-full rounded-[12px] max-w-full screen744:!max-w-[420px] border border-[#D5D6D8]"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your friend's email"
              />
              <button
                type="button"
                onClick={handleSendInvite}
                disabled={isSending || !canEmail}
                className="flex h-[40px] max-w-full screen744:!max-w-[96px] screen1280:!max-w-[170px] rounded-[24px] items-center justify-center w-full bg-[#4A7DFF] text-white text-[14px] font-medium hover:opacity-90 active:opacity-80 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSending
                  ? "Sending..."
                  : !referralLink
                  ? "No Link"
                  : "Send Invite"}
              </button>
            </div>
          </div>

          <div className="h-[1px] w-full screen1280:!w-[1px] screen1280:!h-auto bg-[#E6E6E6]"></div>

          <div className="flex flex-col items-center max-w-[533px] w-full justify-center">
            <ReferralProgress earned={referralStats?.availableBalance || 0} />
            <ReferralSuccessfulPurchaseTooltip
              earned={referralStats?.availableBalance || 0}
            />
            <div
              onClick={() => {
                if (referralStats?.canWithdraw) {
                  setShowWithdrawalModal(true);
                } else {
                  showToast(
                    referralStats?.availableBalance >= 5
                      ? "You need at least $5 in confirmed rewards to withdraw."
                      : "Insufficient funds for withdrawal.",
                    "info"
                  );
                }
              }}
              className={`flex justify-center items-center mt-[24px] max-w-[188px] w-full h-[40px] border border-[#F27059] rounded-[24px] cursor-pointer transition-all group ${
                referralStats?.canWithdraw
                  ? "hover:!bg-[#F27059] hover:!text-white"
                  : " hover:!bg-[#F27059] hover:!text-white opacity-50 cursor-not-allowed"
              }`}
            >
              <span className="text-[14px] font-normal ] text-[#F27059] group-hover:!text-white">
                {referralStats?.canWithdraw
                  ? "Transfer to my PayPal"
                  : "Insufficient Funds"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-[12px] flex-wrap screen744:!flex-nowrap  mt-[32px]">
          <InfoBox
            message="Total Invitees"
            value={loading ? "..." : referralStats?.totalInvitees || 0}
          />
          <InfoBox
            message="Total Reward"
            value={
              loading
                ? "..."
                : `$${
                    referralStats?.totalConfirmedRewards?.toFixed(2) || "0.00"
                  }`
            }
          />
          <InfoBox
            message="Reward Level"
            value={loading ? "..." : referralStats?.rewardLevel || 1}
          />
        </div>
        <div className="flex flex-col rounded-[8px] mt-[32px] border border-[#E4E7EC]">
          <div className="h-[69px] py-[20px] px-[16px] screen744:!px-[24px]">
            <span className="text-[#101828] font-semibold text-[18px]">
              Transactions
            </span>
          </div>
          <div className="flex w-full border-t  border-[#E4E7EC] h-auto min-h-[44px] py-[13px] px-[16px] screen744:!px-[24px]">
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
          <div className="flex w-full border-t  border-[#E4E7EC] h-auto min-h-[44px] py-[13px] px-[16px] screen744:!px-[24px]">
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
      {toast && (
        <div
          role="alert"
          className={`fixed top-[16px] left-0 mx-auto ${
            toast.kind === "error" ? "max-w-[190px] " : "max-w-[105px] "
          }right-0 z-50 rounded-[10px] px-[14px] py-[10px] text-[14px] shadow-lg text-white ${
            toast.kind === "success"
              ? "bg-[#10B981]"
              : toast.kind === "error"
              ? "bg-[#EF4444]"
              : "bg-[#37465C]"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Withdrawal Modal */}
      {showWithdrawalModal && (
        <div className="fixed inset-0 bg-[#17161680] flex items-center justify-center z-[999]">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Withdrawal Request</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Available Balance: $
                {referralStats?.availableBalance?.toFixed(2) || "0.00"}
              </label>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (USD)
              </label>
              <input
                type="number"
                min="5"
                max={referralStats?.availableBalance || 0}
                step="0.01"
                value={withdrawalAmount}
                onChange={(e) => setWithdrawalAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter amount (min $5)"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PayPal Email
              </label>
              <input
                type="email"
                value={paypalEmail}
                onChange={(e) => setPaypalEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your PayPal email"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowWithdrawalModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={withdrawalLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleWithdrawalRequest}
                disabled={
                  withdrawalLoading ||
                  !withdrawalAmount ||
                  parseFloat(withdrawalAmount) < 5 ||
                  !paypalEmail
                }
                className="flex-1 px-4 cursor-pointer py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {withdrawalLoading ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Tooltip for "Successful purchase" row, with click-to-toggle
const ReferralSuccessfulPurchaseTooltip: React.FC<{ earned: number }> = ({
  earned,
}) => {
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);
  return (
    <div className=" group mt-[26px] items-center flex gap-[24px]">
      <div className="flex items-center gap-[8px]">
        <div className="w-[16px] h-[16px] bg-[#0DAA94] rounded-full"></div>
        <span className="text-[14px] text-[#37465C]">Successful purchase</span>
      </div>
      <div className="group relative">
        <button
          type="button"
          aria-label="Show info"
          onClick={() => setIsPurchaseOpen((o) => !o)}
          className="cursor-pointer"
        >
          <SvgInfo />
        </button>
        <div
          className={`absolute -left-[80px] screen744:!left-1/2 -translate-x-1/2 top-[calc(100%+8px)] z-20 ${
            isPurchaseOpen ? "block" : "hidden"
          } group-hover:block`}
        >
          <div className="relative">
            <div className="w-[351px] rounded-[10px] bg-[#2F3C50] text-white text-[12px] leading-[18px] px-[12px] py-[8px] shadow-lg">
              You earn {earned} of successful payments made through your
              referral link. If your reward isn’t visible yet, the referred
              account’s payment may still be pending.
            </div>
            <div className="absolute -top-[8px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-r-[8px] border-b-[8px] border-l-transparent border-r-transparent border-b-[#2F3C50]"></div>
          </div>
        </div>
      </div>
    </div>
  );
};
