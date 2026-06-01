"use client";

import React from "react";
import { Popover } from "radix-ui";
import SvgCheckCircle from "@/components/icons/CheckCircle";
import SvgCircle from "@/components/icons/Circle";
import { cn } from "@/lib/utils";

interface ReadingPassageDropdownProps {
  questionNumber: number;
  choices: { id: string; text: string }[];
  selectedChoiceId?: string;
  onSelect: (choiceId: string) => void;
  triggerClassName?: string;
}

const ReadingPassageDropdown = ({
  questionNumber,
  choices,
  selectedChoiceId,
  onSelect,
  triggerClassName,
}: ReadingPassageDropdownProps) => {
  const selectedChoiceText = choices.find((c) => c.id === selectedChoiceId)?.text;
  const triggerLabel = selectedChoiceText
    ? `${questionNumber}. ${selectedChoiceText}`
    : `${questionNumber}...`;

  return (
    <Popover.Root>
      <Popover.Trigger
        className={cn(
          "PopoverTrigger mx-1 inline-flex min-h-9 cursor-pointer items-center rounded-lg border border-secondary2/30 bg-secondary5 px-3 py-1.5 font-body text-sm font-semibold leading-none text-text1 touch-manipulation transition-colors hover:border-secondary2/50 hover:bg-secondary6",
          triggerClassName
        )}
      >
        {triggerLabel}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="PopoverContent z-50 w-72 rounded-xl border border-outline bg-white p-2 shadow-lg outline-none"
          sideOffset={6}
          align="start"
        >
          <div className="flex flex-col gap-1.5">
            {choices.map((choice) => {
              const isSelected = selectedChoiceId === choice.id;

              return (
                <Popover.Close asChild key={choice.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(choice.id)}
                    className={cn(
                      "flex w-full items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary1/25",
                      isSelected
                        ? "border-primary1/40 bg-primary6"
                        : "border-transparent hover:border-primary1/25 hover:bg-primary6/60"
                    )}
                  >
                    <span className="mt-0.5 shrink-0">
                      {isSelected ? (
                        <SvgCheckCircle className="shrink-0" />
                      ) : (
                        <SvgCircle className="shrink-0" />
                      )}
                    </span>
                    <span className="font-body text-sm leading-snug text-text1">
                      {choice.text}
                    </span>
                  </button>
                </Popover.Close>
              );
            })}
          </div>
          <Popover.Arrow className="fill-white" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

export default ReadingPassageDropdown;
