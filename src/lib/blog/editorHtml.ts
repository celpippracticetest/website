import type { JSONContent } from "@tiptap/core";
import {
  BLOG_HIGHLIGHTS,
  BLOG_TEXT_COLORS,
  CALLOUT_BOX_CLASS,
  CALLOUT_HEADER_CLASS,
  CALLOUT_ICON_WRAP_CLASS,
  CALLOUT_VARIANTS,
  BLOCK_BODY_CLASS,
  CHECKLIST_BOX_CLASS,
  CHECKLIST_DESCRIPTION_CLASS,
  CHECKLIST_ICONS,
  CHECKLIST_ITEM_CLASS,
  CHECKLIST_LIST_CLASS,
  CHECKLIST_MARK_CLASS,
  CHECKLIST_TITLE_CLASS,
  COPY_BLOCK_BODY_CLASS,
  COPY_BLOCK_BUTTON_CLASS,
  COPY_BLOCK_CLASS,
  COPY_BLOCK_HEADER_CLASS,
  COPY_BLOCK_TITLE_CLASS,
  CTA_BACKGROUNDS,
  CTA_BOX_CLASS,
  CTA_BUTTON_CLASS,
  CTA_BUTTONS,
  CTA_TEXT_CLASS,
  CTA_TITLE_CLASS,
  TABLE_CLASS,
  TABLE_WRAPPER_CLASS,
  blogIconSvg,
  pickKey,
  resolveTableDesign,
  safeBlockHref,
  tableStyleVars,
} from "@/lib/blog/blocks";

type JsonMark = {
  type?: string;
  attrs?: Record<string, unknown>;
};

type JsonNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: JsonMark[];
  content?: JsonNode[];
};

function escapeText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(value: string): string {
  return escapeText(value).replace(/"/g, "&quot;");
}

function attr(name: string, value: unknown): string {
  if (value == null || value === "") {
    return "";
  }
  return ` ${name}="${escapeAttr(String(value))}"`;
}

function textAttr(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function renderNodes(nodes?: JsonNode[]): string {
  return (nodes ?? []).map(renderNode).join("");
}

const CELL_ALIGNS = new Set(["left", "center", "right"]);

function tableCellTag(tag: "th" | "td", node: JsonNode): string {
  const colspan = Number(node.attrs?.colspan ?? 1);
  const rowspan = Number(node.attrs?.rowspan ?? 1);
  const colspanAttr = colspan > 1 ? attr("colspan", colspan) : "";
  const rowspanAttr = rowspan > 1 ? attr("rowspan", rowspan) : "";
  const align = String(node.attrs?.align ?? "");
  const alignAttr = CELL_ALIGNS.has(align) ? attr("style", `text-align:${align}`) : "";
  return `<${tag}${colspanAttr}${rowspanAttr}${alignAttr}>${renderNodes(node.content)}</${tag}>`;
}

/** Column widths dragged in the editor (first row's `colwidth` attrs). */
function tableColgroup(node: JsonNode): string {
  const firstRow = node.content?.[0];
  if (!firstRow?.content?.length) return "";
  const cols: string[] = [];
  let hasWidth = false;
  for (const cell of firstRow.content) {
    const span = Math.max(1, Number(cell.attrs?.colspan ?? 1));
    const widths = Array.isArray(cell.attrs?.colwidth) ? (cell.attrs?.colwidth as unknown[]) : [];
    for (let i = 0; i < span; i += 1) {
      const width = Number(widths[i]);
      if (Number.isFinite(width) && width > 0) {
        hasWidth = true;
        cols.push(`<col style="width:${Math.round(width)}px">`);
      } else {
        cols.push("<col>");
      }
    }
  }
  return hasWidth ? `<colgroup>${cols.join("")}</colgroup>` : "";
}

function tableDataAttrs(attrs: Record<string, unknown> | undefined): string {
  if (!attrs) return "";
  return Object.entries(attrs)
    .filter(([key, value]) => value != null && !["style"].includes(key))
    .map(([key, value]) => attr(`data-tb-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`, value))
    .join("");
}

function renderTable(node: JsonNode): string {
  const design = resolveTableDesign(node.attrs);
  return (
    `<div class="${TABLE_WRAPPER_CLASS}" style="${tableStyleVars(design)}">` +
    `<table class="${TABLE_CLASS}"${tableDataAttrs(node.attrs)}>${tableColgroup(node)}<tbody>${renderNodes(node.content)}</tbody></table>` +
    `</div>`
  );
}

function renderCallout(node: JsonNode): string {
  const variant = pickKey(node.attrs?.variant, CALLOUT_VARIANTS, "tip");
  const style = CALLOUT_VARIANTS[variant];
  return (
    `<aside data-callout="${variant}" class="${CALLOUT_BOX_CLASS} ${style.box}">` +
    `<div class="${CALLOUT_HEADER_CLASS} ${style.accent}">` +
    `<span class="${CALLOUT_ICON_WRAP_CLASS} ${style.iconWrap}">${blogIconSvg(style.icon, "size-4")}</span>` +
    `<span>${escapeText(style.label)}</span>` +
    `</div>` +
    `<div data-callout-body class="${BLOCK_BODY_CLASS} ${style.body}">${renderNodes(node.content)}</div>` +
    `</aside>`
  );
}

function renderCopyBlock(node: JsonNode): string {
  const title = textAttr(node.attrs?.title) || "Copy";
  return (
    `<div data-copy-block${attr("data-title", title)} class="${COPY_BLOCK_CLASS}">` +
    `<div class="${COPY_BLOCK_HEADER_CLASS}">` +
    `<span class="${COPY_BLOCK_TITLE_CLASS}">${escapeText(title)}</span>` +
    `<button type="button" data-copy-button class="${COPY_BLOCK_BUTTON_CLASS}" aria-label="Copy ${escapeAttr(title)}">` +
    `${blogIconSvg("copy", "size-3.5")}<span data-copy-label>Copy</span>` +
    `</button>` +
    `</div>` +
    `<div data-copy-content class="${COPY_BLOCK_BODY_CLASS}">${renderNodes(node.content)}</div>` +
    `</div>`
  );
}

function renderChecklistItem(node: JsonNode): string {
  const icon = pickKey(node.attrs?.icon, CHECKLIST_ICONS, "check");
  const mark =
    icon === "check"
      ? `<span class="${CHECKLIST_MARK_CLASS.check}">${blogIconSvg("check", "size-3.5")}</span>`
      : `<span class="${CHECKLIST_MARK_CLASS.square}"></span>`;
  return (
    `<li data-checklist-item="${icon}" class="${CHECKLIST_ITEM_CLASS}">` +
    `${mark}<span data-checklist-text class="min-w-0 flex-1">${renderNodes(node.content)}</span>` +
    `</li>`
  );
}

function renderChecklist(node: JsonNode): string {
  const title = textAttr(node.attrs?.title);
  const description = textAttr(node.attrs?.description);
  return (
    `<div data-checklist${attr("data-title", title)}${attr("data-description", description)} class="${CHECKLIST_BOX_CLASS}">` +
    (title
      ? `<p class="${CHECKLIST_TITLE_CLASS}"><span class="grid size-8 shrink-0 place-items-center rounded-xl bg-[#ECF9F2] text-[#0B7A55]">${blogIconSvg("list", "size-[18px]")}</span><span>${escapeText(title)}</span></p>`
      : "") +
    (description ? `<p class="${CHECKLIST_DESCRIPTION_CLASS}">${escapeText(description)}</p>` : "") +
    `<ul data-checklist-items class="${CHECKLIST_LIST_CLASS}">${renderNodes(node.content)}</ul>` +
    `</div>`
  );
}

function renderCtaBox(node: JsonNode): string {
  const background = pickKey(node.attrs?.background, CTA_BACKGROUNDS, "blue");
  const button = pickKey(node.attrs?.button, CTA_BUTTONS, "white");
  const bg = CTA_BACKGROUNDS[background];
  const title = textAttr(node.attrs?.title);
  const description = textAttr(node.attrs?.description);
  const buttonText = textAttr(node.attrs?.buttonText);
  const href = safeBlockHref(node.attrs?.href);
  if (!title && !buttonText) return "";
  const dataAttrs =
    attr("data-title", title) +
    attr("data-description", description) +
    attr("data-button-text", buttonText) +
    attr("data-href", href) +
    attr("data-background", background) +
    attr("data-button", button);
  return (
    `<div data-cta${dataAttrs} class="${CTA_BOX_CLASS} ${bg.box}">` +
    `<div class="min-w-0">` +
    (title ? `<p class="${CTA_TITLE_CLASS} ${bg.title}">${escapeText(title)}</p>` : "") +
    (description ? `<p class="${CTA_TEXT_CLASS} ${bg.text}">${escapeText(description)}</p>` : "") +
    `</div>` +
    (buttonText && href
      ? `<a href="${escapeAttr(href)}" class="${CTA_BUTTON_CLASS} ${CTA_BUTTONS[button].className}">${escapeText(buttonText)}${blogIconSvg("arrowRight", "size-4 transition-transform duration-200 ease-out group-hover/cta:translate-x-0.5")}</a>`
      : "") +
    `</div>`
  );
}

function renderText(node: JsonNode): string {
  let html = escapeText(node.text ?? "");
  for (const mark of node.marks ?? []) {
    switch (mark.type) {
      case "bold":
        html = `<strong>${html}</strong>`;
        break;
      case "italic":
        html = `<em>${html}</em>`;
        break;
      case "underline":
        html = `<u>${html}</u>`;
        break;
      case "strike":
        html = `<s>${html}</s>`;
        break;
      case "code":
        html = `<code>${html}</code>`;
        break;
      case "textColor": {
        const color = pickKey(mark.attrs?.color, BLOG_TEXT_COLORS, "blue");
        html = `<span data-color="${color}" class="${BLOG_TEXT_COLORS[color].className}">${html}</span>`;
        break;
      }
      case "highlight": {
        const color = pickKey(mark.attrs?.color, BLOG_HIGHLIGHTS, "yellow");
        html = `<mark data-highlight="${color}" class="${BLOG_HIGHLIGHTS[color].className}">${html}</mark>`;
        break;
      }
      case "link": {
        const href = String(mark.attrs?.href ?? "").trim();
        if (!href) break;
        html = `<a href="${escapeAttr(href)}">${html}</a>`;
        break;
      }
      default:
        break;
    }
  }
  return html;
}

function renderNode(node: JsonNode): string {
  switch (node.type) {
    case "doc":
      return renderNodes(node.content);
    case "paragraph":
      return `<p>${renderNodes(node.content)}</p>`;
    case "heading": {
      const level = Number(node.attrs?.level);
      const headingLevel = level === 3 || level === 4 ? level : 2;
      return `<h${headingLevel}>${renderNodes(node.content)}</h${headingLevel}>`;
    }
    case "text":
      return renderText(node);
    case "hardBreak":
      return "<br>";
    case "bulletList":
      return `<ul>${renderNodes(node.content)}</ul>`;
    case "orderedList":
      return `<ol>${renderNodes(node.content)}</ol>`;
    case "listItem":
      return `<li>${renderNodes(node.content)}</li>`;
    case "blockquote":
      return `<blockquote>${renderNodes(node.content)}</blockquote>`;
    case "horizontalRule":
      return "<hr>";
    case "image":
      return `<img${attr("src", node.attrs?.src)}${attr("alt", node.attrs?.alt ?? "")}${attr("title", node.attrs?.title)}>`;
    case "table":
      return renderTable(node);
    case "tableRow":
      return `<tr>${renderNodes(node.content)}</tr>`;
    case "tableHeader":
      return tableCellTag("th", node);
    case "tableCell":
      return tableCellTag("td", node);
    case "codeBlock":
      return `<pre><code>${renderNodes(node.content)}</code></pre>`;
    case "callout":
      return renderCallout(node);
    case "copyBlock":
      return renderCopyBlock(node);
    case "checklist":
      return renderChecklist(node);
    case "checklistItem":
      return renderChecklistItem(node);
    case "ctaBox":
      return renderCtaBox(node);
    default:
      return renderNodes(node.content);
  }
}

export function blogJsonToHtml(json: JSONContent | null | undefined): string | null {
  if (!json || typeof json !== "object") {
    return null;
  }
  try {
    const html = renderNode(json as JsonNode).trim();
    return html || null;
  } catch (error) {
    console.error("Failed to generate blog HTML from editor JSON:", error);
    return null;
  }
}

export function resolveBlogContentHtml(contentHtml: string, contentJson?: unknown): string {
  const fromJson = blogJsonToHtml(contentJson as JSONContent | null | undefined);
  if (fromJson) {
    return fromJson;
  }
  return contentHtml ?? "";
}
