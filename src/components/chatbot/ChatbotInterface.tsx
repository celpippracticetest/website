"use client";

import React, { useState, useRef, useEffect } from "react";
import { SvgMic } from "@/components/icons";
import SvgLearningArrowUp from "../icons/LearningArrowUp";
import SvgSvgBeforeTypingWord from "../icons/SvgBeforeTypingWord";
import ChatbotMessageContent from "./ChatbotMessageContent";

interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatbotInterfaceProps {
  onClose?: () => void;
  userContext?: {
    targetCLB?: string;
    mockScores?: string;
    weakAreas?: string;
    practiceHistory?: string;
  };
}

const ChatbotInterface: React.FC<ChatbotInterfaceProps> = ({
  onClose,
  userContext,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    // Personalized greeting based on user context
    let greeting =
      "Hi! I'm your CELPIP tutor. I can help you with Listening, Reading, Writing, and Speaking strategies.";

    if (userContext?.targetCLB && userContext.targetCLB !== "Not specified") {
      greeting += ` I see you're targeting CLB ${userContext.targetCLB}.`;
    }

    if (userContext?.weakAreas && userContext.weakAreas !== "Not identified") {
      greeting += ` I notice you're working on: ${userContext.weakAreas}. I can help you improve in these areas!`;
    }

    greeting += " What would you like to know?";

    setMessages([
      {
        id: "1",
        type: "assistant",
        content: greeting,
        timestamp: new Date(),
      },
    ]);
  }, [userContext]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);
    setIsTyping(true);

    try {
      const response = await fetch("/api/chatbot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage.content,
          context: userContext || {
            targetCLB: "Not specified",
            mockScores: "Not available",
            weakAreas: "Not identified",
            practiceHistory: "Not available",
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
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const suggestedQuestions = [
    "How can I improve my CELPIP Writing score?",
    "What are the best strategies for CELPIP Listening?",
    "Can you help me with CELPIP Speaking Task 1?",
    "How should I prepare for CELPIP Reading?",
    "What's the CELPIP scoring system?",
    "Can you analyze my recent practice results?",
    "What should I focus on for my target CLB score?",
    "How can I improve my time management during the exam?",
  ];

  const handleSuggestedQuestion = (question: string) => {
    setInputText(question);
    textareaRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-t-[20px] shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-[#F79D65] to-[#759CFF] rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-bold">C</span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">CELPIP Tutor</h3>
            <p className="text-xs text-gray-500">Your AI CELPIP Coach</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.type === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.type === "user"
                  ? "bg-[#6366F1] text-white"
                  : "bg-gray-100 text-gray-900"
              }`}
            >
              <ChatbotMessageContent
                content={message.content}
                variant={message.type}
              />
              <p className="text-xs opacity-70 mt-1">
                {message.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        ))}

        {isTyping && (
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

      {/* Suggested Questions */}
      {messages.length === 1 && (
        <div className="px-4 pb-2">
          <p className="text-xs text-gray-500 mb-2">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => handleSuggestedQuestion(question)}
                className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full hover:bg-blue-100 transition-colors"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about CELPIP..."
              className="w-full p-3 pr-12 rounded-2xl border border-gray-300 focus:border-[#6366F1] focus:outline-none resize-none text-sm"
              rows={1}
              style={{
                minHeight: "48px",
                maxHeight: "120px",
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
              }}
            />
            <div className="absolute right-3 bottom-3 flex items-center gap-2">
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Record with microphone"
              >
                <SvgMic />
              </button>
            </div>
          </div>

          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim() || isLoading}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
              inputText.trim() && !isLoading
                ? "bg-[#6366F1] hover:bg-[#4F46E5] text-white"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : inputText.trim() ? (
              <SvgLearningArrowUp />
            ) : (
              <SvgSvgBeforeTypingWord />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatbotInterface;
