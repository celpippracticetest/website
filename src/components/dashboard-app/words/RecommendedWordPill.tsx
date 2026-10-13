import React, { useState } from "react";
import SvgPlus from "@/components/icons/Plus";
import clsx from "clsx";

interface RecommendedWordPillProps {
    word: string;
    onAdd: () => void;
}

const RecommendedWordPill: React.FC<RecommendedWordPillProps> = ({ word, onAdd }) => {
    const [isClicked, setIsClicked] = useState(false);

    const handleClick = () => {
        if (isClicked) return;
        setIsClicked(true);
        onAdd();
        // The pill will be removed from DOM by parent, but we keep the state for the brief transition
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            aria-label={`Add ${word} to your words`}
            className={clsx(
                "group flex items-center gap-[8px] h-[44px] pl-[16px] pr-[12px] rounded-full border cursor-pointer whitespace-nowrap",
                "transition-[background-color,border-color,color,transform] duration-200 active:scale-95 motion-reduce:transition-none",
                isClicked
                    ? "bg-[#0F9F7F] border-[#0F9F7F] text-white"
                    : "bg-white border-[#E3EBFF] text-[#212E42] hover:border-[#0F9F7F] hover:bg-[#F2FBF8]",
            )}
        >
            <span className="text-[15px] font-semibold select-none capitalize">{word}</span>
            <span
                className={clsx(
                    "flex items-center justify-center w-[24px] h-[24px] rounded-full transition-[transform,background-color,color] duration-300",
                    isClicked ? "bg-white/20 text-white rotate-90" : "bg-[#E3F8F5] text-[#0F9F7F] group-hover:scale-110",
                )}
            >
                <SvgPlus width={14} height={14} />
            </span>
        </button>
    );
};

export default RecommendedWordPill;
