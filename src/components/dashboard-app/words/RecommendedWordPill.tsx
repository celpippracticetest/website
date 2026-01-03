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
        setIsClicked(true);
        onAdd();
        // The pill will be removed from DOM by parent, but we keep the state for the brief transition
    };

    return (
        <div
            onClick={handleClick}
            className={clsx(
                "flex items-center gap-3 transition-all duration-300 px-5 py-2.5 rounded-full group cursor-pointer active:scale-95",
                isClicked ? "bg-[#0DAA94] text-white" : "bg-[#E8EBF2] hover:bg-[#DDE1E9] text-[#76808F]"
            )}
        >
            <span className={clsx(
                "text-[16px] font-medium select-none capitalize transition-colors duration-300",
                isClicked ? "text-white" : "text-[#76808F]"
            )}>
                {word}
            </span>
            <div className={clsx(
                "transition-all duration-300 group-hover:scale-125",
                isClicked ? "text-white rotate-90" : "text-[#0DAA94]"
            )}>
                <SvgPlus width={18} height={18} />
            </div>
        </div>
    );
};

export default RecommendedWordPill;
