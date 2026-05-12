import React, { useState, useEffect, useRef, useCallback } from "react";
import { WordMenu } from "./WordMenu";
import { useAskBeavoStore } from "@/stores/askBeavoStore";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import { useAuthModalStore } from "@/store/useAuthModal.store";
import clsx from "clsx";

export const GlobalInteractiveProvider: React.FC = () => {
    const [hoveredWord, setHoveredWord] = useState<string | null>(null);
    const [virtualRect, setVirtualRect] = useState<DOMRect | null>(null);
    const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [activeWord, setActiveWord] = useState<string | null>(null);
    const [activeRect, setActiveRect] = useState<DOMRect | null>(null);
    const { askAboutWord } = useAskBeavoStore();
    const { isSignedIn, user, isLoaded: isUserLoaded } = useHybridWebUser();
    const { setShowLoginModal } = useAuthModalStore();

    const hoverVocabularyEnabled =
        isUserLoaded &&
        isSignedIn === true &&
        user?.unsafeMetadata?.hoverVocabularyEnabled === true;

    const mousePos = useRef({ x: 0, y: 0 });

    // Helper to check if an element should be ignored (interactive elements)
    const isIgnoredElement = (el: HTMLElement | null): boolean => {
        if (!el) return false;
        const tag = el.tagName.toLowerCase();

        // 1. Direct tag check
        const isInteractiveTag = ["button", "a", "input", "textarea", "select", "svg", "path"].includes(tag);

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
            if (x >= rects[i].left && x <= rects[i].right && y >= rects[i].top && y <= rects[i].bottom) {
                bestRect = rects[i];
                break;
            }
        }

        if (!bestRect) return null;

        return { word, rect: bestRect };
    };

    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        mousePos.current = { x: e.clientX, y: e.clientY };

        const result = getWordAtPoint(e.clientX, e.clientY);

        if (result) {
            // If the word changed, update the ghost trigger instantly
            if (result.word !== hoveredWord || !virtualRect) {
                // If moving to a DIFFERENT word, close the current menu
                if (isOpen && result.word !== activeWord) {
                    setIsOpen(false);
                }

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
            // If we moved away from a word
            if (!isOpen) {
                setHoveredWord(null);
                setVirtualRect(null);
            }

            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
                hoverTimeoutRef.current = null;
            }
        }
    }, [isOpen, hoveredWord, virtualRect, activeWord]);

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
        if (!hoverVocabularyEnabled) {
            setHoveredWord(null);
            setVirtualRect(null);
            setIsOpen(false);
            setActiveWord(null);
            setActiveRect(null);
            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
                hoverTimeoutRef.current = null;
            }
        }
    }, [hoverVocabularyEnabled]);

    useEffect(() => {
        if (!hoverVocabularyEnabled) return;
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
        };
    }, [hoverVocabularyEnabled, handleMouseMove, handleClick, handleScroll]);

    if (!hoverVocabularyEnabled) {
        return null;
    }

    return (
        <>
            {/* Ghost Trigger: Renders the actual interactive style over the text */}
            {hoveredWord && virtualRect && (
                <div
                    className={clsx(
                        "fixed pointer-events-none z-[49] transition-all duration-150 rounded-sm",
                        "bg-[#0DAA94]/10 border-b-2 border-[#0DAA94]/40"
                    )}
                    style={{
                        top: virtualRect.top,
                        left: virtualRect.left,
                        width: virtualRect.width,
                        height: virtualRect.height,
                    }}
                >
                    <style dangerouslySetInnerHTML={{ __html: `body { cursor: pointer !important; }` }} />
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
