"use client";

import { useCallback } from "react";
import { Box } from "@/components/ui/Box";
import {
  EditorContent,
  ReactNodeViewRenderer,
  useEditor,
  useEditorState,
  type Editor,
} from "@tiptap/react";
import type { Extensions, JSONContent } from "@tiptap/core";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import { TableKit } from "@tiptap/extension-table/kit";
import StarterKit from "@tiptap/starter-kit";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Ban,
  Baseline,
  Bold,
  ChevronDown,
  CircleCheckBig,
  Copy,
  Eraser,
  Heading2,
  Heading3,
  Highlighter,
  ImagePlus,
  Info,
  Italic,
  Lightbulb,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Megaphone,
  Minus,
  PenLine,
  Pilcrow,
  Plus,
  Quote,
  Redo2,
  Strikethrough,
  Table2,
  TriangleAlert,
  Underline as UnderlineIcon,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import {
  BLOG_HIGHLIGHTS,
  BLOG_TEXT_COLORS,
  CALLOUT_VARIANTS,
  type BlogHighlight,
  type BlogTextColor,
  type CalloutVariant,
} from "@/lib/blog/blocks";
import {
  BlogHighlightMark,
  Callout,
  Checklist,
  ChecklistItem,
  CopyBlock,
  CtaBox,
  DesignedTable,
  TextColor,
} from "@/lib/blog/editorNodes";
import {
  CalloutView,
  ChecklistItemView,
  ChecklistView,
  CopyBlockView,
  CtaBoxView,
} from "./blog-editor/BlockViews";
import { StyledTableView } from "./blog-editor/StyledTableView";
import TableDesignPanel from "./blog-editor/TableDesignPanel";

/** CMS editor extensions: shared schema (`editorNodes`) plus React node views. */
const blogEditorExtensions: Extensions = [
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
  TableKit.configure({ table: false }),
  DesignedTable.configure({ resizable: true, View: StyledTableView, cellMinWidth: 60 }),
  TextColor,
  BlogHighlightMark,
  Callout.extend({ addNodeView: () => ReactNodeViewRenderer(CalloutView) }),
  CopyBlock.extend({ addNodeView: () => ReactNodeViewRenderer(CopyBlockView) }),
  Checklist.extend({ addNodeView: () => ReactNodeViewRenderer(ChecklistView) }),
  ChecklistItem.extend({ addNodeView: () => ReactNodeViewRenderer(ChecklistItemView) }),
  CtaBox.extend({ addNodeView: () => ReactNodeViewRenderer(CtaBoxView) }),
];

const CALLOUT_ICONS: Record<CalloutVariant, LucideIcon> = {
  tip: Lightbulb,
  warning: TriangleAlert,
  example: PenLine,
  note: Info,
  takeaway: CircleCheckBig,
};

type TiptapBlogEditorProps = {
  /** Initial content as ProseMirror JSON or HTML string (e.g. from AI generation). */
  initialContent?: JSONContent | string | null;
  placeholder?: string;
  onChange: (payload: { json: JSONContent | null; html: string }) => void;
};

function ToolButton({
  icon: Icon,
  label,
  active = false,
  disabled = false,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-md text-[#37465C] transition-colors duration-150 hover:bg-[#F4F7FF] hover:text-[#2554D6] aria-pressed:bg-[#EEF3FF] aria-pressed:text-[#2554D6] disabled:pointer-events-none disabled:opacity-35"
    >
      <Icon className="size-4" />
    </button>
  );
}

function Divider() {
  return <span aria-hidden className="mx-1 h-5 w-px bg-[#E3E8F2]" />;
}

function PalettePopover<T extends string>({
  icon: Icon,
  label,
  activeKey,
  palette,
  previewClass,
  onPick,
  onClear,
}: {
  icon: LucideIcon;
  label: string;
  activeKey: T | null;
  palette: Record<T, { label: string; hex: string }>;
  previewClass: "text" | "highlight";
  onPick: (key: T) => void;
  onClear: () => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={label}
          aria-label={label}
          className="flex h-8 items-center gap-0.5 rounded-md px-1.5 text-[#37465C] transition-colors hover:bg-[#F4F7FF] hover:text-[#2554D6]"
        >
          <span className="flex flex-col items-center">
            <Icon className="size-4" />
            <span
              className="mt-[1px] h-[3px] w-4 rounded-full"
              style={{ background: activeKey ? palette[activeKey].hex : "#E3E8F2" }}
            />
          </span>
          <ChevronDown className="size-3 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[232px] bg-white p-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#5B6B82]">{label}</p>
        <div className="grid grid-cols-4 gap-1.5">
          {(Object.keys(palette) as T[]).map((key) => (
            <button
              key={key}
              type="button"
              title={palette[key].label}
              onClick={() => onPick(key)}
              className={`flex h-12 flex-col items-center justify-center gap-0.5 rounded-lg border text-[11px] font-medium transition-colors hover:border-[#2554D6] ${
                activeKey === key ? "border-[#2554D6] bg-[#F4F7FF]" : "border-[#E3E8F2]"
              }`}
            >
              {previewClass === "text" ? (
                <span className="text-[16px] font-bold leading-none" style={{ color: palette[key].hex }}>
                  A
                </span>
              ) : (
                <span
                  className="rounded-[4px] px-1.5 text-[13px] font-semibold leading-5 text-[#212E42]"
                  style={{ background: palette[key].hex }}
                >
                  ab
                </span>
              )}
              <span className="text-[#5B6B82]">{palette[key].label}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={onClear}
            className="flex h-12 flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-[#C9D5F5] text-[11px] font-medium text-[#5B6B82] transition-colors hover:border-[#2554D6]"
          >
            <Ban className="size-4" />
            None
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      paragraph: e.isActive("paragraph") && !e.isActive("heading"),
      bulletList: e.isActive("bulletList"),
      orderedList: e.isActive("orderedList"),
      blockquote: e.isActive("blockquote"),
      link: e.isActive("link"),
      textColor: (e.getAttributes("textColor").color as BlogTextColor | undefined) ?? null,
      highlight: (e.getAttributes("highlight").color as BlogHighlight | undefined) ?? null,
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
      inTable: e.isActive("table"),
      // Re-render the table panel whenever its attributes or the selection change.
      tableKey: e.isActive("table")
        ? `${JSON.stringify(e.getAttributes("table"))}:${e.state.selection.from}:${e.state.selection.to}`
        : "",
    }),
  });

  const setLink = useCallback(() => {
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Paste URL", previousUrl ?? "https://");
    if (url === null) return;
    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }, [editor]);

  const insertImage = useCallback(() => {
    const src = window.prompt("Image URL");
    if (!src || !src.trim()) return;
    const alt = window.prompt("Image Alt Text (optional)") ?? "";
    editor.chain().focus().setImage({ src: src.trim(), alt }).run();
  }, [editor]);

  const chain = () => editor.chain().focus();

  return (
    <Box className="sticky top-0 z-20 flex flex-col gap-2">
      <Box className="flex flex-wrap items-center gap-0.5 rounded-md border border-[#E3E8F2] bg-white p-1.5 shadow-[0_1px_2px_rgba(33,46,66,0.05)]">
        <ToolButton icon={Undo2} label="Undo" disabled={!state.canUndo} onClick={() => chain().undo().run()} />
        <ToolButton icon={Redo2} label="Redo" disabled={!state.canRedo} onClick={() => chain().redo().run()} />
        <Divider />
        <ToolButton icon={Pilcrow} label="Paragraph" active={state.paragraph} onClick={() => chain().setParagraph().run()} />
        <ToolButton icon={Heading2} label="Heading 2 (shows in the table of contents)" active={state.h2} onClick={() => chain().toggleHeading({ level: 2 }).run()} />
        <ToolButton icon={Heading3} label="Heading 3 (shows in the table of contents)" active={state.h3} onClick={() => chain().toggleHeading({ level: 3 }).run()} />
        <Divider />
        <ToolButton icon={Bold} label="Bold" active={state.bold} onClick={() => chain().toggleBold().run()} />
        <ToolButton icon={Italic} label="Italic" active={state.italic} onClick={() => chain().toggleItalic().run()} />
        <ToolButton icon={UnderlineIcon} label="Underline" active={state.underline} onClick={() => chain().toggleUnderline().run()} />
        <ToolButton icon={Strikethrough} label="Strikethrough" active={state.strike} onClick={() => chain().toggleStrike().run()} />
        <PalettePopover
          icon={Baseline}
          label="Text colour"
          activeKey={state.textColor}
          palette={BLOG_TEXT_COLORS}
          previewClass="text"
          onPick={(color) => chain().setTextColor(color).run()}
          onClear={() => chain().unsetTextColor().run()}
        />
        <PalettePopover
          icon={Highlighter}
          label="Highlight"
          activeKey={state.highlight}
          palette={BLOG_HIGHLIGHTS}
          previewClass="highlight"
          onPick={(color) => chain().setBlogHighlight(color).run()}
          onClear={() => chain().unsetBlogHighlight().run()}
        />
        <Divider />
        <ToolButton icon={List} label="Bullet list" active={state.bulletList} onClick={() => chain().toggleBulletList().run()} />
        <ToolButton icon={ListOrdered} label="Numbered list" active={state.orderedList} onClick={() => chain().toggleOrderedList().run()} />
        <ToolButton icon={Quote} label="Quote" active={state.blockquote} onClick={() => chain().toggleBlockquote().run()} />
        <Divider />
        <ToolButton icon={Link2} label="Link" active={state.link} onClick={setLink} />
        <ToolButton icon={ImagePlus} label="Image" onClick={insertImage} />
        <ToolButton
          icon={Table2}
          label="Table"
          onClick={() => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        />
        <Divider />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-8 items-center gap-1 rounded-md bg-[#2554D6] px-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#1B3FA8]"
            >
              <Plus className="size-4" />
              Insert block
              <ChevronDown className="size-3.5 opacity-80" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64 bg-white">
            <DropdownMenuLabel className="text-[11px] uppercase tracking-[0.06em] text-[#5B6B82]">
              Callout boxes
            </DropdownMenuLabel>
            {(Object.keys(CALLOUT_VARIANTS) as CalloutVariant[]).map((variant) => {
              const Icon = CALLOUT_ICONS[variant];
              return (
                <DropdownMenuItem
                  key={variant}
                  className="cursor-pointer gap-2"
                  onSelect={() => chain().insertCallout(variant).run()}
                >
                  <Icon className="size-4 text-[#5B6B82]" />
                  {CALLOUT_VARIANTS[variant].label}
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[11px] uppercase tracking-[0.06em] text-[#5B6B82]">
              Learning blocks
            </DropdownMenuLabel>
            <DropdownMenuItem className="cursor-pointer gap-2" onSelect={() => chain().insertCopyBlock().run()}>
              <Copy className="size-4 text-[#5B6B82]" />
              Copy box (templates, phrases)
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer gap-2" onSelect={() => chain().insertChecklist().run()}>
              <ListChecks className="size-4 text-[#5B6B82]" />
              Checklist
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer gap-2" onSelect={() => chain().insertCtaBox().run()}>
              <Megaphone className="size-4 text-[#5B6B82]" />
              Call to action box
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onSelect={() => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            >
              <Table2 className="size-4 text-[#5B6B82]" />
              Table
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer gap-2" onSelect={() => chain().setHorizontalRule().run()}>
              <Minus className="size-4 text-[#5B6B82]" />
              Divider
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <span className="ml-auto" />
        <ToolButton
          icon={Eraser}
          label="Clear formatting"
          onClick={() => chain().unsetAllMarks().clearNodes().run()}
        />
      </Box>
      {/* `tableKey` in the selector re-renders this when the table or selection changes. */}
      {state.inTable ? <TableDesignPanel editor={editor} /> : null}
    </Box>
  );
}

export default function TiptapBlogEditor({
  initialContent,
  placeholder = "Write your blog content...",
  onChange,
}: TiptapBlogEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      ...blogEditorExtensions,
      Placeholder.configure({
        placeholder,
      }),
    ],
    onCreate: ({ editor: currentEditor }) => {
      onChange({
        json: currentEditor.getJSON(),
        html: currentEditor.getHTML(),
      });
    },
    content:
      typeof initialContent === "string" && initialContent.trim()
        ? initialContent
        : (initialContent ?? "<p></p>"),
    editorProps: {
      attributes: {
        class:
          "min-h-[320px] w-full rounded-md border border-input bg-background px-4 py-4 text-sm ring-offset-background focus-visible:outline-none prose prose-slate max-w-none [&_td]:relative [&_th]:relative [&_.column-resize-handle]:pointer-events-none [&_.column-resize-handle]:absolute [&_.column-resize-handle]:-right-[2px] [&_.column-resize-handle]:top-0 [&_.column-resize-handle]:bottom-0 [&_.column-resize-handle]:w-[4px] [&_.column-resize-handle]:bg-[#2554D6] [&.resize-cursor]:cursor-col-resize [&_.selectedCell]:!bg-[#DCE6FF] [&_.ProseMirror-selectednode]:outline-none",
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange({
        json: currentEditor.getJSON(),
        html: currentEditor.getHTML(),
      });
    },
  });

  if (!editor) {
    return <Box className="p-4 text-sm text-slate-500">Loading editor...</Box>;
  }

  return (
    <Box className="space-y-2">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </Box>
  );
}
