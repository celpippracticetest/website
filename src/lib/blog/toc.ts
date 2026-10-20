export type BlogTocItem = {
  id: string;
  text: string;
  level: 2 | 3;
};

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
};

function headingText(innerHtml: string): string {
  return innerHtml
    .replace(/<[^>]+>/g, "")
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (entity) => ENTITIES[entity] ?? entity)
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/[\s-]+/g, "-")
      .slice(0, 80) || "section"
  );
}

/**
 * Gives every H2/H3 in the article a stable id (keeps ids authors already set)
 * and returns the outline for the table of contents.
 */
export function withHeadingAnchors(html: string): { html: string; toc: BlogTocItem[] } {
  const toc: BlogTocItem[] = [];
  const used = new Map<string, number>();

  const out = html.replace(
    /<h([23])(\s[^>]*)?>([\s\S]*?)<\/h\1>/gi,
    (match, levelRaw: string, attrsRaw: string | undefined, inner: string) => {
      const text = headingText(inner);
      if (!text) return match;
      const attrs = attrsRaw ?? "";
      const existing = attrs.match(/\sid\s*=\s*(["'])([^"']+)\1/i)?.[2];
      let id = existing ?? slugify(text);
      if (!existing) {
        const seen = used.get(id) ?? 0;
        used.set(id, seen + 1);
        if (seen > 0) id = `${id}-${seen + 1}`;
      }
      const level = levelRaw === "3" ? 3 : 2;
      toc.push({ id, text, level });
      if (existing) return match;
      return `<h${levelRaw} id="${id}"${attrs}>${inner}</h${levelRaw}>`;
    },
  );

  return { html: out, toc };
}
