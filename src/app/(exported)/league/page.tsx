"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Bronz40,
  CircleCheck,
  Gold24,
  Gold40,
  LearningGuide,
  LearningListening,
  LearningMockExam,
  LearningReading,
  LearningSpeaking,
  LearningWriting,
  Silver24,
  Silver40,
} from "@/components/icons";
import SvgSvgBeforeTypingWord from "@/components/icons/SvgBeforeTypingWord";
import SvgLearningArrowUp from "@/components/icons/LearningArrowUp";
import { useUserContext } from "@/hooks/useUserContext";
import { useUser } from "@clerk/nextjs";
import UpgradeModal from "@/components/modal/UpgradeModal";
import LoginModal from "@/components/modal/LoginModal";
import { ActivityLogger } from "@/lib/userActivity";
import SvgLeagueKados from "@/components/icons/LeagueKados";
import SvgLeagueKados24 from "@/components/icons/LeagueKados24";
import SvgCheck from "@/components/icons/Check";

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

    // Log learning activity start
    const attemptId = `learning_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    await ActivityLogger.learningStarted(attemptId);

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
          conversationHistory: messages, // Send all previous messages for context
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

      // Log AI feedback generation
      await ActivityLogger.aiFeedbackGenerated(
        "learning",
        undefined,
        data.usage?.prompt_tokens || 0,
        data.usage?.completion_tokens || 0,
        attemptId
      );

      // Lock chat for free users/guests after first response and refresh server count
      if ((isFreeUser || noUser) && !isPremiumUser) {
        setIsChatLocked(true);
        // Refresh server message count
        
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

  



  // Clear message count when user becomes premium
  useEffect(() => {
    if (isPremiumUser) {
      setServerMessageCount(0);
      setIsChatLocked(false);
    }
  }, [isPremiumUser]);



  return (
    <section className="relative w-full transition-all duration-300 overflow-hidden">
      {/* Modals */}
      {showUpgradeModal && <UpgradeModal setShowModal={setShowUpgradeModal} />}
      {showLoginModal && <LoginModal setShowLoginModal={setShowLoginModal} />}

      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-y-auto  justify-center ">
          <div className="flex max-w-[1200px] mx-auto z-[1]  text-center">
   
<div className="flex gap-[48px] w-full">
<div className="w-full">test</div>

  <div className="w-full mt-[40px] max-w-[522px]">

<div className="border gap-[16px]  px-[16px] flex items-center rounded-[8px] justify-center border-[#0DAA94] bg-[#F0FFFD] h-[50px] text-[#0DAA94] text-[14px] font-medium leading-[24px]">
<SvgLeagueKados/>
Users in the Gold League will enter a raffle for a $100 gift card.
</div>

<div className="mt-[24px] text-[18px] text-[#212E42] font-semibold leading-[28px]">League	Focus	Trophies & Tasks	Requirement to Enter</div>

<div className="min-h-[232px] rounded-[12px] p-[16px] bg-white mt-[24px]">
  <div className="flex justify-between">
    <div className="flex gap-[6px] items-center"><Bronz40/><span className="text-[16px] text-[#212E42] font-semibold">Bronz Leage</span></div>
    <div className="flex items-center text-[14px]"><span className="text-[#76808F]">Requirement: </span><span>1+ trophy</span></div>
  </div>
  <div className="mt-[24px] items-center flex gap-[16px]">
    <span className="text-[14px] text-[#76808F ]">Progress</span>
    <div className="w-full relative bg-[#E6E6E6] h-[12px] rounded-[16px]">
      <div className="absolute left-0 bg-[#F26B3E] w-[12px] h-[12px] rounded-full"></div>
    </div>
    <div className="flex gap-[4px] items-center shrink-0">
      <Silver24/>
      <span className="text-[#F27059] text-[14px]">Silver League</span>
    </div>
  </div>
  <div className="mt-[24px] flex flex-col gap-[8px]">
    <div className="flex gap-[8px]">
        <CircleCheck/>
        <span className="text-[#37465C] text-[14px]">1 Mock Exam Completed</span>
    </div>
    <div className="flex gap-[8px]">
        <CircleCheck/>
        <span className="text-[#37465C] text-[14px]">4 Skills Tried (L, R, W, S)</span>
    </div>
    <div className="flex gap-[8px]">
        <CircleCheck/>
        <span className="text-[#37465C] text-[14px]">1 Writing or Speaking with AI Feedback</span>
    </div>
  </div>
</div>


<div className="min-h-[232px] rounded-[12px] mt-[16px] p-[16px] bg-white mt-[24px]">
  <div className="flex justify-between">
    <div className="flex gap-[6px] items-center"><Silver40/><span className="text-[16px] text-[#212E42] font-semibold">Bronz Leage</span></div>
    <div className="flex items-center text-[14px]"><span className="text-[#76808F]">Requirement: </span><span>2+ trophy</span></div>
  </div>
  <div className="mt-[24px] items-center flex gap-[16px]">
    <span className="text-[14px] text-[#76808F ]">Progress</span>
    <div className="w-full relative bg-[#E6E6E6] h-[12px] rounded-[16px]">
      <div className="absolute left-0 bg-[#F26B3E] w-[12px] h-[12px] rounded-full"></div>
    </div>
    <div className="flex gap-[4px] items-center shrink-0">
      <Gold24/>
      <span className="text-[#F27059] text-[14px]">Gold League</span>
    </div>
  </div>
  <div className="mt-[24px] flex flex-col gap-[8px]">
    <div className="flex gap-[8px]">
        <CircleCheck/>
        <span className="text-[#37465C] text-[14px]">5 Mock Exams Completed</span>
    </div>
    <div className="flex gap-[8px]">
        <CircleCheck/>
        <span className="text-[#37465C] text-[14px]">+1 CLB Improvement (any skill)</span>
    </div>
    <div className="flex gap-[8px]">
        <CircleCheck/>
        <span className="text-[#37465C] text-[14px]">3 Writing with Feedback</span>
    </div>
    <div className="flex gap-[8px]">
        <CircleCheck/>
        <span className="text-[#37465C] text-[14px]">3 Speaking with Feedback</span>
    </div>
  </div>
</div>


<div className="min-h-[232px] rounded-[12px] mt-[16px] p-[16px] bg-white mt-[24px]">
  <div className="flex justify-between">
    <div className="flex gap-[6px] items-center"><Gold40/><span className="text-[16px] text-[#212E42] font-semibold">Gold Leage</span></div>
    <div className="flex items-center text-[14px]"><span className="text-[#76808F]">Requirement: </span><span>3+ trophy</span></div>
  </div>
  <div className="mt-[24px] items-center flex gap-[16px]">
    <span className="text-[14px] text-[#76808F ]">Progress</span>
    <div className="w-full relative bg-[#E6E6E6] h-[12px] rounded-[16px]">
      <div className="absolute left-0 bg-[#F26B3E] w-[12px] h-[12px] rounded-full"></div>
    </div>
    <div className="flex gap-[4px] items-center shrink-0">
      <SvgLeagueKados24/>
      <span className="text-[#212E42] font-medium text-[14px]">100$ Gift Card</span>
    </div>
  </div>
  <div className="mt-[24px] flex flex-col gap-[8px]">
    <div className="flex gap-[8px]">
        <CircleCheck/>
        <span className="text-[#37465C] text-[14px]">10 Mock Exams Completed</span>
    </div>
    <div className="flex gap-[8px]">
        <CircleCheck/>
        <span className="text-[#37465C] text-[14px]"> Practice 3x/Week (4 Weeks)</span>
    </div>
    <div className="flex gap-[8px]">
        <CircleCheck/>
        <span className="text-[#37465C] text-[14px]">1 Friend Referred (paid plan)</span>
    </div>
    <div className="flex flex-col gap-[8px]">
      <div className="flex gap-[8px]">
      <CircleCheck/>
      <span className="text-[#F27059] text-[14px]">CELPIP Champion: </span>
      </div>

        <div className="flex flex-col gap-[8px]">
          <div className="flex gap-[8px]"><SvgCheck className="text-[#979EA8]"/> 10 mocks</div>
          <div className="flex gap-[8px]"><SvgCheck className="text-[#979EA8]"/> +2 CLB in 1 skill</div>
          <div className="flex gap-[8px]"><SvgCheck className="text-[#979EA8]"/> 5 Writing</div>
          <div className="flex gap-[8px]"><SvgCheck className="text-[#979EA8]"/> + 5 Speaking improved</div>
          <div className="flex gap-[8px]"><SvgCheck className="text-[#979EA8]"/>all skills practiced</div>
          <div className="flex gap-[8px]"><SvgCheck className="text-[#979EA8]"/>1 referral</div>
        </div>
    </div>
 
  </div>
</div>

  </div>

</div>
     
          </div>

   
        </div>
      </div>

  
    </section>
  );
};

export default Page;
