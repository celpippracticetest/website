import React, { useState, useRef } from "react";
import { Plus, Sparkles, Volume2 } from "lucide-react";
import * as Popover from "@radix-ui/react-popover";

interface WordMenuProps {
    word: string;
    onAskAI?: (word: string) => void;
}

export const WordMenu: React.FC<WordMenuProps> = ({ word, onAskAI }) => {
    const [isOpen, setIsOpen] = useState(false);
    const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleMouseEnter = () => {
        if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
        }
        setIsOpen(true);
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

    const handleAddToWords = (e: React.MouseEvent) => {
        e.stopPropagation();
        // Logic to add to words (placeholder for now)
        console.log("Adding to words:", word);
        // You might want to show a toast here
    };

    const handleAskAI = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsOpen(false);
        if (onAskAI) {
            onAskAI(word);
        }
    };

    return (
        <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
            <Popover.Trigger asChild>
                <span
                    className="font-bold text-[#0DAA94] cursor-pointer rounded-md px-1 transition-all duration-200 border border-transparent hover:border-[#0DAA94] hover:bg-[#E0F2F1] hover:shadow-sm"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    onClick={(e) => {
                        e.preventDefault();
                        setIsOpen(!isOpen);
                    }}
                >
                    {word}
                </span>
            </Popover.Trigger>

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
                            {/* <button
                                onClick={handleAddToWords}
                                className="cursor-pointer flex items-center gap-3 w-full px-3 py-2 text-sm text-slate-700 hover:bg-[#F2FFFD] hover:text-[#0DAA94] rounded-lg transition-colors text-left"
                            >
                                <div className="bg-[#0DAA94] text-white p-1 rounded-md">
                                    <Plus size={14} strokeWidth={3} />
                                </div>
                                <span className="font-medium">Add to words</span>
                            </button> */}

                            <button
                                onClick={handleAskAI}
                                className="cursor-pointer flex items-center gap-3 w-full px-3 py-2 text-sm text-slate-700 hover:bg-[#F2FFFD] hover:text-[#0DAA94] rounded-lg transition-colors text-left"
                            >
                                <Sparkles size={20} className="text-blue-500" />
                                <span className="font-medium">Ask AI</span>
                            </button>

                            <button
                                onClick={handlePronunciation}
                                className="cursor-pointer flex items-center gap-3 w-full px-3 py-2 text-sm text-slate-700 hover:bg-[#F2FFFD] hover:text-[#0DAA94] rounded-lg transition-colors text-left"
                            >
                                <div className="text-[#0DAA94]">
                                    <Volume2 size={20} className="" />
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