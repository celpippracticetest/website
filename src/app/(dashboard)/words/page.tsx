"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { TUserWordDto } from "@/models/userWords.model";
import { WordDetailsCard } from "@/components/dashboard-app/words/WordDetailsCard";
import RecommendedWordPill from "@/components/dashboard-app/words/RecommendedWordPill";
import WordsLanding from "@/components/dashboard-app/words/WordsLanding";

type StatusFilter = "all" | "mastered" | "learning";
type ComplexityFilter = "all" | "beginner" | "intermediate" | "advanced";

const PAGE_LIMIT = 20;

function WordsSeoIntro() {
    return (
        <section className="bg-white rounded-[24px] border border-slate-200 p-6">
            <h1 className="text-[28px] font-bold text-[#212E42]">
                CELPIP Vocabulary Tracker and Study Builder
            </h1>
            <p className="text-[#526071] text-[16px] mt-3 leading-7">
                Build a stronger CELPIP vocabulary with a focused study workflow.
                Save useful words, review meanings and examples, track what you
                have mastered, and return to difficult vocabulary until it feels
                natural in Reading, Listening, Writing, and Speaking tasks. Developing
                a rich vocabulary is one of the most effective ways to boost your CLB score.
            </p>
            <p className="text-[#526071] text-[16px] mt-3 leading-7">
                This page is designed for active exam preparation. Use it to
                create a personal vocabulary list, review common academic and
                everyday words, and develop the word choice accuracy you need for
                higher CLB scores. Consistent practice and spaced repetition are the
                keys to embedding these words into your active memory.
            </p>
        </section>
    );
}

const WordsPage = () => {
    const { isSignedIn } = useUser();

    const [words, setWords] = useState<TUserWordDto[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadMoreLoading, setLoadMoreLoading] = useState(false);
    const [skip, setSkip] = useState(0);
    const [selectedWordIndex, setSelectedWordIndex] = useState(0);
    const [recommendations, setRecommendations] = useState<string[]>([]);
    const [recoLoading, setRecoLoading] = useState(false);
    const [studyMode, setStudyMode] = useState(false);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [complexityFilter, setComplexityFilter] = useState<ComplexityFilter>("all");

    useEffect(() => {
        fetchWords();
        fetchRecommendations();
    }, []);

    const fetchWords = async (currentSkip = 0, append = false) => {
        if (append) setLoadMoreLoading(true);
        else setLoading(true);

        try {
            const response = await fetch(`/api/user-words?limit=${PAGE_LIMIT}&skip=${currentSkip}`);
            if (!response.ok) return;

            const data = await response.json();
            const normalizedItems = (data.items || []).map((item: TUserWordDto) => ({
                ...item,
                reviewedTimes: item.reviewedTimes ?? 0,
                complexityLevel: item.complexityLevel ?? "intermediate",
            }));

            if (append) {
                setWords((prev) => [...prev, ...normalizedItems]);
            } else {
                setWords(normalizedItems);
                setSelectedWordIndex(0);
            }
            setTotal(data.total ?? 0);
        } catch (error) {
            console.error("Error fetching words:", error);
        } finally {
            setLoading(false);
            setLoadMoreLoading(false);
        }
    };

    const fetchRecommendations = async () => {
        setRecoLoading(true);
        try {
            const response = await fetch("/api/word-recommendations");
            if (!response.ok) return;
            const data = await response.json();
            setRecommendations(data.recommendations || []);
        } catch (error) {
            console.error("Error fetching recommendations:", error);
        } finally {
            setRecoLoading(false);
        }
    };

    const handleLoadMore = () => {
        const nextSkip = skip + PAGE_LIMIT;
        setSkip(nextSkip);
        fetchWords(nextSkip, true);
    };

    const handleAddRecommended = async (word: string) => {
        try {
            const response = await fetch("/api/user-words", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ word }),
            });
            if (!response.ok) return;

            const newWord: TUserWordDto = await response.json();
            const normalizedWord: TUserWordDto = {
                ...newWord,
                reviewedTimes: newWord.reviewedTimes ?? 0,
                complexityLevel: newWord.complexityLevel ?? "intermediate",
            };

            setWords((prev) => [normalizedWord, ...prev]);
            setTotal((prev) => prev + 1);
            setRecommendations((prev) => prev.filter((w) => w !== word));
            fetchRecommendations();
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
            if (!response.ok) return;

            setWords((prev) =>
                prev.map((item) => (item.word === word ? { ...item, isLearned: !currentStatus } : item))
            );
        } catch (error) {
            console.error("Error toggling learned status:", error);
        }
    };

    const handleRecordReview = async (word: string) => {
        try {
            const response = await fetch("/api/user-words", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ word, action: "review" }),
            });
            if (!response.ok) return;

            setWords((prev) =>
                prev.map((item) =>
                    item.word === word
                        ? { ...item, reviewedTimes: (item.reviewedTimes ?? 0) + 1 }
                        : item
                )
            );
        } catch (error) {
            console.error("Error recording review:", error);
        }
    };

    const filteredWords = useMemo(() => {
        return words.filter((item) => {
            const statusOk =
                statusFilter === "all" ||
                (statusFilter === "mastered" && !!item.isLearned) ||
                (statusFilter === "learning" && !item.isLearned);

            const complexity = item.complexityLevel ?? "intermediate";
            const complexityOk = complexityFilter === "all" || complexity === complexityFilter;

            return statusOk && complexityOk;
        });
    }, [words, statusFilter, complexityFilter]);

    const selectedWord = words[selectedWordIndex] || null;

    const startStudyMode = (index?: number) => {
        if (words.length === 0) return;

        if (typeof index === "number") {
            setSelectedWordIndex(index);
        } else {
            const firstLearningIndex = words.findIndex((item) => !item.isLearned);
            setSelectedWordIndex(firstLearningIndex >= 0 ? firstLearningIndex : 0);
        }
        setStudyMode(true);
    };

    const advanceToNext = () => {
        setSelectedWordIndex((prev) => (prev < words.length - 1 ? prev + 1 : prev));
    };

    const goToPrevious = () => {
        setSelectedWordIndex((prev) => (prev > 0 ? prev - 1 : prev));
    };

    if (loading) {
        return (
            <div className="w-full max-w-7xl mx-auto px-4 screen1280:px-0 pt-6 pb-28 screen1280:pb-6 flex flex-col gap-6">
                <WordsSeoIntro />
                <div className="flex justify-center items-center h-64 bg-white rounded-[24px] border border-slate-200">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#0DAA94] border-t-transparent"></div>
                </div>
            </div>
        );
    }

    if (words.length === 0) {
        return (
            <div className="w-full max-w-7xl mx-auto px-4 screen1280:px-0 pt-6 pb-28 screen1280:pb-6 flex flex-col gap-6">
                <WordsSeoIntro />
                <WordsLanding />
                <section className="bg-white rounded-[24px] border border-slate-200 p-6">
                    <h2 className="text-[20px] font-bold text-[#212E42]">
                        Why vocabulary practice matters for CELPIP
                    </h2>
                    <p className="text-[#526071] text-[16px] mt-3 leading-7">
                        Strong vocabulary improves reading speed, listening
                        comprehension, and the clarity of your writing and speaking
                        responses. Tracking words in one place helps you revisit
                        weak areas instead of forgetting them after a single study
                        session.
                    </p>
                </section>
            </div>
        );
    }

    if (studyMode && selectedWord) {
        return (
            <div className="w-full px-4 screen1280:px-0 pt-8 pb-28 screen1280:pb-8">
                <WordDetailsCard
                    word={selectedWord}
                    onNext={advanceToNext}
                    onPrevious={goToPrevious}
                    onToggleMastered={handleToggleLearned}
                    onLearnAgain={advanceToNext}
                    onRecordRevealReview={handleRecordReview}
                    onRecordAdvanceReview={handleRecordReview}
                    hasPrevious={selectedWordIndex > 0}
                    hasNext={selectedWordIndex < words.length - 1}
                    onBackToList={() => setStudyMode(false)}
                    currentIndex={selectedWordIndex}
                    totalWords={words.length}
                />
            </div>
        );
    }

    return (
        <div className="w-full max-w-7xl mx-auto px-4 screen1280:px-0 pt-6 pb-28 screen1280:pb-6 flex flex-col gap-6">
            <WordsSeoIntro />
            <section className="bg-white rounded-[24px] border border-slate-200 p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-[24px] font-bold text-[#212E42]">My Words</h2>
                        <p className="text-[#76808F] text-sm mt-1">Track progress by mastery and complexity level.</p>
                    </div>
                    <button
                        onClick={() => startStudyMode()}
                        className="px-5 py-2.5 rounded-full bg-[#0DAA94] text-white font-semibold hover:bg-[#0b947f] cursor-pointer"
                    >
                        Start Study
                    </button>
                </div>

                <div className="flex flex-wrap items-center gap-3 mt-5">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                        className="px-4 py-2 rounded-full border border-slate-300 text-sm text-[#212E42] bg-white cursor-pointer"
                    >
                        <option value="all">All Status</option>
                        <option value="mastered">Mastered</option>
                        <option value="learning">Learning</option>
                    </select>

                    <select
                        value={complexityFilter}
                        onChange={(e) => setComplexityFilter(e.target.value as ComplexityFilter)}
                        className="px-4 py-2 rounded-full border border-slate-300 text-sm text-[#212E42] bg-white cursor-pointer"
                    >
                        <option value="all">All Complexity</option>
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                    </select>
                </div>

                <div className="mt-5 flex flex-col gap-3">
                    {filteredWords.length === 0 ? (
                        <p className="text-[#76808F]">No words match your current filters.</p>
                    ) : (
                        filteredWords.map((item) => {
                            const originalIndex = words.findIndex((word) => word.id === item.id);
                            const complexity = item.complexityLevel ?? "intermediate";
                            return (
                                <div
                                    key={item.id}
                                    className={`rounded-2xl border px-5 py-4 flex flex-wrap items-center justify-between gap-3 ${item.isLearned
                                        ? "bg-emerald-50 border-emerald-200"
                                        : "bg-slate-50 border-slate-200"
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-[20px] font-bold text-[#212E42] capitalize">{item.word}</span>
                                        <span className="px-3 py-1 rounded-full bg-white border border-slate-200 text-xs font-semibold text-[#526071] uppercase">
                                            {complexity}
                                        </span>
                                        <span className="px-3 py-1 rounded-full bg-white border border-slate-200 text-xs font-semibold text-[#526071]">
                                            Reviews: {item.reviewedTimes ?? 0}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleToggleLearned(item.word, !!item.isLearned)}
                                            className="px-4 py-2 rounded-full bg-blue-50 text-blue-600 text-sm font-semibold cursor-pointer"
                                        >
                                            {item.isLearned ? "Unmark Mastered" : "Mark Mastered"}
                                        </button>
                                        <button
                                            onClick={() => startStudyMode(originalIndex)}
                                            className="px-4 py-2 rounded-full bg-[#212E42] text-white text-sm font-semibold cursor-pointer"
                                        >
                                            Study
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {words.length < total && (
                    <div className="mt-6 flex justify-center">
                        <button
                            onClick={handleLoadMore}
                            disabled={loadMoreLoading}
                            className="px-5 py-2.5 rounded-full bg-slate-100 text-[#212E42] font-semibold disabled:opacity-50 cursor-pointer"
                        >
                            {loadMoreLoading ? "Loading..." : "Load More"}
                        </button>
                    </div>
                )}
            </section>

            <section className="bg-white rounded-[24px] border border-slate-200 p-6">
                <h2 className="text-[20px] font-bold text-[#212E42]">Recommended Words</h2>
                <p className="text-[#76808F] text-sm mt-1">
                    Based on the most reviewed words by all users.
                </p>

                {!isSignedIn ? (
                    <p className="text-[#76808F] mt-4">Sign in to see personalized recommendations.</p>
                ) : recoLoading && recommendations.length === 0 ? (
                    <p className="text-[#76808F] mt-4">Loading recommendations...</p>
                ) : recommendations.length === 0 ? (
                    <p className="text-[#76808F] mt-4">No recommendations available right now.</p>
                ) : (
                    <div className="mt-5 flex flex-wrap gap-3">
                        {recommendations.map((word) => (
                            <RecommendedWordPill key={word} word={word} onAdd={() => handleAddRecommended(word)} />
                        ))}
                    </div>
                )}
            </section>

            <section className="bg-[#F8FAFC] rounded-[24px] border border-slate-200 p-6">
                <h2 className="text-[20px] font-bold text-[#212E42]">Study Section</h2>
                <p className="text-[#76808F] text-sm mt-1">
                    Flashcard mode hides other sections so you can focus on one word at a time.
                </p>
                <div className="mt-4 flex items-center gap-3">
                    <button
                        onClick={() => startStudyMode()}
                        className="px-5 py-2.5 rounded-full bg-[#0DAA94] text-white font-semibold hover:bg-[#0b947f] cursor-pointer"
                    >
                        Resume Study
                    </button>
                    <span className="text-sm text-[#526071]">Total words: {words.length}</span>
                </div>
            </section>
        </div>
    );
};

export default WordsPage;
