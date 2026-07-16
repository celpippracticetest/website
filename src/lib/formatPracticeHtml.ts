const BOOK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4A7DFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0" aria-hidden="true"><path d="M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0"/><path d="M3 6a9 9 0 0 1 9 0a9 9 0 0 1 9 0"/><path d="M3 6v13"/><path d="M12 6v13"/><path d="M21 6v13"/></svg>`;

/**
 * Convert light markdown in practice passage HTML into readable markup.
 * Lines starting with ** become an icon + title row; paired **text** becomes bold.
 */
export function formatPracticeHtml(content: string): string {
  return content
    .replace(
      /(^|\n|<br\s*\/?>|<p[^>]*>)\*\*\s*([^\n<]+?)(?:\*\*)?(?=\n|$|<br|<\/p>)/gi,
      (_match, prefix: string, title: string) =>
        `${prefix}<span style="display:inline-flex;align-items:center;gap:6px;font-weight:600;margin:4px 0">${BOOK_ICON}${title.trim()}</span>`,
    )
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*\*/g, "");
}
