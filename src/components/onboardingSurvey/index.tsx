"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { motion } from "framer-motion";
import { useUser } from "@clerk/nextjs";

const REASONS = [
  "For Permanent Residency (PR) / Express Entry",
  "For Canadian Citizenship",
  "For Work Permit / Job Application",
  "For Study Permit / University Admission",
  "For Professional Licensing or Certification",
  "For Personal Development / Improve English",
  "Other (please specify)",
];

const STEP_TWO_REASONS = [
  "To take a full mock exam simulation",
  "To practice individual CELPIP skills",
  "To get instant AI feedback and improve",
  "To learn about CELPIP format and tips",
  "Other (please specify)",
];

export default function OnboardingSurvey({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const [step, setStep] = useState(1);
  const [reasons, setReasons] = useState<string[]>([]);
  const [stepTwoReasons, setStepTwoReasons] = useState<string[]>([]);
  const [customReason, setCustomReason] = useState("");
  const [customStepTwoReason, setCustomStepTwoReason] = useState("");
  const { user } = useUser();

  const toggleReason = (reason: string) => {
    setReasons((prev) =>
      prev.includes(reason)
        ? prev.filter((r) => r !== reason)
        : [...prev, reason]
    );
  };

  const toggleStepTwoReason = (reason: string) => {
    setStepTwoReasons((prev) =>
      prev.includes(reason)
        ? prev.filter((r) => r !== reason)
        : [...prev, reason]
    );
  };

  const handleSubmit = () => {
    if (reasons.length === 0) return;
    setStep(2);
  };

  return (
    <div className="flex px-[16px] screen744:!px-[24px] screen1280:!px-[80px] flex-wrap screen1280:!flex-nowrap pb-[111px] screen1280:!pb-0 w-full overflow-auto gap-[24px] screen1280:!gap-[92px] justify-center">
      <div className="flex  screen744:!shrink-0 mt-[40px] screen1280:!mt-0 items-center screen744:!gap-[40px] gap-[20px] screen1280:!gap-[16px] flex-col screen744:!flex-row screen1280:!flex-col">
        {step === 1 ? (
          <>
            <Image
              alt="plan sale modal"
              width={288}
              height={432}
              className={`screen744:!shrink-0  screen1280:!mt-[-10px] w-[54px] h-[81px] screen744:!w-[121px] screen744:!h-[181px] screen1280:!w-[288px] screen1280:!h-[432px]`}
              src="/images/question-after-sign-up-logo-step-one.png"
            />
          </>
        ) : (
          <>
            <Image
              alt="plan sale modal"
              width={324}
              height={290}
              className={`shrink-0 screen1280!mt-[126px] screen744:!w-[202px] w-[89px] h-[80px] screen744:!h-[180px] screen1280:!w-[324px] screen1280:!h-[290px]`}
              src="/images/question-after-sign-up-logo-step-two.png"
            />
          </>
        )}

        <div className="max-w-[394px] flex items-center text-[18px] screen744:!text-[24px] font-medium w-full ">
          <span>
            {" "}
            Answer Two Quick Questions & Get{" "}
            <span className="text-[#EE4266] font-semibold text-[20px] screen744:!text-[26px]">
              10%
            </span>
            Extra Discount!
          </span>
        </div>
      </div>

      <div className="w-full max-w-[900px] max-h-fit shrink-1  border border-[#D5D6D8] rounded-[12px] p-[16px] screen744:!p-[40px] ">
        <div className="h-[4px] flex w-full mt-[40px] rounded-[10px] bg-[#E6E6E6]">
          <div
            className={cn(
              "rounded-[10px] w-full transition-colors duration-500",
              step === 1 ? "bg-[#F27059]" : "bg-[#E6E6E6]"
            )}
          ></div>
          <div
            className={cn(
              "rounded-[10px] w-full transition-colors duration-500",
              step === 2 ? "bg-[#F27059]" : "bg-[#E6E6E6]"
            )}
          ></div>
        </div>

        <p className="font-normal mt-[24px]  screen744:!mt-[32px] text-[16px] text-[#37465C] mb-[16px]">
          Help us improve your experience.
        </p>
        <p className="text-[16px] font-normal text-[#316BFF] mb-[24px] screen744:!mb-[32px]">
          {step === 1 ? "Question 1 of 2" : "Question 2 of 2"}
        </p>

        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            <h2 className="text-[20px] text-[#212E42] font-semibold mb-[28px]">
              Why are you taking the CELPIP test?
            </h2>

            <div className="flex flex-col mb-[24px] screen744:!mb-[32px] gap-[16px] data-[state=checked]:!bg-[#F27059]">
              {REASONS.map((reason) => (
                <div className="flex" key={reason}>
                  <label
                    className={cn(
                      "flex items-center h-[48px] screen744:!h-[52px] px-[16px] screen744:!px-[32px] rounded-[40px] transition-all cursor-pointer text-[12px] screen744:!text-[16px] font-normal w-fit",
                      reasons.includes(reason)
                        ? " bg-[#F27059] text-white "
                        : "bg-white text-[#212E42]"
                    )}
                  >
                    <Checkbox
                      checked={reasons.includes(reason)}
                      onCheckedChange={() => toggleReason(reason)}
                      className={cn(
                        "mr-3  w-[24px] h-[24px] border-2 rounded-[6px] flex items-center justify-center transition-all",
                        reasons.includes(reason)
                          ? "border-[#F27059] bg-white data-[state=checked]:!bg-white  data-[state=checked]:!text-[#F27059]"
                          : "border-gray-300"
                      )}
                    />
                    {reason}
                  </label>
                  {reason === "Other (please specify)" &&
                    reasons.includes(reason) && (
                      <div className="relative w-[300px]  ml-8">
                        <input
                          type="text"
                          id="customReason"
                          className="peer w-full border border-gray-300 rounded px-[16px] h-[56px] pb-1 text-sm text-gray-900 placeholder-transparent focus:border-blue-500 focus:outline-none"
                          placeholder="Write your answer"
                          value={customReason}
                          onChange={(e) => setCustomReason(e.target.value)}
                        />
                        <label
                          htmlFor="customReason"
                          className={cn(
                            "absolute left-2 text-xs bg-[#F4F7FF] px-1 text-gray-500 transition-all",
                            !customReason
                              ? "peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-400"
                              : "-top-2 text-xs text-blue-500"
                          )}
                        >
                          Write your answer
                        </label>
                      </div>
                    )}
                </div>
              ))}
            </div>

            <div className="flex  justify-between items-center gap-[24px]">
              <div></div>
              <div className="flex gap-[24px]">
                <button
                  className="cursor-pointer text-[14px] text-[#212E42] font-normal"
                  onClick={async () => {
                    await fetch("/api/onboarding", {
                      method: "POST",
                      body: JSON.stringify({
                        action: "askLater",
                      }),
                      headers: {
                        "Content-Type": "application/json",
                      },
                    });
                    user?.reload();

                    onComplete();
                  }}
                >
                  Ask later
                </button>
                <Button
                  disabled={
                    reasons.length === 0 ||
                    (reasons.includes("Other (please specify)") &&
                      !customReason.trim())
                  }
                  className={cn(
                    "rounded-[24px] font-normal h-[40px] text-[14px]",
                    reasons.length === 0 ||
                      (reasons.includes("Other (please specify)") &&
                        !customReason.trim())
                      ? "bg-gray-300 text-white cursor-not-allowed"
                      : "cursor-pointer"
                  )}
                  onClick={handleSubmit}
                >
                  Next Question
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            <h2 className="text-[20px] text-[#212E42] font-semibold mb-[28px]">
              What brings you to CELPIP.com today?
            </h2>

            <div className="flex flex-col mb-[32px] gap-[16px] data-[state=checked]:!bg-[#F27059]">
              {STEP_TWO_REASONS.map((reason) => (
                <div className="flex items-center" key={reason}>
                  <label
                    className={cn(
                      "flex items-center h-[48px]  screen744:!h-[52px] px-[32px] rounded-[40px] transition-all cursor-pointer text-[12px] screen744:!text-[16px] font-normal w-fit",
                      stepTwoReasons.includes(reason)
                        ? " bg-[#F27059] text-white "
                        : "bg-white text-[#212E42]"
                    )}
                  >
                    <Checkbox
                      checked={stepTwoReasons.includes(reason)}
                      onCheckedChange={() => toggleStepTwoReason(reason)}
                      className={cn(
                        "mr-3  w-[24px] h-[24px] border-2 rounded-[6px] flex items-center justify-center transition-all",
                        stepTwoReasons.includes(reason)
                          ? "border-[#F27059] bg-white data-[state=checked]:!bg-white  data-[state=checked]:!text-[#F27059]"
                          : "border-gray-300"
                      )}
                    />
                    {reason}
                  </label>
                  {reason === "Other (please specify)" &&
                    stepTwoReasons.includes(reason) && (
                      <div className="relative w-[300px]  ml-8">
                        <input
                          type="text"
                          id="customStepTwoReason"
                          className="peer w-full border border-gray-300 rounded px-[16px] h-[56px] pb-1 text-sm text-gray-900 placeholder-transparent focus:border-blue-500 focus:outline-none"
                          placeholder="Write your answer"
                          value={customStepTwoReason}
                          onChange={(e) =>
                            setCustomStepTwoReason(e.target.value)
                          }
                        />
                        <label
                          htmlFor="customStepTwoReason"
                          className={cn(
                            "absolute left-2 text-xs bg-[#F4F7FF] px-1 text-gray-500 transition-all",
                            !customStepTwoReason
                              ? "peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-400"
                              : "-top-2 text-xs text-blue-500"
                          )}
                        >
                          Write your answer
                        </label>
                      </div>
                    )}
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center gap-[24px]">
              <button
                className="cursor-pointer hover:!bg-blue-500 hover:!text-white px-[24px] rounded-[24px] border-[#76808F] bg-white max-w-[82px] h-[40px] text-[14px] text-[#76808F] font-normal"
                onClick={() => setStep(1)}
              >
                Back
              </button>

              <div className="flex gap-[24px]">
                <button
                  className="cursor-pointer  text-[14px] text-[#212E42] font-normal"
                  onClick={async () => {
                    await fetch("/api/onboarding", {
                      method: "POST",
                      body: JSON.stringify({
                        action: "askLater",
                      }),
                      headers: {
                        "Content-Type": "application/json",
                      },
                    });
                    user?.reload();

                    onComplete();
                  }}
                >
                  Ask later
                </button>
                <Button
                  disabled={
                    stepTwoReasons.length === 0 ||
                    (stepTwoReasons.includes("Other (please specify)") &&
                      !customStepTwoReason.trim())
                  }
                  className={cn(
                    "rounded-[24px] font-normal h-[40px] text-[14px]",
                    stepTwoReasons.length === 0 ||
                      (stepTwoReasons.includes("Other (please specify)") &&
                        !customStepTwoReason.trim())
                      ? "bg-gray-300 text-white cursor-not-allowed"
                      : "cursor-pointer"
                  )}
                  onClick={async () => {
                    await fetch("/api/onboarding", {
                      method: "POST",
                      body: JSON.stringify({
                        action: "submit",
                        answers: {
                          stepOneReasons: reasons,
                          customReason,
                          stepTwoReasons,
                          customStepTwoReason,
                        },
                      }),
                      headers: {
                        "Content-Type": "application/json",
                      },
                    });
                    user?.reload();
                    onComplete();
                  }}
                >
                  Submit
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
