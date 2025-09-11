"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
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
import { useUser } from "@clerk/nextjs";
import UpgradeModal from "@/components/modal/UpgradeModal";
import LoginModal from "@/components/modal/LoginModal";

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
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isChatLocked, setIsChatLocked] = useState(false);
  const [serverMessageCount, setServerMessageCount] = useState(0);
  const userContext = useUserContext();
  const { user, isLoaded, isSignedIn } = useUser();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check if user is free or premium
  const isFreeUser = user?.publicMetadata?.plan === "free";
  const isPremiumUser = user?.publicMetadata?.plan === "premium";
  const noUser = isLoaded ? !isSignedIn : false;

  const skills: Skill[] = [
    {
      label: "Speaking",
      popoverLabel: " Analyze my recent speaking results",
      icon: (
        <LearningSpeaking className="text-[#F4845F] group-hover:!text-white" />
      ),
      description: [
        "How do I get better at managing time in Speaking tasks?",
        "Can you give me a sample answer for “Describe a place you visited”?",
        "How can I improve my fluency and avoid pauses?",
        "Based on my last Speaking test, what is my weakest area?",
      ],
    },
    {
      label: "Writing",
      icon: (
        <LearningWriting className="text-[#0DAA94] group-hover:!text-white" />
      ),
      description: [
        "How do I structure a CELPIP Writing Task 1 email?",
        "Can you show me common mistakes in Writing Task 2 essays?",
        "How can I improve coherence and grammar in my writing?",
        "What feedback do you have on my last Writing submission?",
      ],
    },
    {
      label: "Reading",
      icon: (
        <LearningReading className="text-[#EE4266] group-hover:!text-white" />
      ),
      description: [
        "	What strategies help answer “fill in the blank” questions faster?",
        "How can I improve my reading speed for CELPIP passages?",
        "Which type of questions are hardest in Reading, and how do I tackle them?",
        "Based on my Reading results, what should I practice more?",
      ],
    },
    {
      label: "Listening",
      icon: (
        <LearningListening className="text-[#316BFF] group-hover:!text-white" />
      ),
      description: [
        "How can I improve my note-taking during CELPIP Listening tasks?",
        "Why do I miss details like numbers and dates in the Listening test?",
        "Can you explain the Listening task types in CELPIP?",
        "Based on my last practice, what should I focus on in Listening?",
      ],
    },
    {
      label: "Mock Exams",
      icon: (
        <LearningMockExam className="text-[#DA2AFE] group-hover:!text-white" />
      ),
      description: [
        "How close are my mock exam results to the real CELPIP test?",
        "What were my top 2 weak skills in my last mock exam?",
        "How can I manage time better across the full mock exam?",
        "Should I take more mock exams before my real test?",
      ],
    },
    {
      label: "Guide & Tips",
      icon: (
        <LearningGuide className="text-[#759CFF] group-hover:!text-white" />
      ),
      description: [
        "What is the structure of the CELPIP exam?",
        "How is CELPIP different from IELTS?",
        "What are some general tips to score 9 or higher?",
        "What scoring criteria does CELPIP use for Speaking and Writing?",
      ],
    },
  ];

  const btnRefs = useRef<HTMLButtonElement[]>([]);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [pos, setPos] = useState<PopPos | null>(null);

  const [text, setText] = useState<string>("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Check server-side message count on component mount
  useEffect(() => {
    const checkMessageCount = async () => {
      if (isFreeUser && !isPremiumUser) {
        try {
          const response = await fetch("/api/chatbot/check-limit", {
            method: "GET",
          });

          if (response.ok) {
            const data = await response.json();
            setServerMessageCount(data.count || 0);

            // If free user has already sent messages, lock the chat
            if (data.count >= 1) {
              setIsChatLocked(true);
            }
          }
        } catch (error) {
          console.error("Error checking message count:", error);
        }
      } else if (noUser) {
        // For guests, check if they've already sent a message
        try {
          const response = await fetch("/api/chatbot/check-limit", {
            method: "GET",
          });

          if (response.ok) {
            const data = await response.json();
            setServerMessageCount(data.count || 0);

            // If guest has already sent 1 message, lock the chat
            if (data.count >= 1) {
              setIsChatLocked(true);
            }
          }
        } catch (error) {
          console.error("Error checking message count:", error);
        }
      }
    };

    checkMessageCount();
  }, [isFreeUser, noUser, isPremiumUser]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Security monitoring removed - server-side validation is more secure and prevents infinite loops

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

    // Allow guests to send 1 message, then show login modal
    // No need to block them immediately

    // Check if free user has exceeded their limit using server count
    const currentMessageCount =
      serverMessageCount + messages.filter((m) => m.type === "user").length;
    if (isFreeUser && !isPremiumUser && currentMessageCount >= 1) {
      setShowUpgradeModal(true);
      return;
    }

    // Check if guest has exceeded their limit (after 1 message)
    if (noUser && currentMessageCount >= 1) {
      setShowLoginModal(true);
      return;
    }

    // Check if chat is locked
    if (isChatLocked) {
      return;
    }

    // Additional security check - prevent bypassing via DOM manipulation
    if ((isFreeUser || noUser) && !isPremiumUser) {
      if (currentMessageCount >= 1) {
        if (noUser) {
          setShowLoginModal(true);
        } else if (isFreeUser) {
          setShowUpgradeModal(true);
        }
        setIsChatLocked(true);
        return;
      }
    }

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
            currentScores: userContext.mockScores
              ? `L:${userContext.mockScores.listening || "N/A"} R:${
                  userContext.mockScores.reading || "N/A"
                } W:${userContext.mockScores.writing || "N/A"} S:${
                  userContext.mockScores.speaking || "N/A"
                }`
              : "Not available",
            scoreSource: userContext.scoreSource || "Not available",
            answerCounts: userContext.answerCounts
              ? `Writing: ${userContext.answerCounts.writing || 0}, Speaking: ${
                  userContext.answerCounts.speaking || 0
                }, Listening: ${
                  userContext.answerCounts.listening || 0
                }, Reading: ${userContext.answerCounts.reading || 0}`
              : "No answers available",
            weakAreas: userContext.weakAreas?.join(", ") || "Not identified",
            practiceHistory: userContext.practiceHistory
              ? `${
                  userContext.practiceHistory.totalPractices
                } practices, avg: ${
                  userContext.practiceHistory.averageScore || "N/A"
                }`
              : "Not available",
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.upgradeRequired) {
          if (noUser) {
            setShowLoginModal(true);
          } else if (isFreeUser) {
            setShowUpgradeModal(true);
          }
          setIsChatLocked(true);
          throw new Error("Upgrade required");
        }
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

      // Lock chat for free users/guests after first response and refresh server count
      if ((isFreeUser || noUser) && !isPremiumUser) {
        setIsChatLocked(true);
        // Refresh server message count
        refreshMessageCount();
      }
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
    setIsChatLocked(false);

    // Refresh server message count for new conversation
    if ((isFreeUser || noUser) && !isPremiumUser) {
      refreshMessageCount();
    }
  };

  const handleUpgradeClick = useCallback(() => {
    if (noUser) {
      setShowLoginModal(true);
    } else if (isFreeUser) {
      setShowUpgradeModal(true);
    }
  }, [noUser, isFreeUser]);

  // Function to refresh message count from server
  const refreshMessageCount = useCallback(async () => {
    if (isFreeUser && !isPremiumUser) {
      try {
        const response = await fetch("/api/chatbot/check-limit", {
          method: "GET",
        });

        if (response.ok) {
          const data = await response.json();
          setServerMessageCount(data.count || 0);

          // If free user has already sent messages, lock the chat
          if (data.count >= 1) {
            setIsChatLocked(true);
          }
        }
      } catch (error) {
        console.error("Error checking message count:", error);
      }
    } else if (noUser) {
      // For guests, check if they've already sent a message
      try {
        const response = await fetch("/api/chatbot/check-limit", {
          method: "GET",
        });

        if (response.ok) {
          const data = await response.json();
          setServerMessageCount(data.count || 0);

          // If guest has already sent 1 message, lock the chat
          if (data.count >= 1) {
            setIsChatLocked(true);
          }
        }
      } catch (error) {
        console.error("Error checking message count:", error);
      }
    }
  }, [isFreeUser, noUser, isPremiumUser]);

  // Clear message count when user becomes premium
  useEffect(() => {
    if (isPremiumUser) {
      setServerMessageCount(0);
      setIsChatLocked(false);
    }
  }, [isPremiumUser]);

  // Reset message count when user signs in (if they were a guest before)
  useEffect(() => {
    if (isLoaded && isSignedIn && !isPremiumUser) {
      // Refresh server message count when user signs in
      refreshMessageCount();
    }
  }, [isLoaded, isSignedIn, isPremiumUser, refreshMessageCount]);

  return (
    <section className="relative w-full transition-all duration-300 overflow-hidden">
      {/* Modals */}
      {showUpgradeModal && <UpgradeModal setShowModal={setShowUpgradeModal} />}
      {showLoginModal && <LoginModal setShowLoginModal={setShowLoginModal} />}

      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-y-auto px-[16px] screen744:!px-[24px] screen1280:!px-[32px] pt-[24px] screen1280:!pt-[76px] pb-[10px]">
          <div className="max-w-[980px] z-[1] mx-auto text-center">
            <h1 className="text-[28px] screen744:!text-[36px] screen1280:!text-[44px] font-bold text-[#37465C] tracking-tight mb-[6px]">
              Talk & Learn – CELPIP Style
            </h1>
            <h2 className="text-[#76808F] text-[20px] screen744:!text-[16px] mb-[22px]">
              Ask CELPIP-style questions, get real-time answers.
            </h2>

            {/* Plan Status Indicator */}
            {noUser && (
              <div className="mb-4 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#FEF3C7] text-[#92400E] border border-[#F59E0B]">
                <span className="w-2 h-2 bg-[#F59E0B] rounded-full mr-2"></span>
                Guest - 1 message limit
              </div>
            )}
            {isFreeUser && !noUser && (
              <div className="mb-4 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#FEF3C7] text-[#92400E] border border-[#F59E0B]">
                <span className="w-2 h-2 bg-[#F59E0B] rounded-full mr-2"></span>
                Free Plan - 1 message limit
              </div>
            )}
            {isPremiumUser && (
              <div className="mb-4 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#D1FAE5] text-[#065F46] border border-[#10B981]">
                <span className="w-2 h-2 bg-[#10B981] rounded-full mr-2"></span>
                Pro Plan - Unlimited access
              </div>
            )}
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
                  {/* Chat Locked Message for Free Users and Guests */}
                  {isChatLocked && (isFreeUser || noUser) && (
                    <div className="mb-4 p-4 bg-[#37465C] border rounded-[12px]  max-w-[478px]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="text-white text-sm font-medium">
                            You’ve reach your free limit. Upgrade to Pro to
                            unlock unlimited access and exclusive features.
                          </div>
                        </div>
                        <button
                          onClick={handleUpgradeClick}
                          className="text-[12px] max-w-[105px] w-full bg-white rounded-[24px] flex items-center justify-center h-[24px] text-[#76808F] text-sm font-medium  transition-colors"
                        >
                          Upgrade to Pro
                        </button>
                      </div>
                    </div>
                  )}

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
                        isChatLocked && (isFreeUser || noUser)
                          ? "Upgrade to Pro to continue chatting..."
                          : "Continue the conversation..."
                      }
                      disabled={isChatLocked && (isFreeUser || noUser)}
                      className={`flex-1 p-[24px] rounded-[16px] min-h-[76px] border pr-[112px] pb-[64px] text-[14px] text-[#111827] outline-none shadow-sm ${
                        isChatLocked && (isFreeUser || noUser)
                          ? "bg-gray-100 border-gray-300 cursor-not-allowed"
                          : "bg-white border-[#D1D5DB] focus:border-[#6366F1]"
                      }`}
                    />
                    <div className="absolute w-[88px] h-[40px] right-[18px] bottom-[18px] flex items-center gap-[12px]">
                      {text.trim().length === 0 ||
                      (isChatLocked && (isFreeUser || noUser)) ? (
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
                          disabled={
                            isLoading ||
                            (isChatLocked && (isFreeUser || noUser))
                          }
                          className={`w-[40px] flex items-center justify-center h-[40px] cursor-pointer rounded-full transition-colors ${
                            isLoading ||
                            (isChatLocked && (isFreeUser || noUser))
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
                {/* Show upgrade banner for free users or guests who have reached their limit */}
                {(isFreeUser || noUser) &&
                  serverMessageCount +
                    messages.filter((m) => m.type === "user").length >=
                    1 && (
                    <div className="flex items-center mb-[16px] screen1280:!mb-[28px] px-[16px] py-[12px] bg-[#37465C] w-full max-w-[478px] rounded-[12px]">
                      <div className="font-normal text-[14px] text-white">
                        You've reach your free limit. Upgrade to Pro to unlock
                        unlimited access and exclusive features.
                      </div>
                      <button
                        onClick={handleUpgradeClick}
                        className="w-full h-[24px] flex items-center justify-center max-w-[105px] text-[12px] font-normal text-[#76808F] border border-[#76808F] rounded-[24px] bg-white hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        Upgrade to Pro
                      </button>
                    </div>
                  )}
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
                      isChatLocked && (isFreeUser || noUser)
                        ? "Upgrade to Pro to continue chatting..."
                        : isInConversation
                        ? "Continue the conversation..."
                        : "Write your answer or ask for help…"
                    }
                    disabled={isChatLocked && (isFreeUser || noUser)}
                    className={`flex-1 p-[24px] rounded-[16px] min-h-[76px] border pr-[112px] pb-[64px] text-[14px] text-[#111827] outline-none shadow-sm ${
                      isChatLocked && (isFreeUser || noUser)
                        ? "bg-gray-100 border-gray-300 cursor-not-allowed"
                        : "bg-white border-[#D1D5DB] focus:border-[#6366F1]"
                    }`}
                  />
                  <div className="absolute w-[88px] h-[40px] right-[18px] bottom-[18px] flex items-center gap-[12px]">
                    {text.trim().length === 0 ||
                    (isChatLocked && (isFreeUser || noUser)) ? (
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
                        disabled={
                          isLoading || (isChatLocked && (isFreeUser || noUser))
                        }
                        className={`w-[40px] flex items-center justify-center h-[40px] cursor-pointer rounded-full transition-colors ${
                          isLoading || (isChatLocked && (isFreeUser || noUser))
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
              <div className="mx-auto  pt-[8px] flex flex-wrap gap-[12px] justify-between">
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
