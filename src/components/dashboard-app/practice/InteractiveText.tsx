import React from "react";

interface InteractiveTextProps {
  text: string;
  onAskAI?: (word: string) => void;
}

export const InteractiveText: React.FC<InteractiveTextProps> = ({ text }) => {
  if (!text) return null;

  // Keep markdown highlights, but do not mount a Popover per word.
  // Closing the result sheet unmounted hundreds of Radix portals and crashed.
  // Word menus are handled by GlobalInteractiveProvider instead.
  const parts = text
    .split(/(\*\*[^*]+\*\*)|([a-zA-ZÀ-ÿ0-9'-]+)|(\n)|(\s+)/g)
    .filter(Boolean);

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          const word = part.slice(2, -2);
          return (
            <span
              key={index}
              className="font-bold text-[#0DAA94] rounded-sm px-0.5 -mx-0.5"
            >
              {word}
            </span>
          );
        }

        if (/^[a-zA-ZÀ-ÿ0-9'-]+$/.test(part)) {
          return <React.Fragment key={index}>{part}</React.Fragment>;
        }

        if (part === "\n") {
          return <br key={index} />;
        }

        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </>
  );
};
