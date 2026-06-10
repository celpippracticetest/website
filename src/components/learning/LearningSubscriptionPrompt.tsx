"use client";

import { Button } from "@/components/v2/Button";

type Props = {
  sequenceNumber?: number;
  compact?: boolean;
};

export default function LearningSubscriptionPrompt({
  sequenceNumber,
  compact = false,
}: Props) {
  const dayLabel = sequenceNumber ?? 2;

  return (
    <div
      className={
        compact
          ? "rounded-xl border border-primary1/20 bg-primary6/30 px-4 py-4 text-center"
          : "rounded-2xl border border-primary1/25 bg-[#F4F7FF] px-5 py-6 text-center screen744:px-8"
      }
    >
      <p className="text-sm font-semibold text-text1 screen744:text-base">
        Day {dayLabel} lessons require Pro
      </p>
      <p className="mt-2 text-sm text-text2">
        Your first day of daily learning is free. Subscribe to unlock
        tomorrow&apos;s lessons and keep building toward your target CLB.
      </p>
      <div className="mt-4 flex justify-center">
        <Button href="/pricing" variant="primary" size="md" className="min-w-[200px]">
          Subscribe to Pro
        </Button>
      </div>
    </div>
  );
}
