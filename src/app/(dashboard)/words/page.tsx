"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import WordPill from "@/components/dashboard-app/words/WordPill";
import { TUserWordDto } from "@/models/userWords.model";
import SvgChevronDown from "@/components/icons/ChevronDown";
import { WordDetailsCard } from "@/components/dashboard-app/words/WordDetailsCard";
import RecommendedWordPill from "@/components/dashboard-app/words/RecommendedWordPill";
import WordsLanding from "@/components/dashboard-app/words/WordsLanding";
import { Button } from "@/components/v2/Button";
import SvgArrowRight from "@/components/icons/ArrowRight";

const WordsPage = () => {
    const { isSignedIn } = useUser();
    const [words, setWords] = useState<TUserWordDto[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadMoreLoading, setLoadMoreLoading] = useState(false);
    const [skip, setSkip] = useState(0);
    const [selectedWordIndex, setSelectedWordIndex] = useState<number | null>(0);
    const [recommendations, setRecommendations] = useState<string[]>([]);
    const [recoLoading, setRecoLoading] = useState(false);
    const [showMobileDetails, setShowMobileDetails] = useState(false);
    const limit = 20;

    useEffect(() => {
        fetchWords();
        fetchRecommendations();
    }, []);

    const fetchWords = async (currentSkip = 0, append = false) => {
        if (append) setLoadMoreLoading(true);
        else setLoading(true);

        try {
            const response = await fetch(`/api/user-words?limit=${limit}&skip=${currentSkip}`);
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
                console.log("Recommendations Data:", data);
                setRecommendations(data.recommendations || []);
            }
        } catch (error) {
            console.error("Error fetching recommendations:", error);
        } finally {
            setRecoLoading(false);
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

                // If recommendations are low, fetch more
                if (recommendations.length <= 1) {
                    fetchRecommendations();
                }
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
                setWords((prev) =>
                    prev.map((w) => (w.word === word ? { ...w, isLearned: !currentStatus } : w))
                );
            }
        } catch (error) {
            console.error("Error toggling learned status:", error);
        }
    };

    const selectedWord = selectedWordIndex !== null && words.length > 0 ? words[selectedWordIndex] : null;

    return (
        <div className="screen1280:pt-8 flex flex-col w-full min-h-screen">
            <div className={`max-w-7xl flex justify-center items-center flex-col w-full mx-auto ${isSignedIn ? "screen1024:pl-20" : ""}`}>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#0DAA94] border-t-transparent"></div>
                    </div>
                ) : words.length === 0 ? (
                    <WordsLanding />
                ) : (
                    <div className="flex screen1280:flex-row flex-col-reverse justify-between w-full px-4 screen1280:px-0">

                        {/* Word Details Card - Desktop Only */}
                        <div className="hidden screen1280:block">
                            {selectedWord && selectedWordIndex !== null && (
                                <WordDetailsCard
                                    word={selectedWord}
                                    onNext={() => setSelectedWordIndex(prev => (prev !== null && prev < words.length - 1) ? prev + 1 : prev)}
                                    onPrevious={() => setSelectedWordIndex(prev => (prev !== null && prev > 0) ? prev - 1 : prev)}
                                    onToggleMastered={handleToggleLearned}
                                    hasPrevious={selectedWordIndex !== null && selectedWordIndex > 0}
                                    hasNext={selectedWordIndex !== null && selectedWordIndex < words.length - 1}
                                    currentIndex={selectedWordIndex}
                                    totalWords={total}
                                />
                            )}
                        </div>

                        {/* Word List Section */}
                        <div className="flex flex-col gap-8 w-full screen1280:w-auto">
                            {/* Mobile: Card Container or Details View */}
                            <div className="screen1280:hidden">
                                {!showMobileDetails ? (
                                    <div className="bg-white rounded-[32px] p-8 shadow-lg h-[calc(100vh-460px)] overflow-y-auto">
                                        <h1 className="text-[24px] font-bold text-[#212E42] tracking-tight mb-6">Added Words</h1>
                                        <div className="flex flex-col gap-4 w-full">
                                            {words.map((item, index) => (
                                                <WordPill
                                                    key={item.id}
                                                    word={item.word}
                                                    isLearned={item.isLearned}
                                                    onToggleLearned={() => handleToggleLearned(item.word, !!item.isLearned)}
                                                    onClick={() => setSelectedWordIndex(index)}
                                                />
                                            ))}
                                        </div>

                                        {words.length < total && (
                                            <div className="mt-8 flex justify-center">
                                                <button
                                                    onClick={handleLoadMore}
                                                    disabled={loadMoreLoading}
                                                    className="flex items-center gap-2 text-[#76808F] hover:text-[#0DAA94] transition-all font-medium text-md group disabled:opacity-50"
                                                >
                                                    {loadMoreLoading ? "Loading..." : "Load more"}
                                                    <div className="transition-transform group-hover:translate-y-1">
                                                        <SvgChevronDown />
                                                    </div>
                                                </button>
                                            </div>
                                        )}

                                    </div>
                                ) : (
                                    <div>
                                        {selectedWord && selectedWordIndex !== null && (
                                            <WordDetailsCard
                                                word={selectedWord}
                                                onNext={() => setSelectedWordIndex(prev => (prev !== null && prev < words.length - 1) ? prev + 1 : prev)}
                                                onPrevious={() => setSelectedWordIndex(prev => (prev !== null && prev > 0) ? prev - 1 : prev)}
                                                onToggleMastered={handleToggleLearned}
                                                hasPrevious={selectedWordIndex !== null && selectedWordIndex > 0}
                                                hasNext={selectedWordIndex !== null && selectedWordIndex < words.length - 1}
                                                onBack={() => setShowMobileDetails(false)}
                                                currentIndex={selectedWordIndex}
                                                totalWords={total}
                                            />
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Desktop: Simple List */}
                            <div className="hidden screen1280:flex flex-col gap-8">
                                <div className="flex justify-start w-full">
                                    <h1 className="text-[20px] font-bold text-[#212E42] tracking-tight">Added Words</h1>
                                </div>
                                <div className="flex screen1280:flex-col flex-wrap screen1280:mb-0 mb-6 gap-6 w-full">
                                    {words.map((item, index) => (
                                        <WordPill
                                            key={item.id}
                                            word={item.word}
                                            isLearned={item.isLearned}
                                            onToggleLearned={() => handleToggleLearned(item.word, !!item.isLearned)}
                                            onClick={() => setSelectedWordIndex(index)}
                                        />
                                    ))}
                                </div>

                                {words.length < total && (
                                    <div className="mt-16 flex justify-center">
                                        <button
                                            onClick={handleLoadMore}
                                            disabled={loadMoreLoading}
                                            className="flex items-center gap-2 text-[#212E42]/60 hover:text-[#0DAA94] transition-all font-bold text-lg group disabled:opacity-50"
                                        >
                                            {loadMoreLoading ? "Loading..." : "Load more"}
                                            <div className="transition-transform group-hover:translate-y-1">
                                                <SvgChevronDown />
                                            </div>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Recommended Words Section */}
                {isSignedIn && !showMobileDetails && (
                    <div className="w-full">
                        <div className="screen1280:bg-[#EDF0F5] rounded-[32px] p-10 w-full screen1280:shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] screen1280:border screen1280:border-gray-200/50">
                            <h2 className="text-[#76808F] text-[16px] font-medium mb-8">Recommended Words</h2>
                            <div className="flex flex-wrap gap-6">
                                {recoLoading && recommendations.length === 0 ? (
                                    <div className="flex items-center gap-3">
                                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#0DAA94] border-t-transparent"></div>
                                        <span className="text-gray-400 font-medium">Coming up with ideas...</span>
                                    </div>
                                ) : recommendations.length > 0 ? (
                                    recommendations.map((word, idx) => (
                                        <RecommendedWordPill
                                            key={idx}
                                            word={word}
                                            onAdd={() => handleAddRecommended(word)}
                                        />
                                    ))
                                ) : (
                                    <p className="text-gray-400 italic">No recommendations available right now.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* View Flashcards Button */}
                {selectedWord && !showMobileDetails && (
                    <Button className="screen1280:hidden flex" onClick={() => setShowMobileDetails(true)}>
                        View Flashcards <SvgArrowRight />
                    </Button>
                )}
            </div>
        </div>
    );
};

export default WordsPage;
