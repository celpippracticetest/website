"use client";

import React, { useEffect } from "react";
import SvgBeavo from "../icons/Beavo";
import { cn } from "@/lib/utils";
import { useEngagementTracking } from "@/hooks/useTracking";

interface FloatingChatIconProps {
    autoOpen?: boolean;
    className?: string;
    onClick?: (e: React.MouseEvent) => void;
}

const FloatingChatIcon: React.FC<FloatingChatIconProps> = ({ autoOpen = false, className, onClick }) => {
    const { chatbotMessageSent } = useEngagementTracking();

    // Auto-open Intercom on mount if autoOpen is true
    useEffect(() => {
        if (autoOpen && typeof window !== "undefined" && (window as any).Intercom) {
            const timer = setTimeout(() => {
                (window as any).Intercom("show");
                chatbotMessageSent("auto_open");
            }, 500); // Small delay for better UX
            return () => clearTimeout(timer);
        }
    }, [autoOpen, chatbotMessageSent]);

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();

        // Track chatbot interaction
        chatbotMessageSent("manual_open");

        if (onClick) {
            onClick(e);
            return;
        }
        if (typeof window !== "undefined" && (window as any).Intercom) {
            (window as any).Intercom("show");
        }
    };

    return (
        <div className={cn("fixed bottom-6 right-6 z-50", className)}>
            <button
                id="support-button"
                onClick={handleClick}
                className="relative flex items-center justify-center w-[64px] h-[64px] rounded-full cursor-pointer
              overflow-hidden shadow-lg hover:scale-110 transition-transform duration-200
              bg-white"
                aria-label="Open support chat"
            >
                <span
                    className="absolute inset-0 rounded-full p-[2px] bg-[length:200%_200%] animate-gradientBorder 
                   bg-gradient-to-r from-[#F79D65] via-[#759CFF] to-[#F79D65]"
                >
                    <span className="flex items-center justify-center w-full h-full rounded-full bg-white">
                        <div className="text-2xl scale-[2]">
                            <SvgBeavo />
                        </div>
                    </span>
                </span>
            </button>
        </div>
    );
};

export default FloatingChatIcon;
