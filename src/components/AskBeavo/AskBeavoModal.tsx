"use client";

import React, { useState, useEffect, useRef } from "react";
import { useUserContext } from "@/hooks/useUserContext";
import SvgClose from "../icons/Close";
import SvgChatBotSend from "../icons/ChatBotSend";
import { useAskBeavoStore } from "@/stores/askBeavoStore";

interface Message {
    id: string;
    type: "user" | "assistant";
    content: string;
    timestamp: Date;
}

const AskBeavoModal: React.FC = () => {
    const { isOpen, setOpen, initialMessage } = useAskBeavoStore();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const userContext = useUserContext();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom whenever messages or loading state changes
    useEffect(() => {
        if (messagesEndRef.current) {
            const container = messagesEndRef.current;
            container.scrollTop = container.scrollHeight;
        }
    }, [messages, isLoading, isOpen]);

    // Handle initial message from store
    useEffect(() => {
        if (isOpen && initialMessage) {
            setInputText(initialMessage);
            // Auto-send after a short delay to feel more natural
            setTimeout(() => {
                if (initialMessage) {
                    handleSendMessage(initialMessage);
                }
            }, 100);
        }
    }, [isOpen, initialMessage]);

    const handleSendMessage = async (messageOverride?: string) => {
        const messageToSend = messageOverride || inputText.trim();
        if (!messageToSend || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            type: "user",
            content: messageToSend,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputText("");
        setIsLoading(true);

        try {
            const response = await fetch("/api/chatbot", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message: userMessage.content,
                    context: {
                        targetCLB: userContext.targetCLB || "Not specified",
                        currentScores: userContext.mockScores
                            ? `L:${userContext.mockScores.listening || "N/A"} R:${userContext.mockScores.reading || "N/A"
                            } W:${userContext.mockScores.writing || "N/A"} S:${userContext.mockScores.speaking || "N/A"
                            }`
                            : "Not available",
                        scoreSource: userContext.scoreSource || "Not available",
                        answerCounts: userContext.answerCounts
                            ? `Writing: ${userContext.answerCounts.writing || 0}, Speaking: ${userContext.answerCounts.speaking || 0
                            }, Listening: ${userContext.answerCounts.listening || 0
                            }, Reading: ${userContext.answerCounts.reading || 0}`
                            : "No answers available",
                        weakAreas: userContext.weakAreas?.join(", ") || "Not identified",
                        practiceHistory: userContext.practiceHistory
                            ? `${userContext.practiceHistory.totalPractices
                            } practices, avg: ${userContext.practiceHistory.averageScore || "N/A"
                            }`
                            : "Not available",
                    },
                    conversationHistory: messages,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to get response");
            }

            const data = await response.json();

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                type: "assistant",
                content: data.response,
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, assistantMessage]);
        } catch (error) {
            console.error("Error sending message:", error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                type: "assistant",
                content: "Sorry, I encountered an error. Please try again.",
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="
    fixed z-[9999] left-1/2 -translate-x-1/2 bottom-[max(1rem,env(safe-area-inset-bottom))]
    w-[min(700px,calc(100vw-1.5rem))]
    h-[min(715px,calc(100svh-2rem))] max-h-[calc(100svh-2rem)]
    rounded-2xl shadow-2xl overflow-hidden
    p-[2px]
    bg-[length:200%_200%] animate-gradientBorder
    bg-gradient-to-r from-[#F79D65] via-[#759CFF] to-[#F79D65]
  "
        >
            <div className="flex h-full w-full flex-col rounded-[18px] bg-white overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4  text-[#212E42] rounded-t-[16px]">
                    <div className="flex items-center gap-3">
                        <div>
                            <h3 className="font-semibold text-lg">Ask Beavo</h3>
                        </div>
                    </div>
                    <button
                        onClick={() => setOpen(false)}
                        className="cursor-pointer hover:bg-gray-100 rounded-full p-2 transition-colors"
                    >
                        <SvgClose />
                    </button>
                </div>

                <div className="px-[24px]">
                    <div className="h-[1px] bg-[#D5D6D8] w-full"></div>
                </div>

                {/* Example Questions */}
                {messages.length === 0 && (
                    <div className="p-4  overflow-auto">
                        <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                            🔍 Example Questions I Can Help You With:
                        </h4>
                        <div className="space-y-3 text-sm">
                            <div className="bg-white p-3 rounded-lg border border-gray-200">
                                <div className="font-medium text-blue-600 mb-1">
                                    📢 Speaking (Task 1: Giving Advice)
                                </div>
                                <div className="text-gray-600 italic">
                                    "Your friend is moving to a new city. Give some advice
                                    about finding a place to live."
                                </div>
                                <div className="text-gray-500 text-xs mt-1">
                                    You can type your answer, and I'll review it for clarity,
                                    grammar, tone, and vocabulary.
                                </div>
                            </div>

                            <div className="bg-white p-3 rounded-lg border border-gray-200">
                                <div className="font-medium text-green-600 mb-1">
                                    ✍️ Writing (Task 1: Responding to a Survey)
                                </div>
                                <div className="text-gray-600 italic">
                                    "Your city is deciding whether to build a new public
                                    library or a sports complex. Which do you support?"
                                </div>
                                <div className="text-gray-500 text-xs mt-1">
                                    You can write your opinion, and I'll help you refine it.
                                </div>
                            </div>

                            <div className="bg-white p-3 rounded-lg border border-gray-200">
                                <div className="font-medium text-purple-600 mb-1">
                                    👂 Listening / Reading
                                </div>
                                <div className="text-gray-600">
                                    I can simulate practice questions or help you understand
                                    question types, keywords, or strategies
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Messages */}
                <div
                    ref={messagesEndRef}
                    className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 scroll-smooth"
                >
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex ${message.type === "user" ? "justify-end" : "justify-start"
                                }`}
                        >
                            <div
                                className={`max-w-[80%] rounded-2xl px-4 py-3 ${message.type === "user"
                                    ? "bg-gradient-to-r from-[#F79D65] to-[#759CFF] text-white"
                                    : "bg-gray-100 text-gray-900"
                                    }`}
                            >
                                <p className="text-sm whitespace-pre-wrap">
                                    {message.content}
                                </p>
                                <p className="text-xs opacity-70 mt-1">
                                    {message.timestamp.toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </p>
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-gray-100 rounded-2xl px-4 py-3">
                                <div className="flex space-x-1">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                    <div
                                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                                        style={{ animationDelay: "0.1s" }}
                                    ></div>
                                    <div
                                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                                        style={{ animationDelay: "0.2s" }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input */}
                <div className="sticky bottom-0 p-4 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-t border-gray-200">
                    <div className="flex gap-2 relative">
                        <textarea
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Ask me anything about CELPIP..."
                            className="flex-1 p-3 pr-12 rounded-xl border border-gray-300 focus:border-[#6366F1] focus:outline-none resize-none text-sm"
                            rows={2}
                        />
                        <button
                            onClick={() => handleSendMessage()}
                            disabled={!inputText.trim() || isLoading}
                            className={`cursor-pointer px-3 py-2 absolute right-3 top-1/2 -translate-y-1/2 rounded-xl font-medium transition-colors ${inputText.trim() && !isLoading
                                ? " from-[#F79D65] to-[#759CFF] text-white"
                                : " text-gray-400 cursor-not-allowed"
                                }`}
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <SvgChatBotSend />
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AskBeavoModal;
