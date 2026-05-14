"use client";

import React, { useState, useEffect, useRef, type RefObject } from "react";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import { useUserContext } from "@/hooks/useUserContext";
import SvgClose from "../icons/Close";
import SvgChatBotSend from "../icons/ChatBotSend";
import { useAskBeavoStore } from "@/stores/askBeavoStore";
import ReactMarkdown from "react-markdown";

interface Message {
    id: string;
    type: "user" | "assistant";
    content: string;
    timestamp: Date;
}

type AskBeavoChatBodyProps = {
    messages: Message[];
    messagesEndRef: RefObject<HTMLDivElement | null>;
    isLoading: boolean;
    inputText: string;
    setInputText: (v: string) => void;
    handleSendMessage: (messageOverride?: string) => void;
    handleKeyPress: (e: React.KeyboardEvent) => void;
};

function AskBeavoChatBody({
    messages,
    messagesEndRef,
    isLoading,
    inputText,
    setInputText,
    handleSendMessage,
    handleKeyPress,
}: AskBeavoChatBodyProps) {
    return (
        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
            {messages.length === 0 && (
                <div className="overflow-auto p-4">
                    <h4 className="mb-3 flex items-center gap-2 font-semibold text-gray-800">
                        🔍 Example Questions I Can Help You With:
                    </h4>
                    <div className="space-y-3 text-sm">
                        <div className="rounded-lg border border-gray-200 bg-white p-3">
                            <div className="mb-1 font-medium text-blue-600">
                                📢 Speaking (Task 1: Giving Advice)
                            </div>
                            <div className="italic text-gray-600">
                                &quot;Your friend is moving to a new city. Give some advice about
                                finding a place to live.&quot;
                            </div>
                            <div className="mt-1 text-xs text-gray-500">
                                You can type your answer, and I&apos;ll review it for clarity,
                                grammar, tone, and vocabulary.
                            </div>
                        </div>

                        <div className="rounded-lg border border-gray-200 bg-white p-3">
                            <div className="mb-1 font-medium text-green-600">
                                ✍️ Writing (Task 1: Responding to a Survey)
                            </div>
                            <div className="italic text-gray-600">
                                &quot;Your city is deciding whether to build a new public library or
                                a sports complex. Which do you support?&quot;
                            </div>
                            <div className="mt-1 text-xs text-gray-500">
                                You can write your opinion, and I&apos;ll help you refine it.
                            </div>
                        </div>

                        <div className="rounded-lg border border-gray-200 bg-white p-3">
                            <div className="mb-1 font-medium text-purple-600">👂 Listening / Reading</div>
                            <div className="text-gray-600">
                                I can simulate practice questions or help you understand question
                                types, keywords, or strategies
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div
                ref={messagesEndRef}
                className="min-h-0 flex-1 space-y-4 overflow-y-auto scroll-smooth p-4"
            >
                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
                    >
                        <div
                            className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                                message.type === "user"
                                    ? "bg-gradient-to-r from-[#F79D65] to-[#759CFF] text-white"
                                    : "bg-gray-100 text-gray-900"
                            }`}
                        >
                            <div
                                className={`prose prose-sm max-w-none break-words text-sm leading-relaxed ${
                                    message.type === "user"
                                        ? "prose-invert prose-p:text-white prose-headings:text-white prose-strong:text-white prose-li:text-white prose-code:text-white prose-pre:text-white"
                                        : "prose-p:text-gray-900 prose-headings:text-gray-900 prose-strong:text-gray-900 prose-li:text-gray-900"
                                }`}
                            >
                                <ReactMarkdown>{message.content}</ReactMarkdown>
                            </div>
                            <p className="mt-1 text-xs opacity-70">
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
                        <div className="rounded-2xl bg-gray-100 px-4 py-3">
                            <div className="flex space-x-1">
                                <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400"></div>
                                <div
                                    className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
                                    style={{ animationDelay: "0.1s" }}
                                ></div>
                                <div
                                    className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
                                    style={{ animationDelay: "0.2s" }}
                                ></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="sticky bottom-0 border-t border-gray-200 bg-white/90 p-4 backdrop-blur supports-[backdrop-filter]:bg-white/60">
                <div className="relative flex gap-2">
                    <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Ask me anything about CELPIP..."
                        className="flex-1 resize-none rounded-xl border border-gray-300 p-3 pr-12 text-sm focus:border-[#6366F1] focus:outline-none"
                        rows={2}
                    />
                    <button
                        type="button"
                        onClick={() => handleSendMessage()}
                        disabled={!inputText.trim() || isLoading}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer rounded-xl px-3 py-2 font-medium transition-colors ${
                            inputText.trim() && !isLoading
                                ? "bg-gradient-to-r from-[#F79D65] to-[#759CFF] text-white"
                                : "cursor-not-allowed text-gray-400"
                        }`}
                    >
                        {isLoading ? (
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        ) : (
                            <SvgChatBotSend />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

const AskBeavoModal: React.FC = () => {
    const { isOpen, setOpen, initialMessage } = useAskBeavoStore();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const userContext = useUserContext();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (messagesEndRef.current) {
            const container = messagesEndRef.current;
            container.scrollTop = container.scrollHeight;
        }
    }, [messages, isLoading, isOpen]);

    useEffect(() => {
        if (isOpen && initialMessage) {
            setInputText(initialMessage);
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

        const CHATBOT_TIMEOUT_MS = 120_000;
        const abortController = new AbortController();
        const timeoutId = window.setTimeout(
            () => abortController.abort(),
            CHATBOT_TIMEOUT_MS,
        );

        try {
            const response = await fetch("/api/chatbot", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                signal: abortController.signal,
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

            const data = (await response.json().catch(() => null)) as {
                response?: string;
                error?: string;
            } | null;

            if (!response.ok) {
                const serverMsg =
                    data && typeof data.error === "string" && data.error.trim()
                        ? data.error.trim()
                        : `Something went wrong (${response.status}). Please try again.`;
                throw new Error(serverMsg);
            }

            const reply =
                data && typeof data.response === "string" ? data.response.trim() : "";
            if (!reply) {
                throw new Error("Empty reply from assistant. Please try again.");
            }

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                type: "assistant",
                content: reply,
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, assistantMessage]);
        } catch (error) {
            console.error("Error sending message:", error);
            const isAbort =
                (error instanceof DOMException && error.name === "AbortError") ||
                (error instanceof Error && error.name === "AbortError");
            const text =
                isAbort
                    ? "That took too long (over 2 minutes), so we stopped waiting. Please try again — if it keeps happening, check your connection or try a shorter message."
                    : error instanceof Error && error.message
                      ? error.message
                      : "Sorry, I encountered an error. Please try again.";
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                type: "assistant",
                content: text,
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            window.clearTimeout(timeoutId);
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
            <div className="flex h-full min-h-0 w-full flex-col rounded-[18px] bg-white overflow-hidden">
                <div className="flex shrink-0 items-center justify-between gap-2 p-4 text-[#212E42] rounded-t-[16px]">
                    <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-lg">Ask Beavo</h3>
                        <p className="mt-0.5 text-xs text-[#526071]">
                            AI help for CELPIP — speaking, writing, listening, and reading.
                        </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="cursor-pointer rounded-full p-2 transition-colors hover:bg-gray-100"
                            aria-label="Close"
                        >
                            <SvgClose />
                        </button>
                    </div>
                </div>

                <div className="shrink-0 px-[24px]">
                    <div className="h-[1px] w-full bg-[#D5D6D8]"></div>
                </div>

                <div className="flex min-h-0 flex-1 flex-col">
                    <AskBeavoChatBody
                        messages={messages}
                        messagesEndRef={messagesEndRef}
                        isLoading={isLoading}
                        inputText={inputText}
                        setInputText={setInputText}
                        handleSendMessage={handleSendMessage}
                        handleKeyPress={handleKeyPress}
                    />
                </div>
            </div>
        </div>
    );
};

export default AskBeavoModal;
