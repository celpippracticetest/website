import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface WordPillProps {
    word: string;
    isLearned?: boolean;
    isSelected?: boolean;
    onToggleLearned: () => void;
    onClick?: () => void;
}

/** A row in the word list: select the word, or toggle "mastered" with the check. */
const WordPill: React.FC<WordPillProps> = ({ word, isLearned = false, isSelected = false, onToggleLearned, onClick }) => {
    return (
        <div
            className={cn(
                "group relative flex items-center gap-[8px] rounded-[14px] border transition-[background-color,border-color,box-shadow] duration-200",
                isSelected
                    ? "bg-[#EEF3FF] border-[#C9D5F5] shadow-[0_8px_20px_-16px_rgba(37,84,214,0.6)]"
                    : "bg-white border-[#E8EEFB] hover:border-[#C9D5F5] hover:bg-[#FAFBFE]",
            )}
        >
            {/* Accent bar for the selected word */}
            <span
                aria-hidden="true"
                className={cn(
                    "absolute left-0 top-[10px] bottom-[10px] w-[3px] rounded-full bg-[#2554D6] transition-opacity duration-200",
                    isSelected ? "opacity-100" : "opacity-0",
                )}
            />
            <button
                type="button"
                onClick={onClick}
                aria-current={isSelected ? "true" : undefined}
                className="flex flex-1 min-w-0 items-center min-h-[52px] pl-[16px] pr-[4px] text-left rounded-[14px] cursor-pointer"
            >
                <span
                    className={cn(
                        "truncate text-[16px] font-semibold capitalize select-none",
                        isSelected ? "text-[#2554D6]" : "text-[#212E42]",
                        isLearned && !isSelected && "text-[#5B6B82]",
                    )}
                >
                    {word}
                </span>
            </button>
            <button
                type="button"
                onClick={onToggleLearned}
                aria-pressed={isLearned}
                aria-label={isLearned ? `Unmark ${word} as mastered` : `Mark ${word} as mastered`}
                title={isLearned ? "Mastered" : "Mark as mastered"}
                className="flex shrink-0 items-center justify-center w-[44px] h-[44px] mr-[4px] rounded-full cursor-pointer"
            >
                <span
                    className={cn(
                        "flex items-center justify-center w-[24px] h-[24px] rounded-full border-2 transition-[background-color,border-color,transform] duration-200 motion-reduce:transition-none",
                        isLearned
                            ? "bg-[#0F9F7F] border-[#0F9F7F] text-white"
                            : "bg-white border-[#C9D5F5] text-transparent group-hover:border-[#0F9F7F] hover:text-[#0F9F7F] hover:scale-110",
                    )}
                >
                    <Check size={14} strokeWidth={3} />
                </span>
            </button>
        </div>
    );
};

export default WordPill;
