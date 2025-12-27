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
            document.body.style.cursor = 'pointer';
            setHighlightRect(result.rect);
        } else {
            document.body.style.cursor = 'default';
            if (!isOpen) {
                setHighlightRect(null);
            }
        }

        if (isOpen) return;

        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(() => {
            const result = getWordAtPoint(mousePos.current.x, mousePos.current.y);
            if (result) {
                setHoveredWord(result.word);
                setVirtualRect(result.rect);
                setIsOpen(true);
            }
        }, 200); // Debounce reduced to 200ms as requested
    }, [isOpen]);

    useEffect(() => {
        window.addEventListener("mousemove", handleMouseMove);
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            if (timerRef.current) clearTimeout(timerRef.current);
            document.body.style.cursor = 'default';
        };
    }, [handleMouseMove]);

    // Cleanup highlight when popover closes
    useEffect(() => {
        if (!isOpen) {
            setHighlightRect(null);
        }
    }, [isOpen]);

    return (
        <>
            {/* Real-time Highlight Overlay */}
            {highlightRect && (
                <div
                    className="fixed pointer-events-none z-[49] bg-[#E0F2F1] rounded-sm transition-all duration-75 border-b border-[#0DAA94]/20"
                    style={{
                        top: highlightRect.top - 2,
                        left: highlightRect.left - 2,
                        width: highlightRect.width + 4,
                        height: highlightRect.height + 4,
                    }}
                />
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
