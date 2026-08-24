import type { Extensions, JSONContent } from "@tiptap/core";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import { TableKit } from "@tiptap/extension-table/kit";
import StarterKit from "@tiptap/starter-kit";

/** Shared Tiptap extensions for the CMS editor. */
export const blogEditorExtensions: Extensions = [
  StarterKit.configure({
    heading: {
      levels: [2, 3, 4],
    },
    link: false,
    underline: false,
  }),
  Underline,
  Link.configure({
    openOnClick: false,
    autolink: true,
    defaultProtocol: "https",
    HTMLAttributes: {
      target: "_self",
    },
  }),
  Image,
  TableKit,
];

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

function renderNodes(nodes?: JsonNode[]): string {
  return (nodes ?? []).map(renderNode).join("");
}

function tableCellTag(tag: "th" | "td", node: JsonNode): string {
  const colspan = Number(node.attrs?.colspan ?? 1);
  const rowspan = Number(node.attrs?.rowspan ?? 1);
  const colspanAttr = colspan > 1 ? attr("colspan", colspan) : "";
  const rowspanAttr = rowspan > 1 ? attr("rowspan", rowspan) : "";
  return `<${tag}${colspanAttr}${rowspanAttr}>${renderNodes(node.content)}</${tag}>`;
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
      return `<table>${renderNodes(node.content)}</table>`;
    case "tableRow":
      return `<tr>${renderNodes(node.content)}</tr>`;
    case "tableHeader":
      return tableCellTag("th", node);
    case "tableCell":
      return tableCellTag("td", node);
    case "codeBlock":
      return `<pre><code>${renderNodes(node.content)}</code></pre>`;
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
