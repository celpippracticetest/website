import React, { useState, useEffect } from "react";
import SvgSpeaker from "@/components/icons/Speaker";
import { TUserWordDto } from "@/models/userWords.model";
import { cn } from "@/lib/utils";

interface WordDefinition {
  definition: string;
  example?: string;
  synonyms?: string[];
  collocations?: string[];
}

interface WordDetail {
  phonetics: string;
  complexity_level?: string;
  celpip_tip?: string;
  bonus_exam_strategies?: string[];
  partsOfSpeech: {
    part: string;
    definitions: WordDefinition[];
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
  /** Listen for ← / → to move between words (only one mounted card should). */
  enableKeyboard?: boolean;
}

const levelTone = (level?: string) => {
  const value = (level ?? "").toLowerCase();
  if (value.startsWith("adv")) return "bg-[#FFEDE4] text-[#B4471F]";
  if (value.startsWith("int")) return "bg-[#EEF3FF] text-[#2554D6]";
  return "bg-[#E3F8F5] text-[#0B7D64]";
};

const ChevronIcon = ({ direction }: { direction: "left" | "right" }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={direction === "left" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} />
  </svg>
);

const Chip = ({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "blue" }) => (
  <span
    className={cn(
      "inline-flex items-center h-[28px] px-[10px] rounded-full text-[13px] font-medium",
      tone === "blue" ? "bg-[#EEF3FF] text-[#2554D6]" : "bg-[#F1F4F9] text-[#37465C]",
    )}
  >
    {children}
  </span>
);

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
  enableKeyboard = true,
}) => {
  const [details, setDetails] = useState<WordDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const mastered = !!word.isLearned;

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/word-details?word=${encodeURIComponent(word.word)}`);
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

    fetchDetails();
  }, [word.word]);

  // ← / → move between words (ignored while typing in a field).
  useEffect(() => {
    if (!enableKeyboard) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      if (event.key === "ArrowLeft" && hasPrevious) onPrevious();
      if (event.key === "ArrowRight" && hasNext) onNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enableKeyboard, hasPrevious, hasNext, onPrevious, onNext]);

  const handlePronunciation = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(word.word);
    utterance.lang = "en-US";
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const showCounter = currentIndex !== undefined && totalWords !== undefined && totalWords > 0;

  return (
    <div className="w-full flex flex-col gap-[12px] animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none">
      {/* Mobile top bar: back + counter */}
      {onBack && (
        <div className="flex items-center justify-between screen1280:!hidden">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-[4px] h-[44px] pl-[4px] pr-[12px] -ml-[4px] rounded-full text-[15px] font-semibold text-[#37465C] transition-colors hover:bg-white active:scale-[0.97]"
          >
            <ChevronIcon direction="left" />
            All words
          </button>
          {showCounter && (
            <span className="text-[14px] font-medium text-[#5B6B82]">
              {currentIndex! + 1} of {totalWords}
            </span>
          )}
        </div>
      )}

      <article
        aria-label={`Word details: ${word.word}`}
        className="flex flex-col rounded-[24px] bg-white border border-[#E8EEFB] shadow-[0_20px_44px_-30px_rgba(33,46,66,0.35)] overflow-hidden"
      >
        {/* Header */}
        <header className="flex flex-col gap-[14px] px-[20px] pt-[20px] pb-[18px] screen744:!px-[28px] screen744:!pt-[26px] bg-[linear-gradient(180deg,#F7F9FF_0%,#FFFFFF_100%)] border-b border-[#EEF1F6]">
          <div className="flex flex-wrap items-center justify-between gap-[10px]">
            <div className="flex items-center gap-[8px]">
              {details?.complexity_level && !loading && (
                <span className={cn("inline-flex items-center h-[26px] px-[10px] rounded-full text-[12px] font-bold capitalize", levelTone(details.complexity_level))}>
                  {details.complexity_level}
                </span>
              )}
              {showCounter && !onBack && (
                <span className="text-[13px] font-medium text-[#5B6B82]">
                  Word {currentIndex! + 1} of {totalWords}
                </span>
              )}
            </div>
            <button
              type="button"
              aria-pressed={mastered}
              onClick={() => onToggleMastered(word.word, mastered)}
              className={cn(
                "flex items-center gap-[6px] h-[36px] px-[14px] rounded-full text-[14px] font-semibold border transition-[background-color,color,border-color,transform] duration-200 active:scale-[0.96] motion-reduce:transition-none",
                mastered
                  ? "bg-[#0F9F7F] border-[#0F9F7F] text-white hover:bg-[#0B8A6E]"
                  : "bg-white border-[#C9D5F5] text-[#2554D6] hover:border-[#2554D6] hover:bg-[#F4F7FF]",
              )}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {mastered ? <path d="M5 12l5 5L20 7" /> : <path d="M12 5v14M5 12h14" />}
              </svg>
              {mastered ? "Mastered" : "Mark as mastered"}
            </button>
          </div>

          <div className="flex items-center gap-[14px]">
            <div className="flex flex-col min-w-0">
              <h2 className="m-0 text-[30px] leading-[36px] screen744:!text-[36px] screen744:!leading-[42px] font-bold text-[#212E42] tracking-[-0.02em] break-words">
                {word.word}
              </h2>
              <p className="m-0 mt-[2px] min-h-[20px] text-[15px] text-[#5B6B82] font-medium">
                {loading ? <span className="inline-block w-[90px] h-[12px] rounded-full bg-[#EEF1F6] animate-pulse" /> : details?.phonetics || ""}
              </p>
            </div>
            <button
              type="button"
              onClick={handlePronunciation}
              aria-label={`Hear how to pronounce ${word.word}`}
              className={cn(
                "flex shrink-0 items-center justify-center w-[46px] h-[46px] rounded-full border transition-[transform,background-color,border-color] duration-200 active:scale-95 motion-reduce:transition-none",
                speaking
                  ? "bg-[#2554D6] border-[#2554D6] text-white [&_path]:fill-white"
                  : "bg-white border-[#E3EBFF] text-[#2554D6] [&_path]:fill-[#2554D6] hover:border-[#2554D6] hover:scale-105",
              )}
            >
              <SvgSpeaker />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex flex-col gap-[24px] px-[20px] py-[22px] screen744:!px-[28px] screen744:!py-[26px]">
          {loading ? (
            <div className="flex flex-col gap-[14px]" aria-live="polite" aria-busy="true">
              <span className="sr-only">Loading word details</span>
              {[80, 100, 64, 92].map((w, i) => (
                <span key={i} className="h-[14px] rounded-full bg-[#EEF1F6] animate-pulse" style={{ width: `${w}%` }} />
              ))}
            </div>
          ) : !details || details.partsOfSpeech.length === 0 ? (
            <p className="m-0 text-[15px] text-[#5B6B82]">
              We couldn&apos;t load details for this word right now. Try again in a moment.
            </p>
          ) : (
            <>
              {details.partsOfSpeech.map((pos, idx) => (
                <section key={idx} className="flex flex-col gap-[14px]">
                  <h3 className="m-0 flex items-center gap-[10px] text-[13px] font-bold uppercase tracking-[0.08em] text-[#0B7D64]">
                    {pos.part}
                    <span className="h-px flex-1 bg-[#EEF1F6]" aria-hidden="true" />
                  </h3>
                  <ol className="m-0 p-0 list-none flex flex-col gap-[18px]">
                    {pos.definitions.map((def, dIdx) => (
                      <li key={dIdx} className="flex gap-[12px]">
                        <span className="flex shrink-0 items-center justify-center w-[24px] h-[24px] mt-[1px] rounded-full bg-[#F1F4F9] text-[12px] font-bold text-[#5B6B82]">
                          {dIdx + 1}
                        </span>
                        <div className="flex flex-col gap-[10px] min-w-0">
                          <p className="m-0 text-[16px] leading-[25px] font-medium text-[#212E42] text-pretty">{def.definition}</p>
                          {def.example && (
                            <p className="m-0 pl-[12px] border-l-[3px] border-[#C9D5F5] text-[15px] leading-[23px] italic text-[#37465C] text-pretty">
                              {def.example}
                            </p>
                          )}
                          {!!def.synonyms?.length && (
                            <div className="flex flex-wrap items-center gap-[6px]">
                              <span className="mr-[2px] text-[12px] font-semibold text-[#8A94A6]">Synonyms</span>
                              {def.synonyms.slice(0, 5).map((s) => (
                                <Chip key={s}>{s}</Chip>
                              ))}
                            </div>
                          )}
                          {!!def.collocations?.length && (
                            <div className="flex flex-wrap items-center gap-[6px]">
                              <span className="mr-[2px] text-[12px] font-semibold text-[#8A94A6]">Use it with</span>
                              {def.collocations.slice(0, 4).map((c) => (
                                <Chip key={c} tone="blue">{c}</Chip>
                              ))}
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
              ))}

              {details.celpip_tip && (
                <aside className="flex gap-[12px] p-[16px] rounded-[16px] bg-[#FFF7EE] border border-[#FFE3C7]">
                  <span className="flex shrink-0 items-center justify-center w-[32px] h-[32px] rounded-full bg-white text-[#C2521F]" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.7 1 1.5 1 2.5h6c0-1 .2-1.8 1-2.5A6 6 0 0 0 12 3z" />
                    </svg>
                  </span>
                  <div className="flex flex-col gap-[4px] min-w-0">
                    <span className="text-[13px] font-bold text-[#B4471F]">CELPIP tip</span>
                    <p className="m-0 text-[15px] leading-[23px] text-[#37465C] text-pretty">{details.celpip_tip}</p>
                  </div>
                </aside>
              )}

              {!!details.bonus_exam_strategies?.length && (
                <details className="group/strat rounded-[16px] border border-[#E8EEFB] bg-[#FAFBFE] open:bg-white">
                  <summary className="flex items-center justify-between gap-[10px] min-h-[48px] px-[16px] cursor-pointer list-none text-[14px] font-semibold text-[#212E42] [&::-webkit-details-marker]:hidden">
                    Exam strategies for this word
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-[#5B6B82] transition-transform duration-200 group-open/strat:rotate-180">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </summary>
                  <ul className="m-0 px-[16px] pb-[14px] pl-[34px] flex flex-col gap-[8px] list-disc marker:text-[#9DB4F2]">
                    {details.bonus_exam_strategies.map((s, i) => (
                      <li key={i} className="text-[14px] leading-[22px] text-[#37465C] text-pretty">{s}</li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}
        </div>

        {/* Navigation */}
        <footer className="flex items-center justify-between gap-[10px] px-[16px] py-[12px] screen744:!px-[22px] border-t border-[#EEF1F6] bg-[#FAFBFE]">
          <button
            type="button"
            onClick={onPrevious}
            disabled={!hasPrevious}
            className="flex items-center gap-[4px] h-[44px] pl-[10px] pr-[16px] rounded-full text-[15px] font-semibold text-[#37465C] transition-[background-color,color,transform] duration-200 hover:bg-white hover:text-[#2554D6] active:scale-[0.97] disabled:opacity-35 disabled:pointer-events-none"
          >
            <ChevronIcon direction="left" />
            Previous
          </button>
          {enableKeyboard && <span className="hidden screen1280:!inline text-[12px] text-[#8A94A6]">Use ← → keys</span>}
          <button
            type="button"
            onClick={onNext}
            disabled={!hasNext}
            className="flex items-center gap-[4px] h-[44px] pl-[16px] pr-[10px] rounded-full text-[15px] font-semibold bg-[#2554D6] text-white shadow-[3px_3px_0_0_#759CFF] transition-[background-color,transform,box-shadow] duration-200 hover:bg-[#1E46B8] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-35 disabled:pointer-events-none"
          >
            Next word
            <ChevronIcon direction="right" />
          </button>
        </footer>
      </article>
    </div>
  );
};
