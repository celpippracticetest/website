"use client";

import { useEffect } from "react";
import { copyToClipboard } from "@/lib/clipboard";

/**
 * Wires up interactive bits inside the server-rendered article HTML:
 * the Copy button on copy boxes (`data-copy-button`).
 */
export default function BlogArticleEnhancer({ articleId }: { articleId: string }) {
  useEffect(() => {
    const root = document.getElementById(articleId);
    if (!root) return;
    const timers = new Set<ReturnType<typeof setTimeout>>();

    const onClick = async (event: MouseEvent) => {
      const button = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>("[data-copy-button]");
      if (!button || !root.contains(button)) return;
      const content = button.closest("[data-copy-block]")?.querySelector<HTMLElement>("[data-copy-content]");
      if (!content) return;
      const text = content.innerText.replace(/\n{3,}/g, "\n\n").trim();
      if (!(await copyToClipboard(text))) return;
      const label = button.querySelector("[data-copy-label]");
      button.setAttribute("data-copied", "");
      if (label) label.textContent = "Copied";
      const timer = setTimeout(() => {
        button.removeAttribute("data-copied");
        if (label) label.textContent = "Copy";
        timers.delete(timer);
      }, 2000);
      timers.add(timer);
    };

    root.addEventListener("click", onClick);
    return () => {
      root.removeEventListener("click", onClick);
      timers.forEach(clearTimeout);
    };
  }, [articleId]);

  return null;
}
