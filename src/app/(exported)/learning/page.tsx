"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  LearningGuide,
  LearningListening,
  LearningMockExam,
  LearningReading,
  LearningSpeaking,
  LearningWriting,
  SvgMic,
} from "@/components/icons";
import SvgSvgBeforeTypingWord from "@/components/icons/SvgBeforeTypingWord";
import SvgLearningArrowUp from "@/components/icons/LearningArrowUp";
import { useUserContext } from "@/hooks/useUserContext";

type Skill = {
  label: string;
  icon: React.ReactNode;
  description?: string[];
  popoverLabel?: string;
};

type PopPos = { top: number; left: number };

interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const Page = () => {
  const [isInConversation, setIsInConversation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const userContext = useUserContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const skills: Skill[] = [
    {
      label: "Speaking",
      popoverLabel: " Analyze my recent speaking results",
      icon: (
        <LearningSpeaking className="text-[#F4845F] group-hover:!text-white" />
      ),
      description: [
        "Can you evaluate my speaking and give me feedback?",
        "How can I improve my pronunciation and fluency?",
        "Can we practice a speaking test together?",
        "What are some common speaking mistakes made by learners?",
      ],
    },
    {
      label: "Writing",
      icon: (
        <LearningWriting className="text-[#0DAA94] group-hover:!text-white" />
      ),
      description: [
        "Can you review my writing and provide feedback?",
        "How can I improve my CELPIP Writing score?",
        "What are the key elements of a good CELPIP essay?",
        "Can you help me with email writing format?",
      ],
    },
    {
      label: "Reading",
      icon: (
        <LearningReading className="text-[#EE4266] group-hover:!text-white" />
      ),
      description: [
        "What are the best strategies for CELPIP Reading?",
        "How can I improve my reading speed and comprehension?",
        "Can you help me with reading practice questions?",
        "What should I focus on for different reading task types?",
      ],
    },
    {
      label: "Listening",
      icon: (
        <LearningListening className="text-[#316BFF] group-hover:!text-white" />
      ),
      description: [
        "How can I improve my CELPIP Listening score?",
        "What are the best note-taking strategies?",
        "Can you help me practice listening comprehension?",
        "How should I approach different listening task types?",
      ],
    },
    {
      label: "Mock Exams",
      icon: (
        <LearningMockExam className="text-[#DA2AFE] group-hover:!text-white" />
      ),
      description: [
        "Can you analyze my mock exam results?",
        "What should I focus on based on my performance?",
        "How can I improve my overall CELPIP score?",
        "What's the best way to prepare for the actual exam?",
      ],
    },
    {
      label: "Guide & Tips",
      icon: (
        <LearningGuide className="text-[#759CFF] group-hover:!text-white" />
      ),
      description: [
        "What is the CELPIP scoring system?",
        "How long should I study for CELPIP?",
        "What are the exam day tips?",
        "How can I manage my time during the exam?",
      ],
    },
  ];

  const btnRefs = useRef<HTMLButtonElement[]>([]);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [pos, setPos] = useState<PopPos | null>(null);

  const [text, setText] = useState<string>("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenIndex(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openPopover = (index: number) => {
    const btn = btnRefs.current[index];
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const GAP = 8;
    const PANEL_W = 320;
    const vw = window.innerWidth;

    const left = Math.max(8, Math.min(rect.left, vw - PANEL_W - 8));
    const top = rect.bottom + GAP;

    setPos({ top, left });
    setOpenIndex(index);
  };

  const popoverRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!popoverRef.current) return;
      const target = e.target as Node;
      const clickedButton = btnRefs.current.some(
        (b) => b && b.contains(target)
      );
      if (!clickedButton && !popoverRef.current.contains(target)) {
        setOpenIndex(null);
      }
    };
    if (openIndex !== null) document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [openIndex]);

  const handleDescriptionClick = (value: string) => {
    setText(value);
    setOpenIndex(null);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  };

  const handleSendMessage = async () => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setText("");
    setIsLoading(true);
    setIsInConversation(true);

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
            mockScores: userContext.mockScores
              ? `L:${userContext.mockScores.listening || "N/A"} R:${
                  userContext.mockScores.reading || "N/A"
                } W:${userContext.mockScores.writing || "N/A"} S:${
                  userContext.mockScores.speaking || "N/A"
                }`
              : "Not available",
            weakAreas: userContext.weakAreas?.join(", ") || "Not identified",
            practiceHistory: userContext.practiceHistory
              ? `${userContext.practiceHistory.totalPractices} practices, avg: ${userContext.practiceHistory.averageScore}`
              : "Not available",
          },
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

  const handleNewConversation = () => {
    setMessages([]);
    setIsInConversation(false);
    setText("");
  };

  return (
    <section className="relative w-full transition-all duration-300 overflow-hidden">
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-y-auto px-[16px] screen744:!px-[24px] screen1280:!px-[32px] pt-[76px] pb-[10px]">
          <div className="max-w-[980px] z-[1] mx-auto text-center">
            <h1 className="text-[28px] screen744:!text-[36px] screen1280:!text-[44px] font-bold text-[#37465C] tracking-tight mb-[6px]">
              Talk & Learn – CELPIP Style
            </h1>
            <h2 className="text-[#37465C] text-[14px] screen744:!text-[16px] mb-[22px]">
              Ask CELPIP-style questions, get real-time answers.
            </h2>
          </div>

          {/* Conversation Mode */}
          {isInConversation ? (
            <div className="flex flex-col h-full">
              {/* Messages Container */}
              <div className="flex-1 overflow-y-auto px-4">
                <div className="max-w-[900px] mx-auto py-4">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.type === "user"
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                            message.type === "user"
                              ? "bg-[#6366F1] text-white"
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
                    <div ref={messagesEndRef} />
                  </div>

                  {/* New Conversation Button */}
                  <div className="flex justify-center mt-6">
                    <button
                      onClick={handleNewConversation}
                      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Start New Conversation
                    </button>
                  </div>
                </div>
              </div>

              {/* Fixed Input at Bottom */}
              <div className="sticky bottom-0  border-gray-200 p-4">
                <div className="max-w-[900px] mx-auto">
                  <form
                    className="w-full flex gap-[8px] relative"
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage();
                    }}
                  >
                    <textarea
                      ref={textareaRef}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Continue the conversation..."
                      className="flex-1 p-[24px] rounded-[16px] min-h-[76px] border bg-white border-[#D1D5DB] pr-[112px] pb-[64px] text-[14px] text-[#111827] outline-none focus:border-[#6366F1] shadow-sm"
                    />
                    <div className="absolute w-[88px] h-[40px] right-[18px] bottom-[18px] flex items-center gap-[12px]">
                      <button
                        type="button"
                        className="cursor-pointer"
                        aria-label="Record with microphone"
                      >
                        <SvgMic />
                      </button>

                      {text.trim().length === 0 ? (
                        <button
                          type="submit"
                          aria-label="Send"
                          className="cursor-pointer"
                          disabled
                        >
                          <SvgSvgBeforeTypingWord />
                        </button>
                      ) : (
                        <button
                          type="submit"
                          aria-label="Send"
                          disabled={isLoading}
                          className={`w-[40px] flex items-center justify-center h-[40px] cursor-pointer rounded-full transition-colors ${
                            isLoading
                              ? "bg-gray-300 cursor-not-allowed"
                              : "bg-[#6366F1] hover:!bg-[#4F46E5]"
                          }`}
                        >
                          {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <SvgLearningArrowUp />
                          )}
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col-reverse screen744:!flex-col w-full max-w-[616px] screen1280:!max-w-[900px] mx-auto">
              <div className="max-w-[616px] screen1280:!max-w-[900px] w-full mx-auto py-[12px]">
                <form
                  className="w-full flex gap-[8px] relative"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                >
                  <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={
                      isInConversation
                        ? "Continue the conversation..."
                        : "Write your answer or ask for help…"
                    }
                    className="flex-1 p-[24px] rounded-[16px] min-h-[76px] border bg-white border-[#D1D5DB] pr-[112px] pb-[64px] text-[14px] text-[#111827] outline-none focus:border-[#6366F1] shadow-sm"
                  />
                  <div className="absolute w-[88px] h-[40px] right-[18px] bottom-[18px] flex items-center gap-[12px]">
                    <button
                      type="button"
                      className="cursor-pointer"
                      aria-label="Record with microphone"
                    >
                      <SvgMic />
                    </button>

                    {text.trim().length === 0 ? (
                      <button
                        type="submit"
                        aria-label="Send"
                        className="cursor-pointer"
                        disabled
                      >
                        <SvgSvgBeforeTypingWord />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        aria-label="Send"
                        disabled={isLoading}
                        className={`w-[40px] flex items-center justify-center h-[40px] cursor-pointer rounded-full transition-colors ${
                          isLoading
                            ? "bg-gray-300 cursor-not-allowed"
                            : "bg-[#6366F1] hover:!bg-[#4F46E5]"
                        }`}
                      >
                        {isLoading ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <SvgLearningArrowUp />
                        )}
                      </button>
                    )}
                  </div>
                </form>
              </div>
              <div className="mx-auto flex-wrap pt-[8px] flex flex-wrap gap-[12px] justify-between">
                {skills.map((s, index) => (
                  <button
                    key={s.label}
                    type="button"
                    ref={(el) => {
                      if (el) btnRefs.current[index] = el;
                    }}
                    onClick={() => openPopover(index)}
                    className={`
                    cursor-pointer 
                    group relative gap-[8px]
                    px-[16px] h-[40px]
                    bg-white rounded-[20px]
                    flex items-center justify-center
                    shadow-startButton
                    screen744:!max-w-[197px]
                    max-w-[165px]
                    screen1280:!max-w-fit
                    w-full
                    hover:bg-[linear-gradient(270deg,_#F79D65_0%,_#759CFF_100%)]
                    hover:text-white
                    transition-colors
                  `}
                  >
                    <span>{s.icon}</span>
                    <span className="font-medium leading-[24px] text-[16px] text-[#37465C] group-hover:text-white">
                      {s.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Skill Popover */}
      {openIndex !== null &&
        pos &&
        skills[openIndex]?.description &&
        !isInConversation && (
          <div
            ref={popoverRef}
            style={{ top: pos.top, left: pos.left, position: "fixed" as const }}
            className="z-[1000] h-[268px] max-w-[328px] screen744:!max-w-[412px]"
            role="dialog"
            aria-label={`${skills[openIndex].label} options`}
          >
            <div className="bg-white rounded-[16px] p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[12px] font-medium text-[#111827]">
                  {skills[openIndex].popoverLabel}
                </h3>
              </div>

              <div className="mt-[20px]">
                {skills[openIndex]?.description?.map((d, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleDescriptionClick(d)}
                    className="mb-[12px] cursor-pointer font-medium text-left text-[12px] screen744:!text-[14px] text-[#316BFF] bg-[#F2F6FF] rounded-[24px] p-[10px] transition-colors"
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
    </section>
  );
};

export default Page;
