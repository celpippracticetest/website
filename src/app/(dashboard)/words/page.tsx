"use client";

import React, { useState, useEffect } from "react";
import WordPill from "@/components/dashboard-app/words/WordPill";
import { TUserWordDto } from "@/models/userWords.model";
import SvgChevronDown from "@/components/icons/ChevronDown";
import { WordDetailsCard } from "@/components/dashboard-app/words/WordDetailsCard";

const WordsPage = () => {
    const [words, setWords] = useState<TUserWordDto[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadMoreLoading, setLoadMoreLoading] = useState(false);
    const [skip, setSkip] = useState(0);
    const [selectedWordIndex, setSelectedWordIndex] = useState<number | null>(0);
    const limit = 20;

    useEffect(() => {
        fetchWords();
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
        <div className="pt-8 flex flex-col w-full min-h-screen">
            <div className="pl-20 max-w-7xl flex justify-center items-center flex-col w-full mx-auto">

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#0DAA94] border-t-transparent"></div>
                    </div>
                ) : words.length === 0 ? (
                    <div className="text-center p-12 bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-200 w-full max-w-lg mb-20 mt-10">
                        <p className="text-gray-500 text-lg font-medium">No words added yet. Start practicing to add some!</p>
                    </div>
                ) : (
                    <div className="flex screen1280:flex-row flex-col-reverse justify-between w-full">

                        {selectedWord && (
                            <WordDetailsCard
                                word={selectedWord}
                                onNext={() => setSelectedWordIndex(prev => (prev !== null && prev < words.length - 1) ? prev + 1 : prev)}
                                onPrevious={() => setSelectedWordIndex(prev => (prev !== null && prev > 0) ? prev - 1 : prev)}
                                onToggleMastered={handleToggleLearned}
                                hasPrevious={selectedWordIndex !== null && selectedWordIndex > 0}
                                hasNext={selectedWordIndex !== null && selectedWordIndex < words.length - 1}
                            />
                        )}

                        <div className="flex flex-col gap-8">
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
                )}
            </div>
        </div>
    );
};

export default WordsPage;
