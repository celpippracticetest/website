import { Mark, Node, mergeAttributes } from "@tiptap/core";
import { Table } from "@tiptap/extension-table";
import {
  BLOG_HIGHLIGHTS,
  BLOG_TEXT_COLORS,
  CALLOUT_VARIANTS,
  CHECKLIST_ICONS,
  CTA_BACKGROUNDS,
  CTA_BUTTONS,
  pickKey,
  type BlogHighlight,
  type BlogTextColor,
  type CalloutVariant,
  type ChecklistIcon,
  type CtaBackground,
  type CtaButton,
} from "@/lib/blog/blocks";

/**
 * Schema for the blog editor's custom blocks and marks. No React here: the
 * CMS editor adds node views on top (`.extend({ addNodeView })`).
 *
 * `parseHTML` accepts both the editor's own HTML and the published HTML from
 * `blogJsonToHtml` (same data-* hooks), so content round-trips either way.
 */

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    blogBlocks: {
      setTextColor: (color: BlogTextColor) => ReturnType;
      unsetTextColor: () => ReturnType;
      setBlogHighlight: (color: BlogHighlight) => ReturnType;
      unsetBlogHighlight: () => ReturnType;
      insertCallout: (variant: CalloutVariant) => ReturnType;
      insertCopyBlock: () => ReturnType;
      insertChecklist: () => ReturnType;
      insertCtaBox: () => ReturnType;
    };
  }
}

function dataAttr(name: string, fallback: string | null = null) {
  return {
    default: fallback,
    parseHTML: (element: HTMLElement) => element.getAttribute(`data-${name}`) ?? fallback,
    renderHTML: (attributes: Record<string, unknown>) => {
      const key = name.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase());
      const value = attributes[key];
      return value == null || value === "" ? {} : { [`data-${name}`]: String(value) };
    },
  };
}

/* ------------------------------------------------------------------ marks */

export const TextColor = Mark.create({
  name: "textColor",
  addAttributes() {
    return {
      color: {
        default: "blue",
        parseHTML: (element) => pickKey(element.getAttribute("data-color"), BLOG_TEXT_COLORS, "blue"),
        renderHTML: (attributes) => ({ "data-color": attributes.color }),
      },
    };
  },
  parseHTML() {
    return [{ tag: "span[data-color]" }];
  },
  renderHTML({ HTMLAttributes, mark }) {
    const color = pickKey(mark.attrs.color, BLOG_TEXT_COLORS, "blue");
    return ["span", mergeAttributes(HTMLAttributes, { class: BLOG_TEXT_COLORS[color].className }), 0];
  },
  addCommands() {
    return {
      setTextColor:
        (color) =>
        ({ commands }) =>
          commands.setMark(this.name, { color }),
      unsetTextColor:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },
});

export const BlogHighlightMark = Mark.create({
  name: "highlight",
  addAttributes() {
    return {
      color: {
        default: "yellow",
        parseHTML: (element) =>
          pickKey(element.getAttribute("data-highlight"), BLOG_HIGHLIGHTS, "yellow"),
        renderHTML: (attributes) => ({ "data-highlight": attributes.color }),
      },
    };
  },
  parseHTML() {
    return [{ tag: "mark" }];
  },
  renderHTML({ HTMLAttributes, mark }) {
    const color = pickKey(mark.attrs.color, BLOG_HIGHLIGHTS, "yellow");
    return ["mark", mergeAttributes(HTMLAttributes, { class: BLOG_HIGHLIGHTS[color].className }), 0];
  },
  addCommands() {
    return {
      setBlogHighlight:
        (color) =>
        ({ commands }) =>
          commands.setMark(this.name, { color }),
      unsetBlogHighlight:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },
});

/* ----------------------------------------------------------------- blocks */

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "(paragraph | bulletList | orderedList)+",
  defining: true,
  addAttributes() {
    return {
      variant: {
        default: "tip",
        parseHTML: (element) =>
          pickKey(element.getAttribute("data-callout"), CALLOUT_VARIANTS, "tip"),
        renderHTML: (attributes) => ({ "data-callout": attributes.variant }),
      },
    };
  },
  parseHTML() {
    return [{ tag: "aside[data-callout]", contentElement: "[data-callout-body]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["aside", HTMLAttributes, ["div", { "data-callout-body": "" }, 0]];
  },
  addCommands() {
    return {
      insertCallout:
        (variant) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { variant },
            content: [{ type: "paragraph" }],
          }),
    };
  },
});

export const CopyBlock = Node.create({
  name: "copyBlock",
  group: "block",
  content: "(paragraph | bulletList | orderedList)+",
  defining: true,
  addAttributes() {
    return { title: dataAttr("title", "Useful phrases") };
  },
  parseHTML() {
    return [{ tag: "div[data-copy-block]", contentElement: "[data-copy-content]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-copy-block": "" }),
      ["div", { "data-copy-content": "" }, 0],
    ];
  },
  addCommands() {
    return {
      insertCopyBlock:
        () =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { title: "Useful phrases" },
            content: [{ type: "paragraph" }],
          }),
    };
  },
});

export const ChecklistItem = Node.create({
  name: "checklistItem",
  content: "inline*",
  defining: true,
  addAttributes() {
    return {
      icon: {
        default: "check",
        parseHTML: (element) =>
          pickKey(element.getAttribute("data-checklist-item"), CHECKLIST_ICONS, "check"),
        renderHTML: (attributes) => ({ "data-checklist-item": attributes.icon }),
      },
    };
  },
  parseHTML() {
    return [{ tag: "li[data-checklist-item]", contentElement: "[data-checklist-text]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["li", HTMLAttributes, ["span", { "data-checklist-text": "" }, 0]];
  },
  addKeyboardShortcuts() {
    return {
      // Enter on an empty last item leaves the checklist (like lists do).
      Enter: ({ editor }) => {
        const { $from, empty } = editor.state.selection;
        if (!empty || $from.parent.type.name !== this.name) return false;
        if ($from.parent.content.size > 0) return false;
        const checklistDepth = $from.depth - 1;
        const checklist = $from.node(checklistDepth);
        const isLast = $from.index(checklistDepth) === checklist.childCount - 1;
        if (!isLast || checklist.childCount < 2) return false;
        const itemStart = $from.before();
        const itemEnd = $from.after();
        const afterChecklist = $from.after(checklistDepth);
        return editor
          .chain()
          .command(({ tr }) => {
            tr.delete(itemStart, itemEnd);
            return true;
          })
          .insertContentAt(afterChecklist - (itemEnd - itemStart), { type: "paragraph" })
          .focus(afterChecklist - (itemEnd - itemStart) + 1)
          .run();
      },
    };
  },
});

export const Checklist = Node.create({
  name: "checklist",
  group: "block",
  content: "checklistItem+",
  defining: true,
  addAttributes() {
    return {
      title: dataAttr("title", "Checklist"),
      description: dataAttr("description", ""),
    };
  },
  parseHTML() {
    return [{ tag: "div[data-checklist]", contentElement: "[data-checklist-items]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-checklist": "" }),
      ["ul", { "data-checklist-items": "" }, 0],
    ];
  },
  addCommands() {
    return {
      insertChecklist:
        () =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { title: "Before you submit", description: "" },
            content: [
              { type: "checklistItem", attrs: { icon: "check" } },
              { type: "checklistItem", attrs: { icon: "check" } },
            ],
          }),
    };
  },
});

export const CtaBox = Node.create({
  name: "ctaBox",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return {
      title: dataAttr("title", "Ready to reach your target CLB?"),
      description: dataAttr(
        "description",
        "Practise with real-format CELPIP tests and get instant feedback on every answer.",
      ),
      buttonText: dataAttr("button-text", "Start Free Practice"),
      href: dataAttr("href", "/sign-up"),
      background: {
        default: "blue",
        parseHTML: (element) =>
          pickKey<CtaBackground>(element.getAttribute("data-background"), CTA_BACKGROUNDS, "blue"),
        renderHTML: (attributes) => ({ "data-background": attributes.background }),
      },
      button: {
        default: "white",
        parseHTML: (element) =>
          pickKey<CtaButton>(element.getAttribute("data-button"), CTA_BUTTONS, "white"),
        renderHTML: (attributes) => ({ "data-button": attributes.button }),
      },
    };
  },
  parseHTML() {
    return [{ tag: "div[data-cta]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-cta": "" })];
  },
  addCommands() {
    return {
      insertCtaBox:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name }),
    };
  },
});

/* ------------------------------------------------------------------ table */

const TABLE_DESIGN_ATTRS = [
  "template",
  "headerBg",
  "headerText",
  "bodyBg",
  "bodyText",
  "borderColor",
  "borderWidth",
  "stripeBg",
  "striped",
  "fontSize",
  "padding",
  "align",
] as const;

export type TableDesignAttr = (typeof TABLE_DESIGN_ATTRS)[number];

function kebab(name: string): string {
  return name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

/** Table with design attributes (template + per-table overrides). */
export const DesignedTable = Table.extend({
  addAttributes() {
    const parent = this.parent?.() ?? {};
    const design = Object.fromEntries(
      TABLE_DESIGN_ATTRS.map((name) => [
        name,
        {
          default: null,
          parseHTML: (element: HTMLElement) => {
            const raw = element.getAttribute(`data-tb-${kebab(name)}`);
            if (raw == null) return null;
            if (name === "striped") return raw === "true";
            if (name === "borderWidth") return Number(raw);
            return raw;
          },
          renderHTML: (attributes: Record<string, unknown>) => {
            const value = attributes[name];
            return value == null ? {} : { [`data-tb-${kebab(name)}`]: String(value) };
          },
        },
      ]),
    );
    return { ...parent, ...design };
  },
});

export type { CalloutVariant, ChecklistIcon };
