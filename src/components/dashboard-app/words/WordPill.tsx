import React from "react";
import { Check } from "lucide-react";

interface WordPillProps {
    word: string;
    isLearned?: boolean;
    onToggleLearned?: () => void;
    onClick?: () => void;
}

const WordPill: React.FC<WordPillProps> = ({ word, isLearned, onToggleLearned, onClick }) => {
    return (
        <div
            className="flex items-center justify-between bg-[#E8EBF2] hover:bg-[#DDE1E9] transition-colors rounded-2xl px-5 py-4 min-w-[200px] cursor-pointer group"
            onClick={onClick}
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
