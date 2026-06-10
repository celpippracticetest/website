"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/v2/Button";
import SvgListening from "@/components/icons/Listening";
import SvgReading from "@/components/icons/Reading";
import SvgWriting from "@/components/icons/Writing";
import SvgSpeaking from "@/components/icons/Speaking";
import SvgPlus from "@/components/icons/Plus";
import { cn } from "@/lib/utils";
import type { ClbScores } from "@/lib/learning/types";

const SKILLS: {
  key: keyof ClbScores;
  label: string;
  icon: ReactNode;
  bgColor: string;
}[] = [
  {
    key: "listening",
    label: "Listening",
    icon: <SvgListening className="text-maple-dark" />,
    bgColor: "bg-primary5",
  },
  {
    key: "speaking",
    label: "Speaking",
    icon: <SvgSpeaking className="text-error2" />,
    bgColor: "bg-secondary5",
  },
  {
    key: "writing",
    label: "Writing",
    icon: <SvgWriting className="text-success" />,
    bgColor: "bg-success5",
  },
  {
    key: "reading",
    label: "Reading",
    icon: <SvgReading className="text-error1" />,
    bgColor: "bg-error5",
  },
];

type Props = {
  initialCurrent?: ClbScores;
  initialTarget?: ClbScores;
  onComplete: () => void;
};

const defaultScores = (): { current: ClbScores; target: ClbScores } => ({
  current: { listening: 7, reading: 7, writing: 7, speaking: 7 },
  target: { listening: 8, reading: 8, writing: 8, speaking: 8 },
});

function clampClb(n: number): number {
  return Math.max(4, Math.min(12, Math.round(n)));
}

function minTargetForCurrent(current: number): number {
  return current >= 12 ? 12 : current + 1;
}

function isValidTargetPair(current: number, target: number): boolean {
  if (current >= 12) return target === 12;
  return target >= current + 1;
}

function ClbLevelControl({
  label,
  value,
  onDecrement,
  onIncrement,
  disableDecrement,
  disableIncrement,
  variant = "default",
  className,
}: {
  label: string;
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  disableDecrement?: boolean;
  disableIncrement?: boolean;
  variant?: "default" | "target";
  className?: string;
}) {
  const segmentBorder =
    variant === "target" ? "border-primary1/25" : "border-outline/60";

  const segmentButtonClass = cn(
    "flex min-w-[2.25rem] shrink-0 items-center justify-center px-2 py-1.5 text-text1 transition-colors duration-200 hover:bg-primary6 hover:text-primary1 disabled:pointer-events-none disabled:bg-[#F4F7FF] disabled:text-text3 disabled:opacity-60"
  );

  return (
    <div
      className={cn(
        "min-w-0 flex-1 rounded-xl border p-2 screen744:p-2.5",
        variant === "target"
          ? "border-primary1/20 bg-primary6/40"
          : "border-outline/70 bg-[#F4F7FF]/60",
        className
      )}
    >
      <p className="mb-1.5 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-text3">
        {label}
      </p>
      <div className="flex justify-center">
        <div
          className={cn(
            "inline-flex items-stretch overflow-hidden rounded-lg border bg-white",
            segmentBorder
          )}
        >
          <button
            type="button"
            aria-label={`Decrease ${label}`}
            disabled={disableDecrement}
            onClick={onDecrement}
            className={cn(segmentButtonClass, "border-r", segmentBorder)}
          >
            <span className="text-xl font-bold leading-none">−</span>
          </button>
          <div
            className={cn(
              "flex min-w-[3.25rem] flex-col items-center justify-center border-r px-2 py-1.5",
              segmentBorder
            )}
          >
            <span className="text-[9px] font-semibold uppercase tracking-wider text-text3">
              CLB
            </span>
            <span className="text-xl font-bold leading-none tracking-tight text-text1">
              {value}
            </span>
          </div>
          <button
            type="button"
            aria-label={`Increase ${label}`}
            disabled={disableIncrement}
            onClick={onIncrement}
            className={segmentButtonClass}
          >
            <SvgPlus className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}

function ClbStepper({
  label,
  icon,
  bgColor,
  current,
  target,
  onCurrentChange,
  onTargetChange,
}: {
  label: string;
  icon: ReactNode;
  bgColor: string;
  current: number;
  target: number;
  onCurrentChange: (v: number) => void;
  onTargetChange: (v: number) => void;
}) {
  return (
    <article
      className="relative z-[1] flex h-full w-full flex-col rounded-[16px] border border-transparent bg-white p-3 transition-colors duration-300 screen744:p-4 hover:border-primary5/60"
      aria-label={`${label} CLB levels`}
    >
      <div className="mb-3 flex items-center justify-center gap-2.5">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px]",
            bgColor
          )}
        >
          {icon}
        </span>
        <h3 className="text-sm font-medium text-text1">{label}</h3>
      </div>

      <div className="flex flex-col gap-2 screen744:flex-row screen744:items-center screen744:gap-2">
        <ClbLevelControl
          label="Current"
          value={current}
          disableDecrement={current <= 4}
          disableIncrement={current >= 12}
          onDecrement={() => onCurrentChange(clampClb(current - 1))}
          onIncrement={() => onCurrentChange(clampClb(current + 1))}
        />
        <div
          className="hidden shrink-0 flex-col items-center justify-center screen744:flex"
          aria-hidden
        >
          <span className="text-xs font-medium text-primary1">→</span>
          <span className="text-[10px] text-text3">+{Math.max(0, target - current)}</span>
        </div>
        <div className="flex items-center justify-center screen744:hidden">
          <span className="rounded-full bg-[#F4F7FF] px-2 py-0.5 text-[10px] font-medium text-primary1">
            +{Math.max(0, target - current)} to goal
          </span>
        </div>
        <ClbLevelControl
          label="Target"
          value={target}
          variant="target"
          disableDecrement={target <= minTargetForCurrent(current)}
          disableIncrement={target >= 12}
          onDecrement={() =>
            onTargetChange(
              clampClb(Math.max(minTargetForCurrent(current), target - 1))
            )
          }
          onIncrement={() => onTargetChange(clampClb(target + 1))}
        />
      </div>
    </article>
  );
}

export default function LearningProfileSetup({
  initialCurrent,
  initialTarget,
  onComplete,
}: Props) {
  const defaults = defaultScores();
  const [currentClb, setCurrentClb] = useState<ClbScores>(
    initialCurrent ?? defaults.current
  );
  const [targetClb, setTargetClb] = useState<ClbScores>(() => {
    const current = initialCurrent ?? defaults.current;
    if (initialTarget) {
      return {
        listening: isValidTargetPair(current.listening, initialTarget.listening)
          ? initialTarget.listening
          : minTargetForCurrent(current.listening),
        reading: isValidTargetPair(current.reading, initialTarget.reading)
          ? initialTarget.reading
          : minTargetForCurrent(current.reading),
        writing: isValidTargetPair(current.writing, initialTarget.writing)
          ? initialTarget.writing
          : minTargetForCurrent(current.writing),
        speaking: isValidTargetPair(current.speaking, initialTarget.speaking)
          ? initialTarget.speaking
          : minTargetForCurrent(current.speaking),
      };
    }
    if (initialCurrent) {
      return {
        listening: minTargetForCurrent(initialCurrent.listening),
        reading: minTargetForCurrent(initialCurrent.reading),
        writing: minTargetForCurrent(initialCurrent.writing),
        speaking: minTargetForCurrent(initialCurrent.speaking),
      };
    }
    return defaults.target;
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setError(null);
    for (const { key, label } of SKILLS) {
      if (!isValidTargetPair(currentClb[key], targetClb[key])) {
        setError(
          currentClb[key] >= 12
            ? `At CLB 12 for ${label}, target stays at 12.`
            : `Target CLB for ${label} must be at least one level above current.`
        );
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch("/api/learning/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentClb, targetClb }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to save profile");
      }
      onComplete();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-text1 screen744:text-3xl">
          Set your CLB levels
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-3 screen744:grid-cols-2 screen744:gap-3 screen1280:gap-4">
        {SKILLS.map(({ key, label, icon, bgColor }) => (
          <ClbStepper
            key={key}
            label={label}
            icon={icon}
            bgColor={bgColor}
            current={currentClb[key]}
            target={targetClb[key]}
            onCurrentChange={(v) => {
              setCurrentClb((prev) => ({ ...prev, [key]: v }));
              setTargetClb((prev) => ({
                ...prev,
                [key]: Math.max(prev[key], minTargetForCurrent(v)),
              }));
            }}
            onTargetChange={(v) =>
              setTargetClb((prev) => ({
                ...prev,
                [key]: Math.max(v, minTargetForCurrent(currentClb[key])),
              }))
            }
          />
        ))}
      </div>

      {error && (
        <p className="mt-4 text-center text-sm text-error1">{error}</p>
      )}

      <div className="mt-8 flex justify-center">
        <Button
          variant="primary"
          size="lg"
          disabled={saving}
          onClick={() => void handleSave()}
          className="min-w-[220px]"
        >
          {saving ? "Saving…" : "Start daily learning"}
        </Button>
      </div>
    </div>
  );
}
