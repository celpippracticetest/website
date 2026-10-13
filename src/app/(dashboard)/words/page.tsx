"use client";

import React, { useState, useEffect } from "react";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import WordPill from "@/components/dashboard-app/words/WordPill";
import { TUserWordDto } from "@/models/userWords.model";
import { motion, AnimatePresence } from "framer-motion";
import SvgChevronDown from "@/components/icons/ChevronDown";
import { WordDetailsCard } from "@/components/dashboard-app/words/WordDetailsCard";
import RecommendedWordPill from "@/components/dashboard-app/words/RecommendedWordPill";
import WordsLanding from "@/components/dashboard-app/words/WordsLanding";
import SvgArrowRight from "@/components/icons/ArrowRight";
import { trackEngagement, trackKpi } from "@/lib/analytics";

const WordsPage = () => {
  const { isSignedIn } = useHybridWebUser();
  const [words, setWords] = useState<TUserWordDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadMoreLoading, setLoadMoreLoading] = useState(false);
  const [skip, setSkip] = useState(0);
  const [selectedWordIndex, setSelectedWordIndex] = useState<number | null>(0);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [recoLoading, setRecoLoading] = useState(false);
  const [showMobileDetails, setShowMobileDetails] = useState(false);
  const [flashcardsReviewed, setFlashcardsReviewed] = useState(0);
  const limit = 5;

  useEffect(() => {
    fetchWords();
    fetchRecommendations();
  }, []);

  const fetchWords = async (currentSkip = 0, append = false) => {
    if (append) setLoadMoreLoading(true);
    else setLoading(true);

    try {
      const response = await fetch(
        `/api/user-words?limit=${limit}&skip=${currentSkip}`,
      );
      if (response.ok) {
        const data = await response.json();
        if (append) {
          setWords((prev) => [...prev, ...data.items]);
        } else {
          setWords(data.items);
          if (data.items.length > 0) setSelectedWordIndex(0);
        }
        setTotal(data.total);
      }
    } catch (error) {
      console.error("Error fetching words:", error);
    } finally {
      setLoading(false);
      setLoadMoreLoading(false);
    }
  };

  const handleLoadMore = () => {
    const nextSkip = skip + limit;
    setSkip(nextSkip);
    fetchWords(nextSkip, true);
  };

  const fetchRecommendations = async () => {
    setRecoLoading(true);
    try {
      const response = await fetch("/api/word-recommendations");
      if (response.ok) {
        const data = await response.json();
        setRecommendations(data.recommendations || []);
      }
    } catch (error) {
      console.error("Error fetching recommendations:", error);
    } finally {
      setRecoLoading(false);
    }
  };

  const refillRecommendations = async () => {
    try {
      const response = await fetch("/api/word-recommendations");
      if (response.ok) {
        const data = await response.json();
        const newRecs = data.recommendations || [];
        setRecommendations((prev) => {
          const existing = new Set(prev);
          const uniqueNew = newRecs.filter((w: string) => !existing.has(w));
          if (uniqueNew.length > 0) {
            return [...prev, uniqueNew[0]];
          }
          return prev;
        });
      }
    } catch (error) {
      console.error("Error refilling recommendations:", error);
    }
  };

  const handleAddRecommended = async (word: string) => {
    try {
      const response = await fetch("/api/user-words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word }),
      });
      if (response.ok) {
        // Add to list and remove from recommendations
        const newWord = await response.json();
        setWords((prev) => [newWord, ...prev]);
        setTotal((prev) => prev + 1);
        setRecommendations((prev) => prev.filter((w) => w !== word));

        // Remove the used word and fetch a new one to replace it
        refillRecommendations();
      }
    } catch (error) {
      console.error("Error adding recommended word:", error);
    }
  };

  const handleToggleLearned = async (word: string, currentStatus: boolean) => {
    try {
      const response = await fetch("/api/user-words", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word, isLearned: !currentStatus }),
      });
      if (response.ok) {
        const nextLearned = !currentStatus;
        setWords((prev) =>
          prev.map((w) =>
            w.word === word ? { ...w, isLearned: nextLearned } : w,
          ),
        );
        if (nextLearned) {
          trackEngagement.wordMastered(word, word);
        }
      }
    } catch (error) {
      console.error("Error toggling learned status:", error);
    }
  };

  const selectWordIndex = (index: number) => {
    setSelectedWordIndex(index);
    const word = words[index];
    if (word) {
      trackEngagement.wordViewed(word.word, word.word);
    }
  };

  const advanceFlashcard = (direction: 1 | -1) => {
    setSelectedWordIndex((prev) => {
      if (prev === null) return prev;
      const next = prev + direction;
      if (next < 0 || next >= words.length) {
        if (flashcardsReviewed > 0 || prev > 0) {
          const reviewed = flashcardsReviewed + 1;
          const mastered = words.filter((w) => w.isLearned).length;
          trackKpi.vocabPracticeComplete({
            setId: "user_words",
            cardsReviewed: reviewed,
            accuracy: words.length
              ? Math.round((mastered / words.length) * 100)
              : undefined,
          });
        }
        return prev;
      }
      setFlashcardsReviewed((n) => n + 1);
      const word = words[next];
      if (word) trackEngagement.wordViewed(word.word, word.word);
      return next;
    });
  };

  const handleViewFlashcards = () => {
    if (words.length > 0) {
      let randomIndex = Math.floor(Math.random() * words.length);
      // Try to pick a different word if possible
      if (words.length > 1 && randomIndex === selectedWordIndex) {
        randomIndex = (randomIndex + 1) % words.length;
      }
      selectWordIndex(randomIndex);
      setShowMobileDetails(true);
      setFlashcardsReviewed(0);
    }
  };

  const selectedWord =
    selectedWordIndex !== null && words.length > 0
      ? words[selectedWordIndex]
      : null;


  const masteredCount = words.filter((w) => w.isLearned).length;
  const masteredPercent = words.length ? Math.round((masteredCount / words.length) * 100) : 0;

  const loadMoreButton =
    words.length < total ? (
      <button
        type="button"
        onClick={handleLoadMore}
        disabled={loadMoreLoading}
        className="group flex items-center justify-center gap-[6px] w-full h-[44px] mt-[4px] rounded-[12px] text-[14px] font-semibold text-[#2554D6] transition-colors hover:bg-[#F4F7FF] disabled:opacity-60 disabled:cursor-wait"
      >
        {loadMoreLoading ? "Loading..." : `Load more (${total - words.length} left)`}
        {!loadMoreLoading && (
          <span className="transition-transform duration-200 group-hover:translate-y-[2px]">
            <SvgChevronDown />
          </span>
        )}
      </button>
    ) : null;

  const wordList = (onSelect: (index: number) => void) => (
    <ul className="m-0 p-0 list-none flex flex-col gap-[8px]">
      {words.map((item, index) => (
        <li key={item.id}>
          <WordPill
            word={item.word}
            isLearned={item.isLearned}
            isSelected={selectedWordIndex === index}
            onToggleLearned={() => handleToggleLearned(item.word, !!item.isLearned)}
            onClick={() => onSelect(index)}
          />
        </li>
      ))}
    </ul>
  );

  const cardProps = selectedWord && selectedWordIndex !== null
    ? {
        word: selectedWord,
        onNext: () => advanceFlashcard(1),
        onPrevious: () => advanceFlashcard(-1),
        onToggleMastered: handleToggleLearned,
        hasPrevious: selectedWordIndex > 0,
        hasNext: selectedWordIndex < words.length - 1,
        currentIndex: selectedWordIndex,
        totalWords: total,
      }
    : null;

  // Normal document flow at every size (no viewport-height maths), so sections
  // can never overlap; only the desktop word list scrolls on its own.
  return (
    <div className="w-full pb-[112px] screen1280:pb-[48px]">
      <div className="mx-auto w-full max-w-[1180px] px-[16px] screen744:px-[24px] screen1280:px-0 flex flex-col gap-[20px] screen1280:gap-[28px]">
        {loading ? (
          <div className="flex flex-col gap-[16px] pt-[8px]" aria-busy="true" aria-live="polite">
            <span className="sr-only">Loading your words</span>
            <span className="h-[28px] w-[180px] rounded-full bg-white animate-pulse" />
            <div className="grid screen1280:grid-cols-[340px_minmax(0,1fr)] gap-[20px]">
              <div className="h-[320px] rounded-[24px] bg-white animate-pulse" />
              <div className="hidden screen1280:block h-[420px] rounded-[24px] bg-white animate-pulse" />
            </div>
          </div>
        ) : words.length === 0 ? (
          <WordsLanding />
        ) : (
          <>
            {/* Header + progress */}
            {!showMobileDetails && (
              <div className="flex flex-col gap-[14px] pt-[4px]">
                <div className="flex flex-wrap items-end justify-between gap-[12px]">
                  <div className="flex flex-col gap-[4px]">
                    <h1 className="m-0 text-[24px] leading-[31px] screen744:!text-[28px] screen744:!leading-[36px] font-bold text-[#212E42]">
                      Your words
                    </h1>
                    <p className="m-0 text-[14px] text-[#5B6B82]">
                      <b className="font-semibold text-[#212E42]">{total}</b> saved ·{" "}
                      <b className="font-semibold text-[#0B7D64]">{masteredCount}</b> mastered
                    </p>
                  </div>
                  {selectedWord && (
                    <button
                      type="button"
                      onClick={handleViewFlashcards}
                      className="screen1280:hidden flex items-center gap-[8px] h-[44px] px-[18px] rounded-full bg-[#2554D6] text-white text-[15px] font-semibold shadow-[3px_3px_0_0_#759CFF] transition-[background-color,transform,box-shadow] duration-200 hover:bg-[#1E46B8] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                    >
                      Study flashcards
                      <SvgArrowRight />
                    </button>
                  )}
                </div>
                <div
                  role="progressbar"
                  aria-label="Words mastered"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={masteredPercent}
                  className="h-[6px] w-full max-w-[420px] rounded-full bg-[#E3E8F2] overflow-hidden"
                >
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#0F9F7F,#0B7D64)] transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                    style={{ width: `${masteredPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Desktop: list + details side by side */}
            <div className="hidden screen1280:grid grid-cols-[340px_minmax(0,1fr)] gap-[28px] items-start">
              <aside
                aria-label="Your word list"
                className="sticky top-[112px] flex flex-col gap-[10px] p-[14px] rounded-[24px] bg-white border border-[#E8EEFB]"
              >
                <div className="flex items-center justify-between px-[6px] pt-[2px]">
                  <h2 className="m-0 text-[13px] font-bold uppercase tracking-[0.08em] text-[#8A94A6]">
                    Added words
                  </h2>
                  <span className="text-[12px] font-semibold text-[#5B6B82]">{words.length} of {total}</span>
                </div>
                <div className="max-h-[calc(100dvh-260px)] min-h-[200px] overflow-y-auto pr-[2px] -mr-[2px] scrollbar-thin">
                  {wordList(selectWordIndex)}
                  {loadMoreButton}
                </div>
              </aside>
              <div className="min-w-0">{cardProps && <WordDetailsCard {...cardProps} />}</div>
            </div>

            {/* Mobile & tablet: list, then a full-card view */}
            <div className="screen1280:hidden">
              <AnimatePresence mode="wait" initial={false}>
                {!showMobileDetails ? (
                  <motion.div
                    key="list"
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col gap-[10px] p-[12px] rounded-[24px] bg-white border border-[#E8EEFB]"
                  >
                    <h2 className="m-0 px-[6px] pt-[4px] text-[13px] font-bold uppercase tracking-[0.08em] text-[#8A94A6]">
                      Added words
                    </h2>
                    {wordList((index) => {
                      selectWordIndex(index);
                      setShowMobileDetails(true);
                    })}
                    {loadMoreButton}
                  </motion.div>
                ) : (
                  <motion.div
                    key="details"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16 }}
                    transition={{ duration: 0.2 }}
                  >
                    {cardProps && (
                      <WordDetailsCard
                        key={cardProps.word.word}
                        {...cardProps}
                        enableKeyboard={false}
                        onBack={() => setShowMobileDetails(false)}
                      />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}

        {/* Recommended words */}
        {isSignedIn && words.length > 0 && !showMobileDetails && (
          <section
            aria-labelledby="recommended-words-heading"
            className="flex flex-col gap-[14px] p-[18px] screen744:p-[24px] rounded-[24px] bg-[linear-gradient(135deg,#F7F9FF_0%,#F2FBF8_100%)] border border-[#E3EBFF]"
          >
            <div className="flex flex-col gap-[2px]">
              <h2 id="recommended-words-heading" className="m-0 text-[17px] screen744:text-[18px] font-bold text-[#212E42]">
                Recommended for you
              </h2>
              <p className="m-0 text-[14px] text-[#5B6B82]">Useful CELPIP words. Tap one to add it to your list.</p>
            </div>
            <div className="flex flex-wrap gap-[10px]">
              {recoLoading && recommendations.length === 0 ? (
                <div className="flex items-center gap-[10px] text-[14px] text-[#5B6B82]" aria-live="polite">
                  <span className="w-[18px] h-[18px] rounded-full border-2 border-[#0F9F7F] border-t-transparent animate-spin" />
                  Finding words for you...
                </div>
              ) : recommendations.length > 0 ? (
                <AnimatePresence mode="popLayout">
                  {recommendations.map((word) => (
                    <motion.div
                      key={word}
                      layout
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
                      className="shrink-0"
                    >
                      <RecommendedWordPill word={word} onAdd={() => handleAddRecommended(word)} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              ) : (
                <p className="m-0 text-[14px] text-[#8A94A6]">No recommendations right now. Check back soon.</p>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default WordsPage;
