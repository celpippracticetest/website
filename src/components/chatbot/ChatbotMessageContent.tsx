"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

interface ChatbotMessageContentProps {
  content: string;
  variant?: "user" | "assistant";
}

export default function ChatbotMessageContent({
  content,
  variant = "assistant",
}: ChatbotMessageContentProps) {
  const isUser = variant === "user";

  const tableBorder = isUser ? "border-white/30" : "border-gray-300";
  const tableHeaderBg = isUser ? "bg-white/10" : "bg-gray-50";

  const components: Components = {
    table: ({ children }) => (
      <div className="my-3 w-full overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => <thead>{children}</thead>,
    tbody: ({ children }) => <tbody>{children}</tbody>,
    tr: ({ children }) => <tr>{children}</tr>,
    th: ({ children }) => (
      <th
        className={`border ${tableBorder} ${tableHeaderBg} px-3 py-2 font-semibold align-top`}
      >
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className={`border ${tableBorder} px-3 py-2 align-top`}>
        {children}
      </td>
    ),
  };

  return (
    <div
      className={`text-sm prose prose-sm max-w-none break-words leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 ${
        isUser
          ? "prose-invert prose-p:text-white prose-headings:text-white prose-strong:text-white prose-li:text-white prose-code:text-white prose-pre:text-white"
          : "prose-p:text-gray-900 prose-headings:text-gray-900 prose-strong:text-gray-900 prose-li:text-gray-900 prose-ul:my-2 prose-ol:my-2 prose-headings:my-2 prose-p:my-2"
      }`}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
