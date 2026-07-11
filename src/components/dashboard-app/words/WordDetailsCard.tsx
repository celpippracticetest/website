import React, { useState, useEffect } from "react";
import SvgSpeaker from "@/components/icons/Speaker";
import SvgArrowLeft from "@/components/icons/ArrowLeft";
import SvgArrowRight from "@/components/icons/ArrowRight";
import SvgInfo from "@/components/icons/Info";
import { TUserWordDto } from "@/models/userWords.model";
import SvgLearningArrowUp from "@/components/icons/LearningArrowUp";

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
  onBack?: () => void;
  currentIndex?: number;
  totalWords?: number;
}

export const WordDetailsCard: React.FC<WordDetailsCardProps> = ({
  word,
  onNext,
  onPrevious,
  onToggleMastered,
  hasPrevious,
  hasNext,
  onBack,
  currentIndex,
  totalWords,
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
    <div className="w-full screen1280:max-w-[70%] screen1024:max-w-[100%] flex flex-col items-center screen1280:items-stretch justify-start transition-all duration-500 screen1280:animate-none animate-in fade-in slide-in-from-bottom-8 relative flex-1 min-h-0">
      {/* Mobile Header */}
      <div className="w-full block mb-2 shrink-0 screen1280:hidden">
        {/* Top Bar with Back, Title, and Counter */}
        <div className="flex items-center justify-between p-2 screen1280:hidden flex">
          {onBack && (
            <button
              onClick={onBack}
              className="-ml-2 hover:bg-gray-100 rounded-full transition-colors active:scale-95"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M15 18L9 12L15 6"
                  stroke="#212E42"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
          <h2 className="text-[20px] font-semibold text-[#76808F] flex-1 text-center">
            Words
          </h2>
          {currentIndex !== undefined && totalWords !== undefined && (
            <span className="text-[18px] font-medium text-[#76808F]">
              {currentIndex + 1}/{totalWords}
            </span>
          )}
        </div>
      </div>

      <div className="relative flex items-center justify-center w-full px-4 flex-1 min-h-0 overflow-visible">
        {/* Previous Button (Hidden on Tablet/Mobile) */}
        <button
          onClick={onPrevious}
          disabled={!hasPrevious}
          style={{ color: "hsla(9, 85%, 65%, 1)" }}
          className="absolute cursor-pointer left-0 lg:-left-28 hidden screen1280:flex items-center gap-2 group disabled:opacity-30 disabled:cursor-not-allowed transition-all px-6 py-3 rounded-full hover:bg-rose-50"
        >
          <div className="flex items-center gap-2 font-bold text-lg">
            <SvgArrowLeft />
            <span>Prev</span>
          </div>
        </button>

        {/* Main Card with Directional Glows */}
        <div className="relative w-full flex-1 min-h-0 flex flex-col justify-center">
          {/* Shadow Glows */}
          <div className="absolute inset-x-8 inset-y-8 blur-[100px] opacity-70 pointer-events-none z-0">
            {/* Top: Blue */}
            <div className="absolute top-[-50px] left-1/2 -translate-x-1/2 w-[80%] h-[120px] bg-[hsla(223,100%,60%,0.1)] rounded-full" />
            {/* Right: Teal */}
            <div className="absolute right-[-50px] top-1/2 -translate-y-1/2 w-[120px] h-[80%] bg-[hsla(172,86%,36%,0.3)] rounded-full" />
            {/* Left: Rose */}
            <div className="absolute left-[-50px] top-1/2 -translate-y-1/2 w-[120px] h-[80%] bg-[hsla(9,85%,65%,0.3)] rounded-full" />
            {/* Bottom: Rose */}
            <div className="absolute bottom-[-50px] left-1/2 -translate-x-1/2 w-[80%] h-[120px] bg-[hsla(9,85%,65%,0.1)] rounded-full" />
          </div>

          <div className="bg-white rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.06)] w-full border border-gray-100 flex flex-col relative flex-1 min-h-0 h-[calc(100vh-315px)] screen1280:h-full overflow-hidden z-10">
            {/* Card Header */}
            <div className="p-4 text-center bg-gray-50/30 relative shrink-0">
              <div className="flex items-center justify-center gap-5 mb-3 screen1280:justify-between screen1280:px-2">
                <button
                  onClick={() => onToggleMastered(word.word, !!word.isLearned)}
                  className="hidden screen1280:flex items-center gap-2 font-bold text-[16px] cursor-pointer transition-all active:scale-95 px-4 py-2 rounded-full hover:bg-blue-200 shrink-0"
                  style={{ color: "hsla(223, 100%, 60%, 1)" }}
                >
                  <SvgLearningArrowUp />
                  <span>Mastered</span>
                </button>

                <div className="flex items-center justify-center gap-5">
                  <h2 className="text-[28px] font-bold text-[#212E42] tracking-tight">
                    {word.word}
                  </h2>
                  <button
                    onClick={handlePronunciation}
                    className="p-3 transition-all hover:scale-110 active:scale-95 bg-white shadow-sm hover:shadow-md rounded-full border border-gray-100 text-[#212E42]"
                  >
                    <SvgSpeaker />
                  </button>
                </div>

                <div
                  className="hidden screen1280:block w-[132px] shrink-0"
                  aria-hidden="true"
                />
              </div>
              <p className="text-[12px] text-gray-500 font-medium tracking-wide">
                {loading ? "..." : details?.phonetics || ""}
              </p>
            </div>

            <div className="h-px bg-slate-200 w-full" />

            {/* Card Content */}
            <div className="p-4 flex-1 overflow-y-auto min-h-0">
              {loading ? (
                <div className="py-24 space-y-4">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-[3px] border-[#0DAA94] border-t-transparent" />
                  </div>
                  <p className="text-center text-gray-400 font-medium animate-pulse">
                    Fetching word details...
                  </p>
                </div>
              ) : (
                <div className="space-y-10">
                  {details?.partsOfSpeech.map((pos, idx) => (
                    <div key={idx} className="group">
                      <h3 className="text-[20px] italic font-bold text-[#212E42] mb-5 border-l-4 border-[#0DAA94] pl-4">
                        {pos.part}
                      </h3>
                      <div className="space-y-6">
                        {pos.definitions.map((def, dIdx) => (
                          <div
                            key={dIdx}
                            className="text-[#4A5568] leading-relaxed text-lg"
                          >
                            <div className="flex gap-3">
                              <span className="font-bold text-gray-300">
                                {dIdx + 1}.
                              </span>
                              <div className="space-y-2">
                                <p className="font-medium text-slate-700">
                                  {def.definition}
                                </p>
                                {def.example && (
                                  <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
                                    <p className="text-[16px] text-slate-600 italic">
                                      <span className="font-bold text-blue-400 mr-2">
                                        Example:
                                      </span>
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

            {/* Internal Navigation Footer (Visible on Tablet/Mobile) */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between screen1280:hidden shrink-0">
              <button
                onClick={onPrevious}
                disabled={!hasPrevious}
                style={{ color: "hsla(9, 85%, 65%, 1)" }}
                className="flex items-center gap-2 font-bold disabled:opacity-30 disabled:cursor-not-allowed px-4 py-2 rounded-full hover:bg-rose-50"
              >
                <SvgArrowLeft />
                <span>Prev</span>
              </button>

              <div className="flex justify-center screen1024:hidden flex">
                <button
                  onClick={() => onToggleMastered(word.word, !!word.isLearned)}
                  className="flex items-center gap-2 font-bold text-[16px] cursor-pointer transition-all active:scale-95 px-4 py-2 rounded-full hover:bg-blue-200"
                  style={{ color: "hsla(223, 100%, 60%, 1)" }}
                >
                  <SvgLearningArrowUp />
                  <span>Mastered</span>
                </button>
              </div>

              <button
                onClick={onNext}
                disabled={!hasNext}
                style={{ color: "hsla(172, 86%, 36%, 1)" }}
                className="flex items-center gap-2 font-bold disabled:opacity-30 disabled:cursor-not-allowed px-4 py-2 rounded-full hover:bg-teal-50"
              >
                <span>Next</span>
                <SvgArrowRight />
              </button>
            </div>
          </div>
        </div>

        {/* Next Button (Hidden on Tablet/Mobile) */}
        <button
          onClick={onNext}
          disabled={!hasNext}
          style={{ color: "hsla(172, 86%, 36%, 1)" }}
          className="absolute cursor-pointer right-0 lg:-right-28 hidden screen1280:flex items-center gap-2 group disabled:opacity-30 disabled:cursor-not-allowed transition-all px-6 py-3 rounded-full hover:bg-teal-50"
        >
          <div className="flex items-center gap-2 font-bold text-lg">
            <span>Next</span>
            <SvgArrowRight />
          </div>
        </button>
      </div>

      {/* Word Info Label at Bottom (Desktop only) */}
      <div className="relative shrink-0 hidden screen1280:block">
        <div
          style={{ color: "hsla(290, 72%, 52%, 1)" }}
          className="flex items-center gap-3 font-bold text-lg px-8 py-4 rounded-full transition-all"
        >
          <SvgInfo />
          <span>Word Information</span>
        </div>
      </div>
    </div>
  );
};
