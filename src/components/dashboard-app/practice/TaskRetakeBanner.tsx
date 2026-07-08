"use client";

import { Button } from "@/components/ui/button";

interface TaskRetakeBannerProps {
  onRetake: () => void;
}

const TaskRetakeBanner = ({ onRetake }: TaskRetakeBannerProps) => {
  return (
    <div className="flex flex-col gap-4 px-6 py-4 border-t border-[#D5D6D8] bg-[#F7F9FF]">
      <span className="text-[16px] font-medium text-[#5786FF]">
        You&apos;ve completed all practices in this task.
      </span>
      <Button
        type="button"
        onClick={onRetake}
        variant="outline"
        className="cursor-pointer max-w-[160px] rounded-[24px] text-[14px] bg-[#4A7DFF] items-center justify-center font-normal text-white h-[40px]"
      >
        Retake task
      </Button>
    </div>
  );
};

export default TaskRetakeBanner;
