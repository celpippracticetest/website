"use client";

interface ObjectivePracticeSubmitButtonsProps {
  onSubmitAndNext: () => void | Promise<void>;
  onSubmitAndSeeResult: () => void | Promise<void>;
  showSubmitAndNext?: boolean;
  disabled?: boolean;
}

const ObjectivePracticeSubmitButtons = ({
  onSubmitAndNext,
  onSubmitAndSeeResult,
  showSubmitAndNext = true,
  disabled = false,
}: ObjectivePracticeSubmitButtonsProps) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {showSubmitAndNext && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => void onSubmitAndNext()}
          className="cursor-pointer shrink-0 border border-[#76808F] px-[16px] screen1280:px-[24px] text-[14px] font-normal h-[40px] rounded-[24px] bg-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="hidden screen1280:inline">Submit and Next</span>
          <span className="inline screen1280:hidden">Submit &amp; Next</span>
        </button>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => void onSubmitAndSeeResult()}
        className="cursor-pointer shrink-0 border border-[#76808F] px-[16px] screen1280:px-[24px] text-[14px] font-normal h-[40px] rounded-[24px] bg-[#4A7DFF] text-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="hidden screen1280:inline">Submit and See result</span>
        <span className="inline screen1280:hidden">See result</span>
      </button>
    </div>
  );
};

export default ObjectivePracticeSubmitButtons;
