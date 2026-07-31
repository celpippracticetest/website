"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { useModalTracking } from "@/hooks/useTracking";
import type { NpsReadiness } from "@/lib/nps";
import { useNpsStore } from "@/store/useNps.store";
import SvgClose from "@/components/icons/Close";
import { cn } from "@/lib/utils";

const READINESS_OPTIONS: { value: NpsReadiness; label: string }[] = [
  { value: "not_really", label: "Not really" },
  { value: "somewhat", label: "Somewhat" },
  { value: "a_lot_more", label: "A lot more" },
];

type Step = "form" | "thanks";

export default function NpsModal() {
  const router = useRouter();
  const modalTracking = useModalTracking();
  const { isOpen, trigger, contextLabel, dismiss, completeSubmit } =
    useNpsStore();

  const [step, setStep] = useState<Step>("form");
  const [score, setScore] = useState<number | null>(null);
  const [readiness, setReadiness] = useState<NpsReadiness | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setStep("form");
    setScore(null);
    setReadiness(null);
    setReason("");
    setSubmitting(false);
    modalTracking.viewed("nps_feedback", trigger ?? undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- track once per open
  }, [isOpen, trigger]);

  if (!isOpen) return null;

  const finishAndMaybeNavigate = (userAction: "dismissed" | "completed") => {
    const pending = useNpsStore.getState().pendingHref;
    modalTracking.closed("nps_feedback", userAction);
    if (userAction === "dismissed") {
      dismiss();
    } else {
      completeSubmit();
      useNpsStore.setState({
        isOpen: false,
        trigger: null,
        pendingHref: null,
      });
    }
    useNpsStore.setState({ mockLeaveArmed: false });
    if (pending) router.push(pending);
  };

  const onCloseClick = () => {
    finishAndMaybeNavigate(step === "thanks" ? "completed" : "dismissed");
  };

  const handleSubmit = async () => {
    if (score == null || submitting) return;
    setSubmitting(true);
    try {
      await fetch("/api/nps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score,
          readiness,
          reason: reason.trim() || null,
          trigger,
          contextLabel,
        }),
      });
    } catch (err) {
      console.error("[nps] submit failed", err);
    } finally {
      completeSubmit();
      setSubmitting(false);
      setStep("thanks");
    }
  };

  const headerLabel = contextLabel || "Feedback";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={onCloseClick}
      />

      <div
        className={cn(
          "relative z-10 w-full bg-white shadow-[0_16px_48px_rgba(33,46,66,0.18)] animate-in fade-in zoom-in-95 duration-200",
          step === "thanks"
            ? "max-w-[420px] rounded-[20px] px-5 pt-4 pb-5"
            : "max-w-[560px] rounded-[20px] px-5 pt-4 pb-5 screen744:!px-6 screen744:!pb-6",
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="nps-question"
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <p className="text-[13px] leading-5 text-[#9AA3B2] pt-0.5">
            {headerLabel}
          </p>
          <button
            type="button"
            onClick={onCloseClick}
            className="shrink-0 -mr-1 -mt-0.5 p-1 rounded-md hover:bg-[#F2F6FF] transition-colors"
            aria-label="Close"
          >
            <SvgClose className="w-5 h-5" />
          </button>
        </div>

        {step === "thanks" ? (
          <div className="flex items-center gap-3 pt-1 pb-1">
            <Image
              src="/images/beaver-head-logo.png"
              alt=""
              width={40}
              height={40}
              className="w-10 h-10 object-contain shrink-0"
            />
            <div>
              <p className="text-[16px] font-bold text-[#212E42] leading-snug">
                Thanks – feedback logged.
              </p>
              <p className="text-[13px] text-[#76808F] mt-0.5 leading-snug">
                It goes straight to the people building these tests
              </p>
            </div>
          </div>
        ) : (
          <>
            <h2
              id="nps-question"
              className="text-[18px] screen744:!text-[20px] font-bold text-[#212E42] text-center leading-snug mb-5"
            >
              How likely are you to recommend us to someone else preparing for
              CELPIP?
            </h2>

            <div className="flex justify-between gap-1 screen744:!gap-1.5">
              {Array.from({ length: 11 }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setScore(i)}
                  className={cn(
                    "flex-1 aspect-square max-w-[44px] min-w-0 rounded-[10px] text-[14px] screen744:!text-[15px] font-semibold transition-all border",
                    score === i
                      ? "bg-[#316BFF] border-[#316BFF] text-white shadow-sm"
                      : "bg-white border-[#D5D6D8] text-[#37465C] hover:border-[#316BFF]/60 hover:bg-[#F2F6FF]",
                  )}
                  aria-label={`Score ${i}`}
                  aria-pressed={score === i}
                >
                  {i}
                </button>
              ))}
            </div>
            <div className="flex justify-between mt-2 mb-1 px-0.5">
              <span className="text-[12px] text-[#9AA3B2]">Not likely</span>
              <span className="text-[12px] text-[#9AA3B2]">Very likely</span>
            </div>

            {score != null && (
              <div className="mt-5 pt-5 border-t border-[#E8ECF4] space-y-5 animate-in fade-in slide-in-from-top-1 duration-200">
                <div>
                  <p className="text-[15px] font-bold text-[#212E42] mb-3">
                    Do you feel more ready for your exam after this test?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {READINESS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setReadiness(opt.value)}
                        className={cn(
                          "flex-1 min-w-[100px] px-3 py-2.5 rounded-full text-[14px] font-medium border transition-all",
                          readiness === opt.value
                            ? "bg-[#316BFF] border-[#316BFF] text-white"
                            : "bg-white border-[#D5D6D8] text-[#37465C] hover:border-[#316BFF]/60",
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[15px] font-bold text-[#212E42] mb-3">
                    What&apos;s the main reason for your score?
                  </p>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="The timing felt realistic, but I wanted more explanation on the answers I got wrong"
                    rows={3}
                    className="w-full resize-none rounded-[12px] border border-[#D5D6D8] px-3.5 py-3 text-[14px] text-[#212E42] placeholder:text-[#9AA3B2] focus:outline-none focus:ring-2 focus:ring-[#316BFF]/30 focus:border-[#316BFF]"
                  />
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <p className="text-[13px] text-[#9AA3B2]">
                    Or send it as is.
                  </p>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-full bg-[#316BFF] text-white text-[14px] font-semibold hover:bg-[#2858E0] disabled:opacity-60 transition-colors shrink-0"
                  >
                    {submitting ? "Sending…" : "Send feedback"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
