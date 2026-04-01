"use client";

import React, { useEffect } from "react";
import SvgBeavo from "../icons/Beavo";
import { cn } from "@/lib/utils";
import { useEngagementTracking } from "@/hooks/useTracking";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useAskBeavoStore } from "@/stores/askBeavoStore";

interface FloatingChatIconProps {
  autoOpen?: boolean;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

const FloatingChatIcon: React.FC<FloatingChatIconProps> = ({
  autoOpen = false,
  className,
  onClick,
}) => {
  const { chatbotMessageSent } = useEngagementTracking();
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const openAskBeavo = useAskBeavoStore((s) => s.openAskBeavo);

  useEffect(() => {
    if (autoOpen) {
      const timer = setTimeout(() => {
        chatbotMessageSent("auto_open");
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoOpen, chatbotMessageSent]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();

    chatbotMessageSent("manual_open");

    if (onClick) {
      onClick(e);
      return;
    }

    if (!isLoaded) return;

    if (!isSignedIn) {
      router.push("/sign-in");
      return;
    }

    openAskBeavo();
  };

  return (
    <div className={cn("fixed bottom-6 right-6 z-50", className)}>
      <button
        id="crisp-support-fab"
        type="button"
        data-support-chat="ask-beavo"
        onClick={handleClick}
        className="relative flex items-center justify-center w-[64px] h-[64px] rounded-full cursor-pointer
              overflow-hidden shadow-lg hover:scale-110 transition-transform duration-200
              bg-white"
        aria-label="Open Ask Beavo and support options"
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
