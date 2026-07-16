import React, { useState, useEffect, useRef, useCallback } from "react";
import { WordMenu } from "./WordMenu";
import { useAskBeavoStore } from "@/stores/askBeavoStore";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import { useAuthModalStore } from "@/store/useAuthModal.store";
import clsx from "clsx";
import Link from "next/link";

export const GlobalInteractiveProvider: React.FC = () => {
  const [hoveredWord, setHoveredWord] = useState<string | null>(null);
  const [virtualRect, setVirtualRect] = useState<DOMRect | null>(null);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeWord, setActiveWord] = useState<string | null>(null);
  const [activeRect, setActiveRect] = useState<DOMRect | null>(null);
  const { askAboutWord } = useAskBeavoStore();
  const { isSignedIn } = useHybridWebUser();
  const { setShowLoginModal } = useAuthModalStore();

  const mousePos = useRef({ x: 0, y: 0 });

  const isOverWordMenu = (el: Element | null): boolean => {
    if (!el || !(el instanceof Element)) return false;
    return (
      el.closest("[data-word-menu='true']") != null ||
      el.closest("[data-radix-popper-content-wrapper]") != null
    );
  };

  /** Safe corridor between the active word and the open popup (covers top or bottom placement). */
  const isInHoverBridge = (x: number, y: number): boolean => {
    if (!activeRect) return false;

    const content =
      document.querySelector<HTMLElement>(
        '[data-word-menu="true"][data-state="open"]',
      ) ??
      document.querySelector<HTMLElement>(
        "[data-radix-popper-content-wrapper]",
      );

    const pad = 12;
    if (!content) {
      // Popup may not be measured yet — allow travel above and below the word
      return (
        x >= activeRect.left - 40 &&
        x <= activeRect.right + 40 &&
        y >= activeRect.top - 120 &&
        y <= activeRect.bottom + 120
      );
    }

    const menuRect = content.getBoundingClientRect();
    const left = Math.min(activeRect.left, menuRect.left) - pad;
    const right = Math.max(activeRect.right, menuRect.right) + pad;
    const top = Math.min(activeRect.top, menuRect.top) - pad;
    const bottom = Math.max(activeRect.bottom, menuRect.bottom) + pad;

    return x >= left && x <= right && y >= top && y <= bottom;
  };

  // Helper to check if an element should be ignored (interactive elements)
  const isIgnoredElement = (el: HTMLElement | null): boolean => {
    if (!el) return false;
    const tag = el.tagName.toLowerCase();

    // 1. Direct tag check
    const isInteractiveTag = [
      "button",
      "a",
      "input",
      "textarea",
      "select",
      "svg",
      "path",
    ].includes(tag);

    // 2. Attribute and logic check
    const hasInteractiveAttr =
      el.getAttribute("role") === "button" ||
      el.getAttribute("data-word-menu") === "true" ||
      el.onclick != null ||
      el.classList.contains("cursor-pointer");

    // 3. Closest ancestor check (includes self)
    const hasInteractiveParent =
      el.closest("button") != null ||
      el.closest("a") != null ||
      el.closest("[data-word-menu='true']") != null ||
      el.closest("[data-radix-popper-content-wrapper]") != null ||
      el.closest(".cursor-pointer") != null ||
      el.closest("[data-no-word-menu='true']") != null;

    return isInteractiveTag || hasInteractiveAttr || hasInteractiveParent;
  };

  const getWordAtPoint = (x: number, y: number) => {
    let range: Range | null = null;
    if (document.caretRangeFromPoint) {
      range = document.caretRangeFromPoint(x, y);
    } else if ((document as any).caretPositionFromPoint) {
      const pos = (document as any).caretPositionFromPoint(x, y);
      if (pos) {
        range = document.createRange();
        range.setStart(pos.offsetNode, pos.offset);
        range.setEnd(pos.offsetNode, pos.offset);
      }
    }

    if (!range || range.startContainer.nodeType !== Node.TEXT_NODE) return null;

    const node = range.startContainer;
    const offset = range.startOffset;
    const text = node.textContent || "";

    // Find the word boundaries
    let start = offset;
    while (start > 0 && /[a-zA-ZÀ-ÿ'-]/.test(text[start - 1])) {
      start--;
    }
    let end = offset;
    while (end < text.length && /[a-zA-ZÀ-ÿ'-]/.test(text[end])) {
      end++;
    }

    const word = text.slice(start, end).trim();
    // Skip if word is empty, too short, or contains numbers
    if (!word || word.length < 2 || /\d/.test(word)) return null;

    if (isIgnoredElement(node.parentElement)) return null;

    const wordRange = document.createRange();
    wordRange.setStart(node, start);
    wordRange.setEnd(node, end);
    const rects = wordRange.getClientRects();

    let bestRect: DOMRect | null = null;
    for (let i = 0; i < rects.length; i++) {
      if (
        x >= rects[i].left &&
        x <= rects[i].right &&
        y >= rects[i].top &&
        y <= rects[i].bottom
      ) {
        bestRect = rects[i];
        break;
      }
    }

    if (!bestRect) return null;

    return { word, rect: bestRect };
  };

  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearCloseTimeout = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const scheduleClose = () => {
    if (closeTimeoutRef.current) return;
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
      setHoveredWord(null);
      setVirtualRect(null);
      closeTimeoutRef.current = null;
    }, 300);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };

      if (hoverTimeoutRef.current && isOpen) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }

      // While open: keep alive over menu, active word, or the bridge between them.
      // Do not switch to other words on the way (common when the popup flips above).
      if (isOpen) {
        if (isOverWordMenu(e.target as Element | null)) {
          clearCloseTimeout();
          return;
        }

        const result = getWordAtPoint(e.clientX, e.clientY);
        if (result && result.word === activeWord) {
          clearCloseTimeout();
          setHoveredWord(result.word);
          setVirtualRect(result.rect);
          return;
        }

        if (isInHoverBridge(e.clientX, e.clientY)) {
          clearCloseTimeout();
          return;
        }

        scheduleClose();
        return;
      }

      const result = getWordAtPoint(e.clientX, e.clientY);

      if (result) {
        clearCloseTimeout();

        // If the word changed, update the ghost trigger instantly
        if (result.word !== hoveredWord || !virtualRect) {
          setHoveredWord(result.word);
          setVirtualRect(result.rect);

          // Clear existing timeout when moving to a new word
          if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
          }

          // Set a timeout to open the menu automatically on hover
          hoverTimeoutRef.current = setTimeout(() => {
            setActiveWord(result.word);
            setActiveRect(result.rect);
            setIsOpen(true);
          }, 300); // 300ms hover delay
        }
      } else {
        setHoveredWord(null);
        setVirtualRect(null);

        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = null;
        }
      }
    },
    [isOpen, hoveredWord, virtualRect, activeWord, activeRect],
  );

  const handleClick = useCallback((e: MouseEvent) => {
    // Keep the click functionality as a fallback or to force it
    const result = getWordAtPoint(e.clientX, e.clientY);
    if (result) {
      // Stop propagation to prevent parent (e.g. Card) click events from firing
      e.stopPropagation();
      e.preventDefault();

      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      setActiveWord(result.word);
      setActiveRect(result.rect);
      setIsOpen(true);
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (!isOpen) {
      setHoveredWord(null);
      setVirtualRect(null);
    }
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, [isOpen]);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    // Use capture phase for click to intercept it before it reaches parent elements
    window.addEventListener("click", handleClick, { capture: true });
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("click", handleClick, { capture: true });
      window.removeEventListener("scroll", handleScroll);
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, [handleMouseMove, handleClick, handleScroll]);

  return (
    <>
      {/* Ghost Trigger: Renders the actual interactive style over the text */}
      {hoveredWord && virtualRect && (
        <div
          className={clsx(
            "fixed pointer-events-none z-[49] transition-all duration-150 rounded-sm",
            "bg-[#0DAA94]/10 border-b-2 border-[#0DAA94]/40",
          )}
          style={{
            top: virtualRect.top,
            left: virtualRect.left,
            width: virtualRect.width,
            height: virtualRect.height,
          }}
        >
          <style
            dangerouslySetInnerHTML={{
              __html: `body { cursor: pointer !important; }`,
            }}
          />
        </div>
      )}

      {activeWord && activeRect && (
        <WordMenu
          word={activeWord}
          virtualRect={activeRect}
          open={isOpen}
          onOpenChange={setIsOpen}
          onAskAI={askAboutWord}
          isHighlighted={false}
        />
      )}
    </>
  );
};
