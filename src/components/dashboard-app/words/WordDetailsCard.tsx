import React, { useEffect, useState } from "react";
import SvgSpeaker from "@/components/icons/Speaker";
import SvgArrowLeft from "@/components/icons/ArrowLeft";
import SvgArrowRight from "@/components/icons/ArrowRight";
import CheckCircle from "@mui/icons-material/CheckCircle";
import RotateLeft from "@mui/icons-material/RotateLeft";
import { TUserWordDto } from "@/models/userWords.model";

interface WordDetail {
    phonetics: string;
    complexity_level?: string;
    celpip_tip?: string;
    bonus_exam_strategies?: string[];
    partsOfSpeech: {
        part: string;
        definitions: {
            definition: string;
            example?: string;
            synonyms?: string[];
            collocations?: string[];
        }[];
    }[];
}

interface WordDetailsCardProps {
    word: TUserWordDto;
    onNext: () => void;
    onPrevious: () => void;
    onToggleMastered: (word: string, status: boolean) => void;
    onLearnAgain: () => void;
    onRecordRevealReview: (word: string) => Promise<void> | void;
    onRecordAdvanceReview: (word: string) => Promise<void> | void;
    hasPrevious: boolean;
    hasNext: boolean;
    onBackToList?: () => void;
    currentIndex?: number;
    totalWords?: number;
}

export const WordDetailsCard: React.FC<WordDetailsCardProps> = ({
    word,
    onNext,
    onPrevious,
    onToggleMastered,
    onLearnAgain,
    onRecordRevealReview,
    onRecordAdvanceReview,
    hasPrevious,
    hasNext,
    onBackToList,
    currentIndex,
    totalWords,
}) => {
    const [details, setDetails] = useState<WordDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [isRevealed, setIsRevealed] = useState(false);
    const [revealRecorded, setRevealRecorded] = useState(false);

    useEffect(() => {
        setDetails(null);
        setLoading(false);
        setIsRevealed(false);
        setRevealRecorded(false);
    }, [word.word]);

    const fetchDetails = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/word-details?word=${word.word}`);
            if (response.ok) {
                const data = await response.json();
                setDetails(data);
            } else {
                setDetails(null);
            }
        } catch (error) {
            console.error("Error fetching word details:", error);
            setDetails(null);
        } finally {
            setLoading(false);
        }
    };

    const handleReveal = async () => {
        if (!isRevealed) {
            setIsRevealed(true);
            if (!details) {
                await fetchDetails();
            }
        }

        if (!revealRecorded) {
            setRevealRecorded(true);
            await onRecordRevealReview(word.word);
        }
    };

    const handleAdvance = async (advance: () => void) => {
        await onRecordAdvanceReview(word.word);
        advance();
    };

    const handlePronunciation = () => {
        const utterance = new SpeechSynthesisUtterance(word.word);
        utterance.lang = "en-US";
        window.speechSynthesis.speak(utterance);
    };
    return (
        <div className="w-full max-w-4xl mx-auto flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {onBackToList && (
                        <button
                            onClick={onBackToList}
                            className="px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-[#212E42] text-sm font-semibold cursor-pointer"
                        >
                            Exit Study
                        </button>
                    )}
                    <span className="text-sm text-[#76808F] font-semibold">
                        {currentIndex !== undefined && totalWords !== undefined ? `${currentIndex + 1}/${totalWords}` : ""}
                    </span>
                </div>
                <span className="text-sm text-[#76808F] font-semibold">Reviewed: {word.reviewedTimes ?? 0}</span>
            </div>

            <div className="bg-white rounded-[32px] border border-slate-200 shadow-[0_10px_40px_rgba(2,6,23,0.08)]">
                <div className="p-8 border-b border-slate-100 flex items-center justify-center gap-4">
                    <h2 className="text-[32px] font-bold text-[#212E42] capitalize">{word.word}</h2>
                    <button
                        onClick={handlePronunciation}
                        className="p-3 rounded-full border border-slate-200 hover:bg-slate-50 text-[#212E42] cursor-pointer"
                    >
                        <SvgSpeaker />
                    </button>
                </div>

                {!isRevealed ? (
                    <div className="p-10 flex flex-col items-center gap-6">
                        <p className="text-[#526071] text-lg">Say the meaning out loud before you reveal it.</p>
                        <button
                            onClick={handleReveal}
                            className="px-6 py-3 rounded-full bg-[#0DAA94] text-white font-semibold hover:bg-[#0b947f] cursor-pointer"
                        >
                            Reveal Meaning
                        </button>
                    </div>
                ) : (
                    <div className="p-8">
                        <div className="flex items-center gap-3 mb-4">
                            <p className="text-sm text-gray-500 font-medium">{loading ? "Loading..." : details?.phonetics || ""}</p>
                            {!loading && (
                                <span className="px-3 py-1 rounded-full bg-violet-50 border border-violet-200 text-violet-700 text-xs font-semibold uppercase">
                                    {details?.complexity_level || word.complexityLevel || "Intermediate"}
                                </span>
                            )}
                        </div>
                        {loading ? (
                            <div className="py-10 text-center text-[#76808F]">Fetching word details...</div>
                        ) : (
                            <div className="space-y-8 max-h-[48vh] overflow-y-auto pr-2">
                                {details?.partsOfSpeech?.map((pos, idx) => (
                                    <div key={idx}>
                                        <h3 className="text-[20px] italic font-bold text-[#212E42] mb-3">{pos.part}</h3>
                                        <div className="space-y-4">
                                            {pos.definitions.map((def, dIdx) => (
                                                <div key={dIdx} className="text-[#4A5568]">
                                                    <p className="font-medium">{dIdx + 1}. {def.definition}</p>
                                                    {def.example && (
                                                        <p className="text-[15px] text-[#64748b] italic mt-1">Example: {def.example}</p>
                                                    )}
                                                    {def.synonyms && def.synonyms.length > 0 && (
                                                        <div className="mt-2">
                                                            <span className="text-xs font-semibold text-[#526071]">Synonyms:</span>
                                                            <div className="flex flex-wrap gap-2 mt-1">
                                                                {def.synonyms.map((synonym, sIdx) => (
                                                                    <span
                                                                        key={`${synonym}-${sIdx}`}
                                                                        className="px-2 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-xs font-medium"
                                                                    >
                                                                        {synonym}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {def.collocations && def.collocations.length > 0 && (
                                                        <div className="mt-2">
                                                            <span className="text-xs font-semibold text-[#526071]">Collocations:</span>
                                                            <div className="flex flex-wrap gap-2 mt-1">
                                                                {def.collocations.map((collocation, cIdx) => (
                                                                    <span
                                                                        key={`${collocation}-${cIdx}`}
                                                                        className="px-2 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium"
                                                                    >
                                                                        {collocation}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}

                                {details?.celpip_tip && (
                                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                                        <h4 className="text-sm font-bold text-amber-800 mb-1">CELPIP Tip</h4>
                                        <p className="text-sm text-amber-900">{details.celpip_tip}</p>
                                    </div>
                                )}

                                {details?.bonus_exam_strategies && details.bonus_exam_strategies.length > 0 && (
                                    <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200">
                                        <h4 className="text-sm font-bold text-purple-800 mb-2">Bonus Exam Strategies</h4>
                                        <ul className="list-disc pl-5 space-y-1">
                                            {details.bonus_exam_strategies.map((strategy, idx) => (
                                                <li key={`${strategy}-${idx}`} className="text-sm text-purple-900">
                                                    {strategy}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-3 justify-between">
                <button
                    onClick={onPrevious}
                    disabled={!hasPrevious}
                    className="px-4 py-2 rounded-full bg-rose-50 text-rose-500 font-semibold disabled:opacity-40 flex items-center gap-2 cursor-pointer"
                >
                    <SvgArrowLeft />
                    Back
                </button>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={() => onToggleMastered(word.word, !!word.isLearned)}
                        className="px-4 py-2 rounded-full bg-blue-50 text-blue-600 font-semibold flex items-center gap-2 cursor-pointer"
                    >
                        <CheckCircle sx={{ fontSize: 18 }} />
                        Mastered
                    </button>

                    <button
                        onClick={() => handleAdvance(onLearnAgain)}
                        disabled={!hasNext}
                        className="px-4 py-2 rounded-full bg-amber-50 text-amber-700 font-semibold disabled:opacity-40 cursor-pointer flex items-center gap-2"
                    >
                        <RotateLeft sx={{ fontSize: 16 }} />
                        Learn Again
                    </button>

                    <button
                        onClick={() => handleAdvance(onNext)}
                        disabled={!hasNext}
                        className="px-4 py-2 rounded-full bg-teal-50 text-teal-700 font-semibold disabled:opacity-40 flex items-center gap-2 cursor-pointer"
                    >
                        Next
                        <SvgArrowRight />
                    </button>
                </div>
            </div>
        </div>
    );
};
