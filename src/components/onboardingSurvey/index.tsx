"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import { trackKpi } from "@/lib/analytics";

const TEST_DATE_OPTIONS = [
  "Within 2 weeks",
  "Within 1 month",
  "1–3 months",
  "3–6 months",
  "6+ months",
  "I don't have a date yet",
];

const FOCUS_SKILL_OPTIONS = [
  "Speaking",
  "Writing",
  "Listening",
  "Reading",
  "Exam strategy (time management, format)",
  "Other (please specify)",
];

export default function OnboardingSurvey({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const [step, setStep] = useState(1);
  const [testDate, setTestDate] = useState("");
  const [focusSkill, setFocusSkill] = useState("");
  const [customFocusSkill, setCustomFocusSkill] = useState("");
  const [targetScores, setTargetScores] = useState({
    listening: 7,
    reading: 7,
    writing: 7,
    speaking: 7,
  });
  const { user } = useHybridWebUser();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const startedAtRef = useRef(Date.now());
  const totalSteps = 3;

  const dismissSurvey = async (action: "skip" | "submit", answers?: object) => {
    if (action === "submit") {
      const avgTarget = Math.round(
        (targetScores.listening +
          targetScores.reading +
          targetScores.writing +
          targetScores.speaking) /
          4,
      );
      trackKpi.targetScoreSet({
        targetClb: avgTarget,
        purpose:
          focusSkill === "Other (please specify)"
            ? customFocusSkill
            : focusSkill,
      });
      trackKpi.onboardingComplete({
        durationSec: Math.round((Date.now() - startedAtRef.current) / 1000),
        stepsSkipped: 0,
      });
    } else {
      trackKpi.onboardingComplete({
        durationSec: Math.round((Date.now() - startedAtRef.current) / 1000),
        stepsSkipped: totalSteps - step + 1,
      });
    }

    await fetch("/api/onboarding-new", {
      method: "POST",
      body: JSON.stringify(
        action === "skip" ? { action: "skip" } : { action: "submit", answers },
      ),
      headers: {
        "Content-Type": "application/json",
      },
    });
    await user?.reload();
    router.refresh();
    onComplete();
  };

  const handleScoreChange = (skill: string, value: number) => {
    const newValue = Math.max(5, Math.min(12, value));
    setTargetScores((prev) => ({
      ...prev,
      [skill]: newValue,
    }));
  };

  const handleNext = () => {
    if (step === 1 && testDate) {
      trackKpi.testDateSet({
        testDate,
        isBooked: testDate !== "I don't have a date yet",
      });
      trackKpi.onboardingStepComplete({
        stepName: "test_date",
        stepNumber: 1,
        totalSteps,
      });
      setStep(2);
    } else if (step === 2 && focusSkill) {
      trackKpi.onboardingStepComplete({
        stepName: "focus_skill",
        stepNumber: 2,
        totalSteps,
      });
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
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
              step >= 1 ? "bg-[#F27059]" : "bg-[#E6E6E6]",
            )}
          ></div>
          <div
            className={cn(
              "rounded-[10px] w-full transition-colors duration-500",
              step >= 2 ? "bg-[#F27059]" : "bg-[#E6E6E6]",
            )}
          ></div>
          <div
            className={cn(
              "rounded-[10px] w-full transition-colors duration-500",
              step >= 3 ? "bg-[#F27059]" : "bg-[#E6E6E6]",
            )}
          ></div>
        </div>

        <p className="font-normal mt-[24px]  screen744:!mt-[32px] text-[16px] text-[#37465C] mb-[16px]">
          Help us improve your experience.
        </p>
        <p className="text-[16px] font-normal text-[#316BFF] mb-[24px] screen744:!mb-[32px]">
          {step === 1
            ? "Question 1 of 3"
            : step === 2
              ? "Question 2 of 3"
              : "Question 3 of 3"}
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
              When is your CELPIP test?
            </h2>

            <div className="flex flex-col mb-[24px] screen744:!mb-[32px] gap-[16px] data-[state=checked]:!bg-[#F27059]">
              {TEST_DATE_OPTIONS.map((option) => (
                <label
                  key={option}
                  className={cn(
                    "flex items-center h-[48px] screen744:!h-[52px] px-[16px] screen744:!px-[32px] rounded-[40px] transition-all cursor-pointer text-[12px] screen744:!text-[16px] font-normal w-fit",
                    testDate === option
                      ? " bg-[#F27059] text-white "
                      : "bg-white text-[#212E42]",
                  )}
                >
                  <Checkbox
                    checked={testDate === option}
                    onCheckedChange={() => setTestDate(option)}
                    className={cn(
                      "mr-3  w-[24px] h-[24px] border-2 rounded-[6px] flex items-center justify-center transition-all",
                      testDate === option
                        ? "border-[#F27059] bg-white data-[state=checked]:!bg-white  data-[state=checked]:!text-[#F27059]"
                        : "border-gray-300",
                    )}
                  />
                  {option}
                </label>
              ))}
            </div>

            <div className="flex  justify-between items-center gap-[24px]">
              <div></div>
              <div className="flex gap-[24px]">
                <button
                  className="cursor-pointer text-[14px] text-[#212E42] font-normal"
                  onClick={() => dismissSurvey("skip")}
                >
                  Skip
                </button>
                <Button
                  disabled={!testDate}
                  className={cn(
                    "rounded-[24px] font-normal h-[40px] text-[14px]",
                    !testDate
                      ? "bg-gray-300 text-white cursor-not-allowed"
                      : "cursor-pointer",
                  )}
                  onClick={handleNext}
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
              Which skill are you focused on improving first?
            </h2>

            <div className="flex flex-col mb-[24px] screen744:!mb-[32px] gap-[16px] data-[state=checked]:!bg-[#F27059]">
              {FOCUS_SKILL_OPTIONS.map((option, index) => (
                <div
                  className={`flex ${
                    index === 5
                      ? "flex-col gap-[24px] screen744:!flex-row screen744:!gap-1"
                      : "flex-row"
                  }`}
                  key={option}
                >
                  <label
                    className={cn(
                      "flex items-center h-[48px] screen744:!h-[52px] px-[16px] screen744:!px-[32px] rounded-[40px] transition-all cursor-pointer text-[12px] screen744:!text-[16px] font-normal w-fit",
                      focusSkill === option
                        ? " bg-[#F27059] text-white "
                        : "bg-white text-[#212E42]",
                    )}
                  >
                    <Checkbox
                      checked={focusSkill === option}
                      onCheckedChange={() => setFocusSkill(option)}
                      className={cn(
                        "mr-3  w-[24px] h-[24px] border-2 rounded-[6px] flex items-center justify-center transition-all",
                        focusSkill === option
                          ? "border-[#F27059] bg-white data-[state=checked]:!bg-white  data-[state=checked]:!text-[#F27059]"
                          : "border-gray-300",
                      )}
                    />
                    {option}
                  </label>
                  {option === "Other (please specify)" &&
                    focusSkill === option && (
                      <div className="relative w-[300px]  screen744:!ml-8">
                        <input
                          type="text"
                          id="customFocusSkill"
                          className="peer w-full border border-gray-300 rounded px-[16px] h-[56px] pb-1 text-sm text-gray-900 placeholder-transparent focus:border-blue-500 focus:outline-none"
                          placeholder="Write your answer"
                          value={customFocusSkill}
                          onChange={(e) => setCustomFocusSkill(e.target.value)}
                        />
                        <label
                          htmlFor="customFocusSkill"
                          className={cn(
                            "absolute left-2 text-xs bg-[#F4F7FF] px-1 text-gray-500 transition-all",
                            !customFocusSkill
                              ? "peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-400"
                              : "-top-2 text-xs text-blue-500",
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
                onClick={handleBack}
              >
                Back
              </button>

              <div className="flex gap-[24px]">
                <button
                  className="cursor-pointer text-[14px] text-[#212E42] font-normal"
                  onClick={() => dismissSurvey("skip")}
                >
                  Skip
                </button>
                <Button
                  disabled={
                    !focusSkill ||
                    (focusSkill === "Other (please specify)" &&
                      !customFocusSkill.trim())
                  }
                  className={cn(
                    "rounded-[24px] font-normal h-[40px] text-[14px]",
                    !focusSkill ||
                      (focusSkill === "Other (please specify)" &&
                        !customFocusSkill.trim())
                      ? "bg-gray-300 text-white cursor-not-allowed"
                      : "cursor-pointer",
                  )}
                  onClick={handleNext}
                >
                  Next Question
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            <h2 className="text-[20px] text-[#212E42] font-semibold mb-[28px]">
              What is your target score?
            </h2>

            <div className="grid  gap-6 mb-[32px]">
              {Object.entries(targetScores).map(([skill, score]) => (
                <div
                  key={skill}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-white"
                >
                  <span className="font-medium capitalize text-gray-700">
                    {skill}:
                  </span>
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => handleScoreChange(skill, score - 1)}
                      disabled={score <= 5}
                      className="w-8 h-8 cursor-pointer rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      −
                    </button>
                    <span className="w-8 text-center font-semibold text-lg">
                      {score}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleScoreChange(skill, score + 1)}
                      disabled={score >= 12}
                      className="w-8 h-8  cursor-pointer rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center gap-[24px]">
              <button
                className="cursor-pointer hover:!bg-blue-500 hover:!text-white px-[24px] rounded-[24px] border-[#76808F] bg-white max-w-[82px] h-[40px] text-[14px] text-[#76808F] font-normal"
                onClick={handleBack}
              >
                Back
              </button>

              <div className="flex gap-[24px]">
                <button
                  className="cursor-pointer text-[14px] text-[#212E42] font-normal"
                  onClick={() => dismissSurvey("skip")}
                >
                  Skip
                </button>
                <Button
                  disabled={isSubmitting}
                  className={cn(
                    "rounded-[24px] font-normal h-[40px] text-[14px]",
                    isSubmitting
                      ? "bg-gray-300 text-white cursor-not-allowed"
                      : "cursor-pointer",
                  )}
                  onClick={async () => {
                    setIsSubmitting(true);
                    try {
                      await dismissSurvey("submit", {
                        testDate,
                        focusSkill,
                        customFocusSkill:
                          focusSkill === "Other (please specify)"
                            ? customFocusSkill
                            : "",
                        targetScores,
                      });
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                >
                  {isSubmitting ? "Submitting..." : "Submit"}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
