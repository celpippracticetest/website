import React, { useState, useEffect } from "react";
import SvgSpeaker from "@/components/icons/Speaker";
import SvgArrowLeft from "@/components/icons/ArrowLeft";
import SvgArrowRight from "@/components/icons/ArrowRight";
import SvgInfo from "@/components/icons/Info";
import { TUserWordDto } from "@/models/userWords.model";
import SvgLearningArrowUp from "@/components/icons/LearningArrowUp";
import clsx from "clsx";

interface WordDetail {
    phonetics: string;
    partsOfSpeech: {
        part: string;
        definitions: {
            definition: string;
            example?: string;
        }[];
    }[];
}

interface WordDetailsCardProps {
    word: TUserWordDto;
    onNext: () => void;
    onPrevious: () => void;
    onToggleMastered: (word: string, status: boolean) => void;
    hasPrevious: boolean;
    hasNext: boolean;
}

export const WordDetailsCard: React.FC<WordDetailsCardProps> = ({
    word,
    onNext,
    onPrevious,
    onToggleMastered,
    hasPrevious,
    hasNext,
}) => {
    const [details, setDetails] = useState<WordDetail | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDetails = async () => {
            setLoading(true);
            try {
                const response = await fetch(`/api/word-details?word=${word.word}`);
                if (response.ok) {
                    const data = await response.json();
                    setDetails(data);
                }
            } catch (error) {
                console.error("Error fetching word details:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [word.word]);

    const handlePronunciation = () => {
        const utterance = new SpeechSynthesisUtterance(word.word);
        utterance.lang = "en-US";
        window.speechSynthesis.speak(utterance);
    };

    return (
        <div className="w-full flex flex-col items-center mt-20 transition-all duration-500 animate-in fade-in slide-in-from-bottom-8">
            {/* Mastered Toggle at Top */}
            <div className="mb-8">
                <button
                    onClick={() => onToggleMastered(word.word, !!word.isLearned)}
                    className={clsx(
                        "flex items-center gap-2 font-bold px-6 py-3 rounded-full transition-all active:scale-95 shadow-sm hover:shadow-md",
                        word.isLearned
                            ? "text-blue-600 bg-blue-50 border border-blue-200"
                            : "text-gray-400 bg-white border border-gray-200 hover:text-gray-500"
                    )}
                >
                    <SvgLearningArrowUp />
                    <span>Mastered</span>
                </button>
            </div>

            <div className="relative flex items-center justify-center w-full max-w-5xl px-4">
                {/* Previous Button */}
                <button
                    onClick={onPrevious}
                    disabled={!hasPrevious}
                    className="absolute left-0 lg:-left-20 flex flex-col items-center gap-2 group disabled:opacity-30 disabled:cursor-not-allowed transition-transform hover:-translate-x-1"
                >
                    <div className="flex items-center gap-2 text-[#FF7E67] font-bold text-lg">
                        <SvgArrowLeft />
                        <span>Previous</span>
                    </div>
                </button>

                {/* Main Card */}
                <div className="bg-white rounded-[40px] shadow-[0_30px_60px_rgba(0,0,0,0.08)] w-full max-w-2xl overflow-hidden border border-gray-100 flex flex-col">
                    {/* Card Header */}
                    <div className="p-12 text-center bg-gray-50/30">
                        <div className="flex items-center justify-center gap-5 mb-3">
                            <h2 className="text-[48px] font-bold text-[#212E42] tracking-tight">{word.word}</h2>
                            <button
                                onClick={handlePronunciation}
                                className="p-3 transition-all hover:scale-110 active:scale-95 bg-white shadow-sm hover:shadow-md rounded-full border border-gray-100 text-[#212E42]"
                            >
                                <SvgSpeaker />
                            </button>
                        </div>
                        <p className="text-[22px] text-gray-500 font-medium tracking-wide">
                            {loading ? "..." : details?.phonetics || ""}
                        </p>
                    </div>

                    <div className="h-px bg-slate-200 w-full" />

                    {/* Card Content */}
                    <div className="p-12 pt-8 flex-1">
                        {loading ? (
                            <div className="py-24 space-y-4">
                                <div className="flex justify-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-[3px] border-[#0DAA94] border-t-transparent" />
                                </div>
                                <p className="text-center text-gray-400 font-medium animate-pulse">Fetching word details...</p>
                            </div>
                        ) : (
                            <div className="space-y-10">
                                {details?.partsOfSpeech.map((pos, idx) => (
                                    <div key={idx} className="group">
                                        <h3 className="text-[20px] italic font-bold text-[#212E42] mb-5 border-l-4 border-[#0DAA94] pl-4">{pos.part}</h3>
                                        <div className="space-y-6">
                                            {pos.definitions.map((def, dIdx) => (
                                                <div key={dIdx} className="text-[#4A5568] leading-relaxed text-lg">
                                                    <div className="flex gap-3">
                                                        <span className="font-bold text-gray-300">{dIdx + 1}.</span>
                                                        <div className="space-y-2">
                                                            <p className="font-medium text-slate-700">{def.definition}</p>
                                                            {def.example && (
                                                                <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
                                                                    <p className="text-[16px] text-slate-600 italic">
                                                                        <span className="font-bold text-blue-400 mr-2">Example:</span>
                                                                        {def.example}
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {idx < details.partsOfSpeech.length - 1 && (
                                            <div className="mt-10 h-px bg-slate-100 w-full" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Next Button */}
                <button
                    onClick={onNext}
                    disabled={!hasNext}
                    className="absolute right-0 lg:-right-20 flex flex-col items-center gap-2 group disabled:opacity-30 disabled:cursor-not-allowed transition-transform hover:translate-x-1"
                >
                    <div className="flex items-center gap-2 text-[#0DAA94] font-bold text-lg">
                        <span>Next</span>
                        <SvgArrowRight />
                    </div>
                </button>
            </div>

            {/* Word Info Label at Bottom */}
            <div className="mt-12 mb-20 flex items-center gap-3 text-[#B76DE5] font-bold text-lg bg-[#B76DE5]/5 px-6 py-3 rounded-full border border-[#B76DE5]/20">
                <SvgInfo />
                <span>Word Information</span>
            </div>
        </div>
    );
};
