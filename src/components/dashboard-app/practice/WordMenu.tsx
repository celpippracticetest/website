import React, { useState } from "react";
import { Plus, Sparkles, Volume2 } from "lucide-react";
import * as Popover from "@radix-ui/react-popover";

interface WordMenuProps {
    word: string;
    onAskAI?: (word: string) => void;
}

export const WordMenu: React.FC<WordMenuProps> = ({ word, onAskAI }) => {
    const [isOpen, setIsOpen] = useState(false);

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
                    onMouseEnter={() => setIsOpen(true)}
                    onMouseLeave={() => setIsOpen(false)}
                    onClick={(e) => {
                        e.preventDefault();
                        // Optional: Toggle on click if not using hover
                        setIsOpen(!isOpen);
                    }}
                >
                    {word}
                </span>
            </Popover.Trigger>

            <Popover.Portal>
                <Popover.Content
                    className="z-50 w-48 rounded-xl bg-white p-0 shadow-[0_10px_38px_-10px_hsla(206,22%,7%,.35),0_10px_20px_-15px_hsla(206,22%,7%,.2)] border border-slate-100 will-change-[transform,opacity] data-[state=open]:data-[side=top]:animate-slideDownAndFade data-[state=open]:data-[side=right]:animate-slideLeftAndFade data-[state=open]:data-[side=bottom]:animate-slideUpAndFade data-[state=open]:data-[side=left]:animate-slideRightAndFade"
                    sideOffset={5}
                    onMouseEnter={() => setIsOpen(true)}
                    onMouseLeave={() => setIsOpen(false)}
                >
                    <div className="flex flex-col">
                        {/* Header: The Word */}
                        <div className="px-4 py-3 border-b border-slate-100">
                            <span className="font-bold text-[#0DAA94] text-lg">{word}</span>
                        </div>

                        {/* Menu Items */}
                        <div className="p-1 flex flex-col gap-1">
                            <button
                                onClick={handleAddToWords}
                                className="flex items-center gap-3 w-full px-3 py-2 text-sm text-slate-700 hover:bg-[#F2FFFD] hover:text-[#0DAA94] rounded-lg transition-colors text-left"
                            >
                                <div className="bg-[#0DAA94] text-white p-1 rounded-md">
                                    <Plus size={14} strokeWidth={3} />
                                </div>
                                <span className="font-medium">Add to words</span>
                            </button>

                            <button
                                onClick={handleAskAI}
                                className="flex items-center gap-3 w-full px-3 py-2 text-sm text-slate-700 hover:bg-[#F2FFFD] hover:text-[#0DAA94] rounded-lg transition-colors text-left"
                            >
                                <Sparkles size={20} className="text-blue-500" />
                                <span className="font-medium">Ask AI</span>
                            </button>

                            <button
                                onClick={handlePronunciation}
                                className="flex items-center gap-3 w-full px-3 py-2 text-sm text-slate-700 hover:bg-[#F2FFFD] hover:text-[#0DAA94] rounded-lg transition-colors text-left"
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