import React, { useState, useEffect, useRef, useCallback } from "react";
import { WordMenu } from "./WordMenu";
import { useAskBeavoStore } from "@/stores/askBeavoStore";
import clsx from "clsx";

export const GlobalInteractiveProvider: React.FC = () => {
    const [hoveredWord, setHoveredWord] = useState<string | null>(null);
    const [virtualRect, setVirtualRect] = useState<DOMRect | null>(null);
    const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const { askAboutWord } = useAskBeavoStore();

    const mousePos = useRef({ x: 0, y: 0 });
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Helper to check if an element should be ignored (interactive elements)
    const isIgnoredElement = (el: HTMLElement | null): boolean => {
        if (!el) return false;
        const tag = el.tagName.toLowerCase();
        const isInteractive = ["button", "a", "input", "textarea", "select", "svg", "path"].includes(tag) ||
            el.getAttribute("role") === "button" ||
            el.getAttribute("data-word-menu") === "true" ||
            el.onclick != null ||
            el.closest("button") != null ||
            el.closest("a") != null ||
            el.closest("[data-word-menu='true']") != null;
        return isInteractive;
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
        while (start > 0 && /[a-zA-ZÀ-ÿ0-9'-]/.test(text[start - 1])) {
            start--;
        }
        let end = offset;
        while (end < text.length && /[a-zA-ZÀ-ÿ0-9'-]/.test(text[end])) {
            end++;
        }

        const word = text.slice(start, end).trim();
        if (!word || word.length < 2) return null;

        if (isIgnoredElement(node.parentElement)) return null;

        const wordRange = document.createRange();
        wordRange.setStart(node, start);
        wordRange.setEnd(node, end);
        const rects = wordRange.getClientRects();

        let bestRect = rects[0] || wordRange.getBoundingClientRect();
        for (let i = 0; i < rects.length; i++) {
            if (x >= rects[i].left && x <= rects[i].right && y >= rects[i].top && y <= rects[i].bottom) {
                bestRect = rects[i];
                break;
            }
        }

        return { word, rect: bestRect };
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        mousePos.current = { x: e.clientX, y: e.clientY };

        const result = getWordAtPoint(e.clientX, e.clientY);

        if (result) {
            // If the word changed, update the ghost trigger instantly
            if (result.word !== hoveredWord || !virtualRect) {
                setHoveredWord(result.word);
                setVirtualRect(result.rect);
                setIsOpen(false); // Close previous popover if any
            }
        } else {
            // If we moved away from a word and no popover is open, clean up
            if (!isOpen) {
                setHoveredWord(null);
                setVirtualRect(null);
            }
        }

        if (isOpen) return;

        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(() => {
            const currentResult = getWordAtPoint(mousePos.current.x, mousePos.current.y);
            // Only open if we are still hovering the SAME word after 200ms
            if (currentResult && currentResult.word === hoveredWord) {
                setIsOpen(true);
            }
        }, 200);
    }, [isOpen, hoveredWord, virtualRect]);

    useEffect(() => {
        window.addEventListener("mousemove", handleMouseMove);
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [handleMouseMove]);

    return (
        <>
            {/* Ghost Trigger: Renders the actual interactive style over the text */}
            {hoveredWord && virtualRect && (
                <div
                    className={clsx(
                        "fixed pointer-events-none z-[49] flex items-center justify-center transition-colors duration-150 rounded-sm",
                        "text-[#0DAA94] bg-[#E0F2F1] underline decoration-[#0DAA94]/30 underline-offset-4 font-normal cursor-pointer"
                    )}
                    style={{
                        top: virtualRect.top,
                        left: virtualRect.left,
                        width: virtualRect.width,
                        height: virtualRect.height,
                        fontSize: 'inherit', // Attempt to match parent if possible, but limited to rect
                        pointerEvents: 'none', // Critical: doesn't block mouse detection
                        cursor: 'pointer'
                    }}
                >
                    <style dangerouslySetInnerHTML={{ __html: `body { cursor: pointer !important; }` }} />
                    <span className="opacity-0">{hoveredWord}</span>
                </div>
            )}

            {hoveredWord && virtualRect && (
                <WordMenu
                    word={hoveredWord}
                    virtualRect={virtualRect}
                    open={isOpen}
                    onOpenChange={setIsOpen}
                    onAskAI={askAboutWord}
                    isHighlighted={false}
                />
            )}
        </>
    );
};
