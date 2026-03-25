import React, { useState, useRef, useEffect } from "react";
import Add from "@mui/icons-material/Add";
import AutoAwesome from "@mui/icons-material/AutoAwesome";
import VolumeUp from "@mui/icons-material/VolumeUp";
import * as Popover from "@radix-ui/react-popover";
import { useUser } from "@clerk/nextjs";
import { useAuthModalStore } from "@/store/useAuthModal.store";
import clsx from "clsx";

interface WordMenuProps {
    word: string;
    onAskAI?: (word: string) => void;
    isHighlighted?: boolean;
    virtualRect?: DOMRect | null;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export const WordMenu: React.FC<WordMenuProps> = ({
    word,
    onAskAI,
    isHighlighted = true,
    virtualRect,
    open: controlledOpen,
    onOpenChange: controlledOnOpenChange
}) => {
    const [uncontrolledOpen, setUncontrolledOpen] = useState(false);

    const isOpen = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;
    const setIsOpen = controlledOnOpenChange !== undefined ? controlledOnOpenChange : setUncontrolledOpen;

    const { isSignedIn } = useUser();
    const { setShowLoginModal } = useAuthModalStore();

    const [isSaved, setIsSaved] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Check if word is already saved when the popover opens
    useEffect(() => {
        if (isOpen && isSignedIn) {
            checkIfSaved();
        }
    }, [isOpen, word, isSignedIn]);

    const checkIfSaved = async () => {
        if (!isSignedIn) return;
        setIsChecking(true);
        try {
            const response = await fetch(`/api/user-words?word=${encodeURIComponent(word)}`);
            if (response.ok) {
                const data = await response.json();
                setIsSaved(data.saved);
            }
        } catch (error) {
            console.error("Error checking saved status:", error);
        } finally {
            setIsChecking(false);
        }
    };

    const handleMouseEnter = () => {
        if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
        }
    };

    const handleMouseLeave = () => {
        closeTimeoutRef.current = setTimeout(() => {
            setIsOpen(false);
        }, 300); // 300ms delay before closing
    };

    // Function to handle pronunciation
    const handlePronunciation = (e: React.MouseEvent) => {
        e.stopPropagation();
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = "en-US";
        window.speechSynthesis.speak(utterance);
    };

    const handleSaveWord = async (e: React.MouseEvent) => {
        e.stopPropagation();

        if (!isSignedIn) {
            setIsOpen(false);
            setShowLoginModal(true, "Please log in to add the word");
            return;
        }

        if (isSaved) {
            // Redirect or show navigation to words page
            window.location.href = "/words";
            return;
        }

        try {
            const response = await fetch("/api/user-words", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ word }),
            });
            if (response.ok) {
                setIsSaved(true);
            }
        } catch (error) {
            console.error("Error saving word:", error);
        }
    };

    const handleAskAI = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsOpen(false);

        if (!isSignedIn) {
            setShowLoginModal(true, "Please log in to add the word");
            return;
        }

        if (onAskAI) {
            onAskAI(word);
        }
    };

    return (
        <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
            {virtualRect ? (
                <Popover.Anchor virtualRef={{
                    current: {
                        getBoundingClientRect: () => virtualRect
                    } as any
                }} />
            ) : (
                <Popover.Trigger asChild>
                    <span
                        data-word-menu="true"
                        className={clsx(
                            "cursor-pointer transition-all duration-200 rounded-sm px-0.5 -mx-0.5",
                            isHighlighted
                                ? "font-bold text-[#0DAA94] border border-transparent hover:border-[#0DAA94] hover:bg-[#E0F2F1] hover:shadow-sm"
                                : "text-inherit hover:text-[#0DAA94] hover:bg-[#E0F2F1] underline decoration-transparent hover:decoration-[#0DAA94]/30 underline-offset-4"
                        )}
                        onMouseLeave={handleMouseLeave}
                        onClick={(e) => {
                            e.preventDefault();
                            setIsOpen(!isOpen);
                        }}
                    >
                        {word}
                    </span>
                </Popover.Trigger>
            )}

            <Popover.Portal>
                <Popover.Content
                    className="z-50 w-48 rounded-xl bg-white p-0 shadow-[0_10px_38px_-10px_hsla(206,22%,7%,.35),0_10px_20px_-15px_hsla(206,22%,7%,.2)] border border-slate-100 will-change-[transform,opacity] 
                    duration-300 ease-out
                    data-[state=open]:animate-in data-[state=closed]:animate-out 
                    data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 
                    data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 
                    data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 
                    data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
                    sideOffset={5}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    <div className="flex flex-col">
                        {/* Header: The Word */}
                        <div className="px-4 py-3 border-b border-slate-100">
                            <span className="font-bold text-[#0DAA94] text-lg">{word}</span>
                        </div>

                        {/* Menu Items */}
                        <div className="p-1 flex flex-col gap-1">
                            <button
                                onClick={handleSaveWord}
                                disabled={isChecking}
                                className="cursor-pointer flex items-center gap-3 w-full px-3 py-2 text-sm text-slate-700 hover:bg-[#F2FFFD] hover:text-[#0DAA94] rounded-lg transition-colors text-left disabled:opacity-50"
                            >
                                <div className="bg-[#0DAA94] text-white p-1 rounded-md">
                                    {isSaved ? <AutoAwesome sx={{ fontSize: 14 }} /> : <Add sx={{ fontSize: 14 }} />}
                                </div>
                                <span className="font-medium">{isSaved ? "Show in words" : "Add to words"}</span>
                            </button>

                            <button
                                onClick={handleAskAI}
                                className="cursor-pointer flex items-center gap-3 w-full px-3 py-2 text-sm text-slate-700 hover:bg-[#F2FFFD] hover:text-[#0DAA94] rounded-lg transition-colors text-left"
                            >
                                <AutoAwesome sx={{ fontSize: 20 }} className="text-blue-500" />
                                <span className="font-medium">Ask AI</span>
                            </button>

                            <button
                                onClick={handlePronunciation}
                                className="cursor-pointer flex items-center gap-3 w-full px-3 py-2 text-sm text-slate-700 hover:bg-[#F2FFFD] hover:text-[#0DAA94] rounded-lg transition-colors text-left"
                            >
                                <div className="text-[#0DAA94]">
                                    <VolumeUp size={20} className="" />
                                </div>
                                <span className="font-medium">Pronunciation</span>
                            </button>
                        </div>
                    </div>
                    <Popover.Arrow className="fill-white" />
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
};