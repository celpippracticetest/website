import React from "react";
import { Check } from "lucide-react";

interface WordPillProps {
    word: string;
    isLearned?: boolean;
    onToggleLearned: () => void;
    onClick?: () => void;
}

const WordPill: React.FC<WordPillProps> = ({ word, isLearned = false, onToggleLearned, onClick }) => {
    return (
        <div
            onClick={onClick}
            className="flex items-center justify-between gap-4 bg-[#E8EBF2] hover:bg-[#DDE1E9] transition-all duration-200 px-6 py-3 rounded-full group cursor-pointer"
        >
            <span className="font-bold text-[#212E42] text-lg select-none capitalize">
                {word}
            </span>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onToggleLearned?.();
                }}
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isLearned
                    ? "bg-[#0DAA94] border-[#0DAA94] text-white"
                    : "bg-white border-white scale-90 group-hover:scale-100"
                    }`}
            >
                {isLearned && <Check size={14} strokeWidth={3} />}
            </button>
        </div>
    );
};

export default WordPill;
