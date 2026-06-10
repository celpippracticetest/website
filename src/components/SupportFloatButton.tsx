"use client";

import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import CloseIcon from "@mui/icons-material/Close";
import HeadsetMicOutlinedIcon from "@mui/icons-material/HeadsetMicOutlined";
import RateReviewOutlinedIcon from "@mui/icons-material/RateReviewOutlined";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { openSentryFeedback } from "@/lib/sentry-feedback";
import { openTawkChat } from "@/lib/tawk";
import { cn } from "@/lib/utils";

const menuItemClass =
  "flex w-full min-w-[168px] items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-text1 transition-colors hover:bg-slate-50";

export default function SupportFloatButton() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const handleChat = useCallback(() => {
    setOpen(false);
    openTawkChat();
  }, []);

  const handleFeedback = useCallback(() => {
    setOpen(false);
    void openSentryFeedback();
  }, []);

  return (
    <div
      ref={rootRef}
      className={cn(
        "fixed right-4 z-[1150] flex flex-col items-end gap-3",
        "bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] screen1280:bottom-6",
      )}
    >
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Support options"
          className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.12)]"
        >
          <button type="button" role="menuitem" className={menuItemClass} onClick={handleChat}>
            <ChatBubbleOutlineIcon sx={{ fontSize: 20, color: "#316BFF" }} aria-hidden />
            Live chat
          </button>
          <button
            type="button"
            role="menuitem"
            className={cn(menuItemClass, "border-t border-slate-100")}
            onClick={handleFeedback}
          >
            <RateReviewOutlinedIcon sx={{ fontSize: 20, color: "#316BFF" }} aria-hidden />
            Send feedback
          </button>
        </div>
      ) : null}

      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? menuId : undefined}
        aria-label={open ? "Close support menu" : "Open support menu"}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-full bg-primary1 text-white",
          "shadow-[0_8px_28px_rgba(49,107,255,0.38)] transition-transform",
          "hover:-translate-y-0.5 active:translate-y-0",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary1 focus-visible:ring-offset-2",
        )}
      >
        {open ? (
          <CloseIcon sx={{ fontSize: 26 }} aria-hidden />
        ) : (
          <HeadsetMicOutlinedIcon sx={{ fontSize: 26 }} aria-hidden />
        )}
      </button>
    </div>
  );
}
