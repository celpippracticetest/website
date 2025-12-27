"use client";

import React, { useState, useEffect } from "react";
import WordPill from "@/components/dashboard-app/words/WordPill";
import { TUserWordDto } from "@/models/userWords.model";
import SvgChevronDown from "@/components/icons/ChevronDown";

const WordsPage = () => {
    const [words, setWords] = useState<TUserWordDto[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadMoreLoading, setLoadMoreLoading] = useState(false);
    const [skip, setSkip] = useState(0);
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

    return (
        <div className="pt-8 flex flex-col w-full">
            <div className="px-20 max-w-7xl flex justify-center items-center flex-col w-full">
                <div className="mb-10 flex justify-start w-full">
                    <h1 className="text-[32px] font-bold text-[#212E42]">Added Words</h1>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#0DAA94] border-t-transparent"></div>
                    </div>
                ) : words.length === 0 ? (
                    <div className="text-center p-8 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 w-fit">
                        <p className="text-gray-500 text-lg">No words added yet. Start practicing to add some!</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {words.map((item) => (
                                <WordPill
                                    key={item.id}
                                    word={item.word}
                                    isLearned={item.isLearned}
                                    onToggleLearned={() => handleToggleLearned(item.word, !!item.isLearned)}
                                />
                            ))}
                        </div>

                        {words.length < total && (
                            <div className="mt-12 flex justify-center">
                                <button
                                    onClick={handleLoadMore}
                                    disabled={loadMoreLoading}
                                    className="flex items-center gap-2 text-[#212E42] hover:text-[#0DAA94] transition-colors font-medium group disabled:opacity-50"
                                >
                                    {loadMoreLoading ? "Loading..." : "Load more"}
                                    <div className="transition-transform group-hover:translate-y-1">
                                        <SvgChevronDown />
                                    </div>
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default WordsPage;
