import React from "react";
import { WordMenu } from "./WordMenu";

interface InteractiveTextProps {
    text: string;
    onAskAI?: (word: string) => void;
}

export const InteractiveText: React.FC<InteractiveTextProps> = ({ text, onAskAI }) => {
    if (!text) return null;

    // Regex breakdown:
    // 1. (\*\*[^*]+\*\*) -> Matches bolded words like **word**
    // 2. ([a-zA-ZÀ-ÿ0-9'-]+) -> Matches standard words, including accented chars and hyphens
    // 3. (\n) -> Matches newlines
    // 4. (\s+) -> Matches other whitespace
    // 5. (.) -> Matches any other single character (punctuation, etc.)
    const parts = text.split(/(\*\*[^*]+\*\*)|([a-zA-ZÀ-ÿ0-9'-]+)|(\n)|(\s+)/g).filter(Boolean);

    return (
        <>
            {parts.map((part, index) => {
                // Handle bolded words
                if (part.startsWith("**") && part.endsWith("**")) {
                    const word = part.slice(2, -2);
                    return <WordMenu key={index} word={word} onAskAI={onAskAI} isHighlighted={true} />;
                }

                // Handle standard words (Group 2 in regex)
                // We check if it's a word-like string (not just whitespace or newline)
                if (/^[a-zA-ZÀ-ÿ0-9'-]+$/.test(part)) {
                    return <WordMenu key={index} word={part} onAskAI={onAskAI} isHighlighted={false} />;
                }

                // Handle newlines
                if (part === "\n") {
                    return <br key={index} />;
                }

                // Handle whitespaces and punctuation (they will fall into "other parts" or group 4/5)
                return <React.Fragment key={index}>{part}</React.Fragment>;
            })}
        </>
    );
};
