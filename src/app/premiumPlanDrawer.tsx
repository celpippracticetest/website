"use client";
import { SignInButton, SignUpButton, useUser } from "@clerk/nextjs";
import CheckoutAttributionFields from "@/components/analytics/CheckoutAttributionFields";
import "./globals.css";
import useStore from "@/store";
import {
  ArrowRight,
  Check,
  CircleDollarSign,
  Copy,
  KeyRound,
  LockOpen,
  ShieldCheck,
} from "lucide-react";
import Image from "next/image";
import { Drawer } from "vaul";
import { useEffect, useState } from "react";
import { useEcommerceTracking } from "@/hooks/useTracking";

type AvailableStripePlan = {
  id: string;
  name: string;
  priceId: string;
  amount: number;
  currency: string;
  interval?: string;
  intervalCount?: number;
  metadata?: Record<string, string>;
};

function getAvailablePlanPriceId(
  plans: AvailableStripePlan[],
  interval: string,
  intervalCount = 1
) {
  return (
    plans.find(
      (plan) => plan.interval === interval && (plan.intervalCount ?? 1) === intervalCount
    )?.priceId || ""
  );
}

const PlanForGuesVisitor = () => {
  return (
    <div className="mx-auto w-full max-w-sm p-4">
      <div className="gap-1.5 p-4 text-center sm:text-left mb-4 justify-center flex flex-col items-center">
        <KeyRound
          className="w-10 h-10 mb-4 text-gray-400"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          stroke="currentColor"
        ></KeyRound>

        <h2
          id="radix-:r5f:"
          className="tracking-tight text-center font-extrabold text-2xl"
        >
          Login to View Pro Plans
        </h2>
        <p
          id="radix-:r5g:"
          className="text-[14px] text-muted-foreground text-center"
        >
          You need to log in to see the best plan for your CELPIP success.
        </p>
      </div>
      <div className="flex flex-col justify-center w-full mb-4 gap-4 items-center">
        <SignUpButton>
          <button className="inline-flex items-center justify-center whitespace-nowrap ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 main-btn transition-all rounded-xl px-4 w-full font-semibold text-[14px] h-fit py-3 bg-[#3ebbf3] hover:bg-[#3ebbf3]/70 border-gray-400 text-white cursor-pointer">
            Create a Free Account
          </button>
        </SignUpButton>
        <div className="text-[14px] text-slate-800">
          Already have an account?{" "}
          <SignInButton>
            <button className="text-blue-600  cursor-pointer">Sign in</button>
          </SignInButton>
        </div>
      </div>
    </div>
  );
};

const PlansForUsers = (
  time: number,
  showCopied: boolean,
  setShowCopied: React.Dispatch<React.SetStateAction<boolean>>,
  onCheckoutIntent: (
    itemId: string,
    itemName: string,
    price: number
  ) => void,
  availablePlans: AvailableStripePlan[]
) => {
  const yearlyPriceId = getAvailablePlanPriceId(availablePlans, "year", 1);
  const quarterPriceId = getAvailablePlanPriceId(availablePlans, "month", 3);
  const monthlyPriceId = getAvailablePlanPriceId(availablePlans, "month", 1);
  const weeklyPriceId = getAvailablePlanPriceId(availablePlans, "week", 1);

  return (
    <div className="w-full lg:px-0  py-4 overflow-y-auto pb-5">
      <h2
        className="text-3xl lg:text-3xl px-4 lg:px-0 font-bold  text-slate-900 lg:text-center lg:mt-6 lg:mb-8 my-6 !leading-relaxed"
        style={{ opacity: 1, transform: "none" }}
      >
        All You Need to Prepare for
        <Image
          alt="CELPIP"
          width={150}
          height={100}
          className="ml-3 inline-block bg-white border border-slate-300 rounded-lg p-1.5"
          src="/celpip.png"
        />
      </h2>
      <div
        className="w-full flex flex-col px-4 lg:px-0 lg:flex-row items-center font-semibold lg:mb-14 mb-12 g text-[14px] lg:divide-x-2 divide-slate-200 gap-2 lg:gap-0 lg:items-start justify-center lg:text-slate-800 text-slate-600"
        style={{ opacity: "1", transform: "none" }}
      >
        <div
          className="flex flex-row items-center gap-2 w-full lg:w-fit lg:px-4"
          style={{ opacity: "1", transform: "none" }}
        >
          <Check
            className="text-green-500 shrink-0"
            width={20}
            height={20}
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
          ></Check>
          <p className="text-lg font-medium text-slate-900">
            2,000+ Sample Questions
          </p>
        </div>
        <div
          className="flex flex-row items-center gap-2 w-full lg:w-fit lg:px-4"
          style={{ opacity: "1", transform: "none" }}
        >
          <Check
            className="text-green-500 shrink-0"
            width={20}
            height={20}
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
          ></Check>
          <p className="text-lg font-medium text-slate-900">100 Mock Exams</p>
        </div>
        <div
          className="flex flex-row items-center gap-2 w-full lg:w-fit lg:px-4"
          style={{ opacity: "1", transform: "none" }}
        >
          <Check
            className="text-green-500 shrink-0"
            width={20}
            height={20}
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
          ></Check>

          <p className="text-lg font-medium text-slate-900">
            Unlimited Scoring &amp; Feedback
          </p>
        </div>
      </div>
      {time > 0 && (
        <div
          className="w-full max-w-sm mx-auto rounded-xl border mb-8 mt-4 pt-4 border-slate-300"
          style={{ opacity: "1", transform: "none" }}
        >
          <div className="text-center text-blue-700 mx-auto text-xl mb-2 font-black">
            Extra 10% Discount
          </div>
          <p className="text-center text-slate-600 text-[14px] mb-2">
            For new users – use the code at checkout
          </p>
          <div
            className=" flex items-center justify-center gap-1 mb-4 text-[14px]  w-fit mx-auto rounded-full bg-slate-100"
            style={{ opacity: "1", transform: "none" }}
          >
            <div className="font-medium text-salte-600">Expires in</div>
            <div className="flex items-center justify-center gap-1 text-lg text-rose-600 font-bold ">
              <span className="">{`${Math.floor(time / (60 * 60))}`}:</span>
              <span className="">
                {String(Math.floor((time % 3600) / 60)).padStart(2, "0")}:
              </span>
              <span
                className="font-bold inline-block w-5 text-center"
                style={{ opacity: "1", transform: "none" }}
              >
                {String(time % 60).padStart(2, "0")}
              </span>
            </div>
          </div>
          <div
            onClick={() => {
              navigator.clipboard.writeText("First10");
              setShowCopied(true);
              setTimeout(() => setShowCopied(false), 500);
            }}
            className="flex items-center justify-center gap-2 bg-slate-200/50 border-t border-slate-300 py-3 px-4 cursor-pointer relative"
          >
            <code className="font-mono font-bold text-slate-800 text-[14px]">
              First10
            </code>
            <div className="flex items-center gap-1 border border-slate-300 rounded-md px-2 py-1 bg-white">
              <div className="flex items-center gap-1">
                <Copy
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide-copy h-4 w-4"
                />
                <span className="text-[14px] font-medium">Copy</span>
              </div>
            </div>
            {showCopied && (
              <span className="absolute -top-1 left-1/2 -translate-x-1/2 bg-black text-white text-xs rounded px-2 py-1 shadow">
                Copied!
              </span>
            )}
          </div>
        </div>
      )}
      <div
        className="flex items-center justify-center gap-1 text-[14px]  w-fit mx-auto lg:mb-10 mb-6  rounded-full relative"
        style={{ opacity: "1", transform: "none" }}
      >
        <div className="text-xl font-semibold text-rose-700 z-10">
          Limited Time Offer!
        </div>
        <div className="text-lg w-48 h-3 font-semibold text-rose-600 bg-rose-100 left-0 right-0 absolute top-6 -translate-y-1/2 z-0"></div>
      </div>
      <div style={{ opacity: "1", transform: "none" }}>
        <div className="flex flex-col gap-6 justify-center items-center px-4 lg:px-0">
          <div className="flex flex-col w-full max-w-5xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 lg:px-20 w-full mb-6">
              <form
                action={yearlyPriceId ? `/api/checkout_session?price=${yearlyPriceId}` : ""}
                method="POST"
              >
                <CheckoutAttributionFields />
                <button
                  type="submit"
                  role="link"
                  className="h-full w-full"
                  disabled={!yearlyPriceId}
                  onClick={() =>
                    onCheckoutIntent(
                      "yearly_access",
                      "12 Months",
                      149.99
                    )
                  }
                >
                  <div style={{ opacity: "1", transform: "none" }}>
                    <div
                      className="rounded-2xl flex shadow-sm h-full
                text-left lg:flex-col justify-between
                transition-all hover:shadow-md cursor-pointer relative
                hover:-translate-y-2 border border-slate-300 bg-white"
                    >
                      <div className="w-full flex flex-col gap-2 p-5">
                        <div className="flex gap-2 items-center justify-between w-full lg:mb-4 mb-0">
                          <h3 className="text-2xl lg:text-2xl transition-all font-black text-blue-950">
                            12 Months
                          </h3>
                          <div className="bg-rose-600 text-white text-[14px]  rounded-full flex items-center justify-center">
                            <div className="px-2 py-1.5">
                              <b className="font-bold text-[14px]">%70</b> OFF
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 text-[14px] items-center">
                          <p className="text-lg text-slate-500 line-through decoration-red-600/70 ">
                            $<b className=" font-semibold">600.00</b>
                          </p>
                          <p className="font-normal text-slate-500 text-[14px]">
                            CA${" "}
                            <b className="font-semibold text-lg text-slate-700">
                              149.99
                            </b>
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2 px-3 justify-center items-center border-l border-slate-300 lg:border-l-0 lg:border-t lg:py-3 border-slate-  text-blue-700 ">
                        <p className="text-[14px] hidden lg:block font-semibold">
                          Get This Plan
                        </p>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="lucide lucide-arrow-right w-5 h-5 lg:w-4 lg:h-4"
                        >
                          <path d="M5 12h14"></path>
                          <path d="m12 5 7 7-7 7"></path>
                        </svg>
                      </div>
                    </div>
                  </div>
                </button>
              </form>
              <form
                action={quarterPriceId ? `/api/checkout_session?price=${quarterPriceId}` : ""}
                method="POST"
              >
                <CheckoutAttributionFields />
                <button
                  type="submit"
                  role="link"
                  className="h-full w-full"
                  disabled={!quarterPriceId}
                  onClick={() =>
                    onCheckoutIntent(
                      "quarter_access",
                      "3 Months",
                      99
                    )
                  }
                >
                  <div style={{ opacity: "1", transform: "none" }}>
                    <div
                      className="rounded-2xl flex shadow-sm h-full
                text-left lg:flex-col justify-between
                transition-all hover:shadow-md cursor-pointer relative
                hover:-translate-y-2 border border-slate-400 bg-white"
                    >
                      <div className="w-full flex flex-col gap-2 p-5">
                        <div className="flex gap-2 items-center justify-between w-full lg:mb-4 mb-0">
                          <h3 className="text-2xl lg:text-2xl transition-all font-black text-blue-950">
                            3 Months
                          </h3>
                          <div className="bg-rose-600 text-white text-[14px]  rounded-full flex items-center justify-center">
                            <div className="px-2 py-1.5">
                              <b className="font-bold text-[14px]">%50</b> OFF
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 text-[14px] items-center">
                          <p className="text-lg text-slate-500 line-through decoration-red-600/70 ">
                            $<b className=" font-semibold">240.00</b>
                          </p>
                          <p className="font-normal text-slate-500 text-[14px]">
                            CA${" "}
                            <b className="font-semibold text-lg text-slate-700">
                              99.00
                            </b>
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2 px-3 justify-center items-center border-l border-slate-300 lg:border-l-0 lg:border-t lg:py-3 border-slate-  text-blue-700 ">
                        <p className="text-[14px] hidden lg:block font-semibold">
                          Get This Plan
                        </p>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="lucide lucide-arrow-right w-5 h-5 lg:w-4 lg:h-4"
                        >
                          <path d="M5 12h14"></path>
                          <path d="m12 5 7 7-7 7"></path>
                        </svg>
                      </div>
                    </div>
                  </div>
                </button>
              </form>
              <form
                action={monthlyPriceId ? `/api/checkout_session?price=${monthlyPriceId}` : ""}
                method="POST"
              >
                <CheckoutAttributionFields />
                <button
                  type="submit"
                  role="link"
                  className="h-full w-full"
                  disabled={!monthlyPriceId}
                  onClick={() =>
                    onCheckoutIntent(
                      "monthly_access",
                      "1 Month",
                      34.99
                    )
                  }
                >
                  <div style={{ opacity: "1", transform: "none" }}>
                    <div
                      className="rounded-2xl flex shadow-sm h-full
                text-left lg:flex-col justify-between
                transition-all hover:shadow-md cursor-pointer relative
                hover:-translate-y-2 border border-slate-300 bg-white"
                    >
                      <div className="w-full flex flex-col gap-2 p-5">
                        <div className="flex gap-2 items-center justify-between w-full lg:mb-4 mb-0">
                          <h3 className="text-2xl lg:text-2xl transition-all font-black text-blue-950">
                            1 Month
                          </h3>
                          <div className="bg-rose-600 text-white text-[14px]  rounded-full flex items-center justify-center">
                            <div className="px-2 py-1.5">
                              <b className="font-bold text-[14px]">%30</b> OFF
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 text-[14px] items-center">
                          <p className="text-lg text-slate-500 line-through decoration-red-600/70 ">
                            $<b className=" font-semibold">80.00</b>
                          </p>
                          <p className="font-normal text-slate-500 text-[14px]">
                            CA${" "}
                            <b className="font-semibold text-lg text-slate-700">
                              34.99
                            </b>
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2 px-3 justify-center items-center border-l border-slate-300 lg:border-l-0 lg:border-t lg:py-3 border-slate-  text-blue-700 ">
                        <p className="text-[14px] hidden lg:block font-semibold">
                          Get This Plan
                        </p>
                        <ArrowRight
                          width="24"
                          height="24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="w-5 h-5 lg:w-4 lg:h-4"
                        ></ArrowRight>
                      </div>
                    </div>
                  </div>
                </button>
              </form>
              <form
                action={weeklyPriceId ? `/api/checkout_session?price=${weeklyPriceId}` : ""}
                method="POST"
              >
                <CheckoutAttributionFields />
                <button
                  type="submit"
                  role="link"
                  className="h-full w-full"
                  disabled={!weeklyPriceId}
                  onClick={() =>
                    onCheckoutIntent(
                      "weekly_access",
                      "Weekly",
                      19.99
                    )
                  }
                >
                  <div style={{ opacity: "1", transform: "none" }}>
                    <div
                      className="rounded-2xl flex shadow-sm h-full
                text-left lg:flex-col justify-between
                transition-all hover:shadow-md cursor-pointer relative
                hover:-translate-y-2 border border-slate-300 bg-white"
                    >
                      <div className="w-full flex flex-col gap-2 p-5">
                        <div className="flex gap-2 items-center justify-between w-full lg:mb-4 mb-0">
                          <h3 className="text-2xl lg:text-2xl transition-all font-black text-blue-950">
                            Weekly
                          </h3>
                        </div>
                        <div className="flex gap-2 text-sm items-center">
                          <p className="font-normal text-slate-500 text-sm">
                            CA${" "}
                            <b className="font-semibold text-lg text-slate-700">
                              19.99
                            </b>
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2 px-3 justify-center items-center border-l border-slate-300 lg:border-l-0 lg:border-t lg:py-3 border-slate-  text-blue-700 ">
                        <p className="text-[14px] hidden lg:block font-semibold">
                          Get This Plan
                        </p>
                        <ArrowRight
                          width="24"
                          height="24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="w-5 h-5 lg:w-4 lg:h-4"
                        ></ArrowRight>
                      </div>
                    </div>
                  </div>
                </button>
              </form>
            </div>
            <div className="flex gap-6 mt-3 text-slate-700 justify-center">
              <div className="flex items-center gap-2 border px-2 py-2 rounded-lg border-slate-300/70 w-fit">
                <LockOpen
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="inline-block text-gray-400 shrink-0"
                ></LockOpen>
                <p className="font-semibold text-slate-600 text-[14px]">
                  Unlimited Access
                </p>
              </div>
              <div className="flex items-center gap-2 border px-2 py-2 rounded-lg border-slate-300/70 w-fit">
                <CircleDollarSign
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="inline-block text-gray-400 shrink-0"
                ></CircleDollarSign>
                <p className="font-semibold text-slate-600 text-[14px]">
                  No Auto-Charges
                </p>
              </div>
              <div className="flex items-center gap-2 border px-2 py-2 rounded-lg border-slate-300/70 w-fit">
                <ShieldCheck
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="inline-block text-gray-400 shrink-0"
                ></ShieldCheck>

                <p className="font-semibold text-slate-600 text-[14px]">
                  Safe &amp; Secure
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function PremiumPlanDrawer() {
  const [time, setTime] = useState(0);
  const [showCopied, setShowCopied] = useState(false);
  const [availablePlans, setAvailablePlans] = useState<AvailableStripePlan[]>([]);
  const { user } = useUser();
  const { beginCheckout, selectItem } = useEcommerceTracking();
  useEffect(() => {
    let leftSeconds = 0;
    if (user?.createdAt) {
      const createdAtDate = new Date(user.createdAt);
      const now = new Date();
      const diffSeconds = Math.floor(
        (now.getTime() - createdAtDate.getTime()) / 1000
      );
      leftSeconds = 86399 - diffSeconds;
      setTime(leftSeconds);
    }

    let timer: NodeJS.Timeout | null = null;

    if (leftSeconds > 0) {
      timer = setInterval(() => {
        setTime((prevTime) => prevTime - 1);
      }, 1000);
    }

    if (time <= 0 && timer) {
      clearInterval(timer);
      // Handle time's up logic here if needed
    }

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [time, user]);
  const isPremiumPlanModalOpen = useStore(
    (state) => state.isPremiumPlanModalOpen
  );
  const setPremiumPlanModalState = useStore(
    (state) => state.setPremiumPlanModalState
  );

  useEffect(() => {
    const fetchAvailablePlans = async () => {
      try {
        const response = await fetch("/api/plans/available");
        if (!response.ok) {
          return;
        }

        const data = await response.json();
        setAvailablePlans(data.plans || []);
      } catch (error) {
        console.error("Error fetching available plans:", error);
      }
    };

    if (isPremiumPlanModalOpen && availablePlans.length === 0) {
      fetchAvailablePlans();
    }
  }, [availablePlans.length, isPremiumPlanModalOpen]);

  const handleCheckoutIntent = (
    itemId: string,
    itemName: string,
    price: number
  ) => {
    const item = {
      item_id: itemId,
      item_name: itemName,
      price,
      quantity: 1,
      item_brand: "CELPIP Practice Test",
      item_category: "Subscription",
    };

    selectItem([item], "premium_drawer", "Premium Drawer");
    beginCheckout(
      [item],
      "CAD",
      price,
      undefined,
      {
        email: user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase(),
        address: {
          first_name: user?.firstName || "",
          last_name: user?.lastName || "",
        },
      }
    );
  };

  // Calculate the difference in seconds between user.createdAt and now

  return (
    isPremiumPlanModalOpen && (
      <Drawer.Root
        shouldScaleBackground
        open={isPremiumPlanModalOpen}
        onOpenChange={() => setPremiumPlanModalState()}
      >
        <Drawer.Trigger asChild>
          <button>Open Drawer</button>
        </Drawer.Trigger>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed  bg-stone-700/80 backdrop-blur-sm inset-0 z-50" />
          <Drawer.Content className="bg-zinc-100 flex flex-col rounded-t-[10px] h-[70%] mt-24 fixed bottom-0 left-0 right-0 z-100">
            <Drawer.Title className="sr-only">Premium Plans</Drawer.Title>

            {!user
              ? PlanForGuesVisitor()
              : PlansForUsers(
                  time,
                  showCopied,
                  setShowCopied,
                  handleCheckoutIntent,
                  availablePlans
                )}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    )
  );
}
