import CircularSkillProgress from "@/components/shared/CircularSkillProgress";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import * as React from "react";
import AudioPlayerV2 from "../listening-practice/components/AudioPlayerV2";
import SvgChevronDown from "@/components/icons/ChevronDown";
import SvgStar from "@/components/icons/Star";
import SvgDanger from "@/components/icons/danger";
import SvgCircleWithDot from "@/components/icons/CircleWithDot";
import SvgMultiplePlus from "@/components/icons/multiplePlus";
import { WordMenu } from "./WordMenu";
import { diffWords } from "diff";
import { useEffect } from "react";
import { useAskBeavoStore } from "@/stores/askBeavoStore";

interface PracticeResultModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: any; // Renamed from result
    type: "WRITING" | "SPEAKING";
    taskContent?: string;
}

const PracticeResultModal = ({
    isOpen,
    onClose,
    data,
    type,
    taskContent,
}: PracticeResultModalProps) => {
    const [activeTab, setActiveTab] = React.useState<"feedback" | "improvements" | "betterVersion">("feedback");
    const [isTaskResponseOpen, setIsTaskResponseOpen] = React.useState(false);
    const [onlyShowCorrect, setOnlyShowCorrect] = React.useState(false);
    const { askAboutWord, setOpen } = useAskBeavoStore();

    // Reset tab when modal opens
    React.useEffect(() => {
        if (isOpen) {
            setActiveTab("feedback");
            setOnlyShowCorrect(false);
        } else {
            // Close Ask Beavo modal when PracticeResult modal closes
            setOpen(false);
        }
    }, [isOpen, setOpen]);

    if (!isOpen) return null;

    const skillScores = {
        coherence: data?.result ? data.result.contentAndCoherence : 0,
        vocabulary: data?.result ? data.result.vocabulary : 0,
        readability: data?.result ? data.result.readabilityAndGrammar : 0,
        fulfillment: data?.result ? data.result.taskFulfillment : 0,
    };

    const maxScore = 12;
    const overallScore = Math.round(
        Object.values(skillScores).reduce((sum: number, score: any) => sum + (typeof score === 'number' ? score : 0), 0) /
        Object.keys(skillScores).length
    );

    const getScoreDescription = (score: number) => {
        if (score >= 8)
            return {
                title: "Excellent and Clear",
                description:
                    "The response addresses all requirements with clear organization, varied vocabulary, and proper language use.",
            };
        if (score >= 6)
            return {
                title: "Good but Limited",
                description:
                    "The response addresses most requirements with adequate organization and vocabulary, but has some language errors.",
            };
        if (score >= 4)
            return {
                title: "Partially Developed",
                description:
                    "The response addresses some requirements but lacks organization and has limited vocabulary with frequent errors.",
            };
        return {
            title: "Incomplete and Unclear",
            description:
                "The response is extremely brief, lacks essential details, and doesn't address the task requirements.",
        };
    };

    const scoreDetails = getScoreDescription(data?.result ? data.result.overall : 0);

    return (
        <>
            <div
                onClick={onClose}
                className="fixed inset-0 z-50 bg-stone-300/80 backdrop-blur-sm transition-all duration-300 animate-in fade-in-0"
            ></div>
            <div
                role="dialog"
                className="fixed z-50 gap-4 bg-background shadow-lg transition ease-in-out animate-in slide-in-from-right duration-500 inset-y-0 right-0 h-full border-l sm:max-w-[550px] w-full max-w-[90vw] flex flex-col p-0 overflow-y-auto"
                tabIndex={-1}
                style={{ pointerEvents: "auto" }}
            >
                <div className="text-[14px] text-muted-foreground border-slate-300 p-6 pb-28 flex flex-col gap-4">
                    <button
                        type="button"
                        className="rounded-sm flex items-center gap-2 text-gray-800 outline-none mb-4"
                        onClick={onClose}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="lucide lucide-arrow-left h-5 w-5"
                        >
                            <path d="m12 19-7-7 7-7"></path>
                            <path d="M19 12H5"></path>
                        </svg>
                        <span className="text-[14px] font-medium">Back</span>
                    </button>

                    {/* Collapsible Task & Response Section */}
                    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white mb-2">
                        <button
                            type="button"
                            onClick={() => setIsTaskResponseOpen(!isTaskResponseOpen)}
                            className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors"
                        >
                            <span className="font-semibold text-slate-900 border-none">Task & Your Response</span>
                            <SvgChevronDown className={`w-5 h-5 text-slate-500 transition-transform duration-200 ${isTaskResponseOpen ? "rotate-180" : ""}`} />
                        </button>

                        {isTaskResponseOpen && (
                            <div className="p-4 pt-0 border-t border-slate-100 flex flex-col gap-4">

                                {taskContent && (
                                    <div className="mt-4">
                                        <h4 className="font-semibold text-sm text-slate-500 mb-2 uppercase tracking-wide">
                                            Task Prompt
                                        </h4>
                                        <p className="text-slate-800 whitespace-pre-line leading-6">
                                            {taskContent}
                                        </p>
                                        <div className="h-px bg-slate-100 w-full mt-6"></div>
                                    </div>
                                )}

                                <div className={`${taskContent ? "mt-0" : "mt-4"} flex flex-col gap-2`}>
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-semibold text-sm text-slate-500 mb-2 uppercase tracking-wide">
                                            Your Response
                                        </h4>
                                    </div>
                                    {type === "WRITING" ? (
                                        <p className="text-slate-700 whitespace-pre-line leading-6 bg-slate-50 p-4 rounded-lg">
                                            {data ? data.text : "Something happened..."}
                                        </p>
                                    ) : (
                                        <div className="mt-2">
                                            <AudioPlayerV2 audioUrl={data?.audioUrl} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="overflow-hidden border rounded-lg">
                        {/* Header section with main score */}
                        <div className="p-6 pb-8 border-b flex flex-col md:flex-row items-center md:items-start gap-6">
                            <div className="w-40 flex-shrink-0">
                                <CircularSkillProgress
                                    label="Score"
                                    score={overallScore}
                                    maxScore={maxScore}
                                />
                            </div>

                            <div className="flex-1">
                                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                                    {scoreDetails.title}
                                </h2>
                                <p className="text-gray-600">{scoreDetails.description}</p>
                            </div>
                        </div>

                        {/* Skills breakdown grid */}
                        <div className="grid grid-cols-2 min-[744px]:grid-cols-4 border-t divide-x divide-y min-[744px]:divide-y-0">
                            <div className="p-6 flex flex-col items-center justify-center h-full">
                                <CircularSkillProgress
                                    label="Coherence"
                                    score={skillScores.coherence}
                                    maxScore={maxScore}
                                />
                            </div>
                            <div className="p-6 flex flex-col items-center justify-center h-full">
                                <CircularSkillProgress
                                    label="Vocabulary"
                                    score={skillScores.vocabulary}
                                    maxScore={maxScore}
                                />
                            </div>
                            <div className="p-6 flex flex-col items-center justify-center h-full">
                                <CircularSkillProgress
                                    label="Readability"
                                    score={skillScores.readability}
                                    maxScore={maxScore}
                                />
                            </div>
                            <div className="p-6 flex flex-col items-center justify-center h-full">
                                <CircularSkillProgress
                                    label="Fulfillment"
                                    score={skillScores.fulfillment}
                                    maxScore={maxScore}
                                />
                            </div>
                        </div>
                    </div>

                    {/* TABBED INTERFACE */}
                    <div className="mt-4">
                        {/* Tab Headers */}
                        <div className="flex flex-col min-[744px]:flex-row gap-4 mb-6 justify-center sticky top-0 z-10 bg-white/95 backdrop-blur-sm p-4 -mx-4 border-b border-sidebar-border/50">
                            <button
                                onClick={() => {
                                    setActiveTab("feedback");
                                    document.getElementById("feedback")?.scrollIntoView({ behavior: "smooth" });
                                }}
                                className={`px-6 py-2.5 w-full rounded-[8px] text-[14px] font-medium transition-all duration-200 text-[#316BFF] ${activeTab === "feedback"
                                    ? "bg-[#D6E6FF]"
                                    : "bg-[#E6F0FF] hover:bg-[#D6E6FF]"
                                    }`}
                            >
                                AI Feedback
                            </button>
                            <button
                                onClick={() => {
                                    setActiveTab("improvements");
                                    document.getElementById("improvements")?.scrollIntoView({ behavior: "smooth" });
                                }}
                                className={`px-6 py-2.5 w-full rounded-[8px] text-[14px] font-medium transition-all duration-200 text-[#F27059] ${activeTab === "improvements"
                                    ? "bg-[#FFDCC0]"
                                    : "bg-[#FFF0E6] hover:bg-[#FFDCC0]"
                                    }`}
                            >
                                Improvements
                            </button>
                            <button
                                onClick={() => {
                                    setActiveTab("betterVersion");
                                    document.getElementById("betterVersion")?.scrollIntoView({ behavior: "smooth" });
                                }}
                                className={`px-6 py-2.5 w-full rounded-[8px] text-[14px] font-medium transition-all duration-200 text-[#0DAA94] ${activeTab === "betterVersion"
                                    ? "bg-[#CCFFF5]"
                                    : "bg-[#E6FFFA] hover:bg-[#CCFFF5]"
                                    }`}
                            >
                                Better Version
                            </button>
                        </div>

                        {/* Tab Content */}
                        <div className="min-h-[200px]">

                            {/* FEEDBACK SECTION */}
                            <div id="feedback" className="flex flex-col gap-2 mb-10 pt-4 scroll-mt-24">
                                <div className="flex items-center gap-3 mb-2">
                                    <SvgStar />
                                    <h4 className="font-bold text-[22px] text-slate-900">
                                        Feedback
                                    </h4>
                                </div>

                                <div className="prose prose-base max-w-none prose-blue text-slate-700 bg-[#F0F6FF] p-6 rounded-[12px]">
                                    <div
                                        dangerouslySetInnerHTML={{
                                            __html: (data?.result?.feedback || "")
                                                .replace(/<\/?feedback>/g, "")
                                                .replace(/\n/g, "<br />")
                                                .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>"),
                                        }}
                                    ></div>
                                </div>
                            </div>

                            {/* IMPROVEMENTS SECTION */}
                            <div id="improvements" className="flex flex-col gap-3 mb-10 pt-4 scroll-mt-24">
                                <div className="flex items-center gap-4">
                                    <SvgDanger />
                                    <h4 className="font-bold text-[22px] text-slate-900 leading-tight">
                                        Recommended Improvements
                                    </h4>
                                </div>

                                <div className="prose prose-base max-w-none text-slate-800 bg-[#FFF5EF] p-8 rounded-[12px] leading-8 text-[16px]">
                                    <span>
                                        {(() => {
                                            // For Writing, data.text contains the user's response.
                                            // For Speaking, data.text might be missing. We can reconstruct it from grammarMistakes 
                                            // (which typically covers the full text in segments) or check if there's a transcript.
                                            // Fallback to joining grammarMistakes if text is missing.
                                            const originalText = data?.text || data?.result?.grammarMistakes?.map((m: { original: string }) => m.original).join(" ") || "";

                                            // The better version is used for the diff.
                                            const improvedText = data?.result?.betterVersion || "";


                                            try {
                                                const diff = diffWords(originalText, improvedText);

                                                return diff.map((part, index) => {
                                                    // Improved (Added) -> Green
                                                    if (part.added) {
                                                        if (onlyShowCorrect) {
                                                            return (
                                                                <span key={index} className="bg-[#B3FFBD] text-slate-900 mx-0.5 px-0.5 rounded-[2px] font-normal">
                                                                    {part.value}
                                                                </span>
                                                            );
                                                        }
                                                        return (
                                                            <span key={index} className="bg-[#B3FFBD] text-slate-900 mx-0.5 px-0.5 rounded-[2px] font-normal">
                                                                {part.value}
                                                            </span>
                                                        );
                                                    }

                                                    // Original (Removed) -> Red
                                                    if (part.removed) {
                                                        if (onlyShowCorrect) return null; // Hide removed parts in "only correct" mode

                                                        return (
                                                            <span key={index} className="bg-[#FFBDB3] text-slate-900 mx-0.5 px-0.5 rounded-[2px] line-through decoration-slate-500/50">
                                                                {part.value}
                                                            </span>
                                                        );
                                                    }

                                                    // Unchanged
                                                    return <span key={index}>{part.value}</span>;
                                                });
                                            } catch (e) {
                                                console.error("Diff calculation failed", e);
                                                return originalText;
                                            }
                                        })()}
                                    </span>
                                </div>

                                <button
                                    onClick={() => setOnlyShowCorrect(!onlyShowCorrect)}
                                    className="mt-2 w-fit px-6 py-3 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-slate-900 font-bold rounded-lg text-[14px] transition-colors"
                                >
                                    {onlyShowCorrect ? "Show Differences" : "Show only the correct version"}
                                </button>
                            </div>

                            {/* BETTER VERSION SECTION */}
                            <div id="betterVersion" className="flex flex-col gap-3 mb-10 pt-4 scroll-mt-24">
                                <div className="flex items-center gap-4">
                                    <SvgCircleWithDot />
                                    <h4 className="font-bold text-[22px] text-slate-900 leading-tight">
                                        Better Version of Your Response
                                    </h4>
                                </div>

                                <div className="flex flex-col gap-0 text-slate-800 bg-[#F2FFFD] rounded-[12px] overflow-hidden">
                                    {/* Helper Tip */}
                                    {/* <div className="flex items-center justify-center gap-2 p-6 pb-2 pt-8">
                                        <div className="relative inline-flex items-center gap-2 bg-[#E0F2F1] pl-16 pr-6 py-3 rounded-full overflow-visible">
                                            <div className="absolute -left-0 -bottom-0">
                                                <SvgMultiplePlus className="w-[50px] h-[50px] drop-shadow-sm" />
                                            </div>
                                            <span className="text-[14px] font-bold text-slate-900">Click to add words to learn them later.</span>
                                        </div>
                                    </div> */}

                                    {/* Content */}
                                    <div className="prose prose-base max-w-none text-slate-700 p-8 pt-4 leading-8 text-[16px]">
                                        <div>
                                            <div>
                                                {(() => {
                                                    // Mock test data for WordMenu demonstration
                                                    // const mockBetterVersion = `I believe the company should provide better **service** to its clients. We need to find a **resolution** to this problem quickly. The **technical** team is working on **implementing** new **solutions** that will improve our overall **performance**. It's **essential** to maintain **effective** communication throughout this process.`;

                                                    const textToRender = data?.result?.betterVersion || '';

                                                    return textToRender.split(/(\*\*.*?\*\*)/g).map((part, index) => {
                                                        if (part.startsWith("**") && part.endsWith("**")) {
                                                            const word = part.slice(2, -2); // Remove **
                                                            return <WordMenu key={index} word={word} onAskAI={askAboutWord} />;
                                                        }
                                                        // Handle line breaks in regular text
                                                        return part.split('\n').map((subPart, subIndex, array) => (
                                                            <React.Fragment key={`${index}-${subIndex}`}>
                                                                {subPart}
                                                                {subIndex < array.length - 1 && <br />}
                                                            </React.Fragment>
                                                        ));
                                                    });
                                                })()}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Audio Player */}
                                    <div className="px-8 pb-8 pt-0">
                                        <AudioPlayerV2
                                            key="better-version-audio"
                                            audioUrl={data?.result?.betterVersionAudio}
                                            textToSpeak={data?.result?.betterVersion || ""}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div >
        </>
    );
};

export default PracticeResultModal;
