"use client";

import React, { useEffect } from "react";
import SvgBeavo from "../icons/Beavo";
import { cn } from "@/lib/utils";
import { useEngagementTracking } from "@/hooks/useTracking";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import { useRouter } from "next/navigation";
import { useAskBeavoStore } from "@/stores/askBeavoStore";
import { ensureTawkScript, openTawkChat } from "@/lib/tawk";
import ChatOutlined from "@mui/icons-material/ChatOutlined";

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
  const { isSignedIn, isLoaded } = useHybridWebUser();
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

  const handleTawkClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.push("/sign-in");
      return;
    }
    ensureTawkScript();
    openTawkChat();
  };

  const handleBeavoClick = (e: React.MouseEvent) => {
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
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3",
        className,
      )}
    >
      {isSignedIn && (
        <button
          id="tawk-support-fab"
          type="button"
          data-support-chat="tawk"
          onClick={handleTawkClick}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[#212E42] text-white shadow-lg transition-transform duration-200 hover:scale-110"
          aria-label="Open live support chat"
          title="Live support"
        >
          <ChatOutlined sx={{ fontSize: 26, color: "#fff" }} />
        </button>
      )}
      <button
        type="button"
        data-support-chat="ask-beavo"
        onClick={handleBeavoClick}
        className="relative flex h-16 w-16 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-white shadow-lg transition-transform duration-200 hover:scale-110"
        aria-label="Open Ask Beavo"
      >
        <span
          className="absolute inset-0 rounded-full bg-gradient-to-r from-[#F79D65] via-[#759CFF] to-[#F79D65] bg-[length:200%_200%] p-[2px] animate-gradientBorder"
        >
          <span className="flex h-full w-full items-center justify-center rounded-full bg-white">
            <div className="scale-[2] text-2xl">
              <SvgBeavo />
            </div>
          </span>
        </span>
      </button>
    </div>
  );
};

export default FloatingChatIcon;
