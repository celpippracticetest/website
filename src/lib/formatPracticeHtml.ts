const TITLE_BULLET = `<span style="display:inline-block;width:6px;height:6px;border-radius:9999px;background:#212E42;flex-shrink:0" aria-hidden="true"></span>`;

const LI_STYLE =
  "margin:0 !important;padding:0 0 0 0.25rem;line-height:1.4";
const UL_STYLE =
  "list-style-type:disc;list-style-position:outside;padding-left:1.25rem;margin:0.25rem 0 !important";

/** Turn consecutive "- item" lines into a real bullet list. */
function formatDashLists(content: string): string {
  const withItems = content.replace(
    /(^|\n|<br\s*\/?>)-[ \t]*([^\n<]+)/gi,
    (_match, prefix: string, item: string) =>
      `${prefix}<li style="${LI_STYLE}">${item.trim()}</li>`,
  );

  return withItems.replace(
    /(?:<li\b[^>]*>[\s\S]*?<\/li>(?:\s|<br\s*\/?>)*)+/gi,
    (block) => {
      const items = block
        .replace(/<br\s*\/?>/gi, "")
        .replace(/<\/li>\s*<li/gi, "</li><li")
        .trim();
      return `<ul style="${UL_STYLE}">${items}</ul>`;
    },
  );
}

/**
 * Convert light markdown in practice passage HTML into readable markup.
 * - Lines starting with ** become a bullet + title row
 * - Lines starting with - become bullet list items
 * - Paired **text** becomes bold
 */
export function formatPracticeHtml(content: string): string {
  return formatDashLists(
    content
      .replace(
        /(^|\n|<br\s*\/?>|<p[^>]*>)\*\*\s*([^\n<]+?)(?:\*\*)?(?=\n|$|<br|<\/p>)/gi,
        (_match, prefix: string, title: string) =>
          `${prefix}<span style="display:inline-flex;align-items:center;gap:8px;font-weight:600;margin:4px 0">${TITLE_BULLET}${title.trim()}</span>`,
      )
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*\*/g, ""),
  );
}
