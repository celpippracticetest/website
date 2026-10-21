"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDownToLine,
  ArrowLeftToLine,
  ArrowRightToLine,
  ArrowUpToLine,
  ChevronDown,
  Columns3,
  Merge,
  Rows3,
  Split,
  Trash2,
} from "lucide-react";
import {
  TABLE_ALIGNS,
  TABLE_BORDER_WIDTHS,
  TABLE_COLORS,
  TABLE_FONT_SIZES,
  TABLE_PADDINGS,
  TABLE_TEMPLATES,
  resolveTableDesign,
  type TableColor,
  type TableDesign,
  type TableTemplate,
} from "@/lib/blog/blocks";

const LABEL_CLASS = "text-[11px] font-semibold uppercase tracking-[0.06em] text-[#5B6B82]";
const CHIP_CLASS =
  "inline-flex h-7 items-center gap-1 rounded-md border border-[#E3E8F2] bg-white px-2 text-[12px] font-medium text-[#37465C] transition-colors hover:border-[#2554D6] hover:text-[#2554D6] aria-pressed:border-[#2554D6] aria-pressed:bg-[#EEF3FF] aria-pressed:text-[#2554D6] disabled:pointer-events-none disabled:opacity-40";

const COLOR_FIELDS: { key: keyof TableDesign; label: string }[] = [
  { key: "headerBg", label: "Header" },
  { key: "headerText", label: "Header text" },
  { key: "bodyBg", label: "Background" },
  { key: "bodyText", label: "Text" },
  { key: "borderColor", label: "Lines" },
  { key: "stripeBg", label: "Stripe" },
];

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: TableColor;
  onChange: (color: TableColor) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={CHIP_CLASS}>
          <span
            className="size-4 rounded-full ring-1 ring-black/10"
            style={{ background: TABLE_COLORS[value] }}
          />
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[212px] bg-white p-2">
        <div className="grid grid-cols-6 gap-1.5">
          {(Object.keys(TABLE_COLORS) as TableColor[]).map((color) => (
            <button
              key={color}
              type="button"
              title={color}
              aria-label={`${label}: ${color}`}
              onClick={() => onChange(color)}
              style={{ background: TABLE_COLORS[color] }}
              className={`size-7 rounded-md ring-1 ring-black/10 transition-transform hover:scale-110 ${
                value === color ? "outline outline-2 outline-offset-1 outline-[#2554D6]" : ""
              }`}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function TableDesignPanel({ editor }: { editor: Editor }) {
  const [expanded, setExpanded] = useState(false);
  const attrs = editor.getAttributes("table");
  const design = resolveTableDesign(attrs);
  const template = (attrs.template as TableTemplate | null) ?? "classic";

  const setDesign = (patch: Partial<Record<keyof TableDesign | "template", unknown>>) =>
    editor.chain().focus().updateAttributes("table", patch).run();

  const applyTemplate = (key: TableTemplate) =>
    setDesign({
      template: key,
      headerBg: null,
      headerText: null,
      bodyBg: null,
      bodyText: null,
      borderColor: null,
      borderWidth: null,
      stripeBg: null,
      striped: null,
      fontSize: null,
      padding: null,
      align: null,
    });

  const resetColumnWidths = () =>
    editor
      .chain()
      .focus()
      .command(({ tr, state }) => {
        const { $from } = state.selection;
        for (let depth = $from.depth; depth > 0; depth -= 1) {
          const node = $from.node(depth);
          if (node.type.name !== "table") continue;
          const start = $from.before(depth);
          node.descendants((child, pos) => {
            if (child.attrs.colwidth) {
              tr.setNodeMarkup(start + 1 + pos, undefined, { ...child.attrs, colwidth: null });
            }
          });
          return true;
        }
        return false;
      })
      .run();

  const can = editor.can();

  return (
    <div className="flex flex-col gap-3 rounded-md border border-[#C9D5F5] bg-[#F7F9FF] p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={`${LABEL_CLASS} mr-1`}>Table design</span>
        {(Object.keys(TABLE_TEMPLATES) as TableTemplate[]).map((key) => {
          const preset = TABLE_TEMPLATES[key].design;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={template === key}
              onClick={() => applyTemplate(key)}
              className={CHIP_CLASS}
            >
              <span className="flex h-4 w-5 flex-col overflow-hidden rounded-[3px] ring-1 ring-black/10">
                <span className="h-1.5" style={{ background: TABLE_COLORS[preset.headerBg] }} />
                <span className="flex-1" style={{ background: TABLE_COLORS[preset.stripeBg] }} />
              </span>
              {TABLE_TEMPLATES[key].label}
            </button>
          );
        })}
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((open) => !open)}
          className={`${CHIP_CLASS} ml-auto !border-transparent !bg-transparent font-semibold !text-[#2554D6]`}
        >
          {expanded ? "Fewer options" : "More options"}
          <ChevronDown className={`size-3.5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
        </button>
      </div>

      {expanded ? (
      <>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={`${LABEL_CLASS} mr-1`}>Colours</span>
        {COLOR_FIELDS.map((field) => (
          <ColorField
            key={field.key}
            label={field.label}
            value={design[field.key] as TableColor}
            onChange={(color) => setDesign({ [field.key]: color })}
          />
        ))}
        <button
          type="button"
          aria-pressed={design.striped}
          onClick={() => setDesign({ striped: !design.striped })}
          className={CHIP_CLASS}
        >
          Striped rows
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-1">
          <span className={`${LABEL_CLASS} mr-1`}>Lines</span>
          {TABLE_BORDER_WIDTHS.map((width) => (
            <button
              key={width}
              type="button"
              aria-pressed={design.borderWidth === width}
              onClick={() => setDesign({ borderWidth: width })}
              className={CHIP_CLASS}
            >
              {width === 0 ? "None" : `${width}px`}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <span className={`${LABEL_CLASS} mr-1`}>Text size</span>
          {(Object.keys(TABLE_FONT_SIZES) as (keyof typeof TABLE_FONT_SIZES)[]).map((size) => (
            <button
              key={size}
              type="button"
              aria-pressed={design.fontSize === size}
              onClick={() => setDesign({ fontSize: size })}
              className={CHIP_CLASS}
            >
              {size === "sm" ? "S" : size === "base" ? "M" : "L"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <span className={`${LABEL_CLASS} mr-1`}>Cell spacing</span>
          {(Object.keys(TABLE_PADDINGS) as (keyof typeof TABLE_PADDINGS)[]).map((padding) => (
            <button
              key={padding}
              type="button"
              aria-pressed={design.padding === padding}
              onClick={() => setDesign({ padding })}
              className={`${CHIP_CLASS} capitalize`}
            >
              {padding}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <span className={`${LABEL_CLASS} mr-1`}>Align</span>
          {TABLE_ALIGNS.map((align) => {
            const AlignIcon = align === "left" ? AlignLeft : align === "center" ? AlignCenter : AlignRight;
            return (
              <button
                key={align}
                type="button"
                title={`Align ${align}`}
                aria-label={`Align ${align}`}
                aria-pressed={design.align === align}
                onClick={() => setDesign({ align })}
                className={CHIP_CLASS}
              >
                <AlignIcon className="size-3.5" />
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-t border-[#E3E8F2] pt-3">
        <span className={`${LABEL_CLASS} mr-1`}>Structure</span>
        <button type="button" className={CHIP_CLASS} disabled={!can.addRowBefore()} onClick={() => editor.chain().focus().addRowBefore().run()}>
          <ArrowUpToLine className="size-3.5" /> Row above
        </button>
        <button type="button" className={CHIP_CLASS} disabled={!can.addRowAfter()} onClick={() => editor.chain().focus().addRowAfter().run()}>
          <ArrowDownToLine className="size-3.5" /> Row below
        </button>
        <button type="button" className={CHIP_CLASS} disabled={!can.addColumnBefore()} onClick={() => editor.chain().focus().addColumnBefore().run()}>
          <ArrowLeftToLine className="size-3.5" /> Column left
        </button>
        <button type="button" className={CHIP_CLASS} disabled={!can.addColumnAfter()} onClick={() => editor.chain().focus().addColumnAfter().run()}>
          <ArrowRightToLine className="size-3.5" /> Column right
        </button>
        <button type="button" className={CHIP_CLASS} disabled={!can.deleteRow()} onClick={() => editor.chain().focus().deleteRow().run()}>
          <Rows3 className="size-3.5" /> Delete row
        </button>
        <button type="button" className={CHIP_CLASS} disabled={!can.deleteColumn()} onClick={() => editor.chain().focus().deleteColumn().run()}>
          <Columns3 className="size-3.5" /> Delete column
        </button>
        <button type="button" className={CHIP_CLASS} disabled={!can.toggleHeaderRow()} onClick={() => editor.chain().focus().toggleHeaderRow().run()}>
          Header row
        </button>
        <button type="button" className={CHIP_CLASS} disabled={!can.mergeCells()} onClick={() => editor.chain().focus().mergeCells().run()}>
          <Merge className="size-3.5" /> Merge
        </button>
        <button type="button" className={CHIP_CLASS} disabled={!can.splitCell()} onClick={() => editor.chain().focus().splitCell().run()}>
          <Split className="size-3.5" /> Split
        </button>
        <button type="button" className={CHIP_CLASS} onClick={resetColumnWidths}>
          Reset widths
        </button>
        <button
          type="button"
          className={`${CHIP_CLASS} ml-auto !text-[#C0362C] hover:!border-[#C0362C]`}
          onClick={() => editor.chain().focus().deleteTable().run()}
        >
          <Trash2 className="size-3.5" /> Delete table
        </button>
      </div>
      <p className="text-[12px] text-[#5B6B82]">
        Drag a column&apos;s right edge to change its width. Select several cells to merge them.
      </p>
      </>
      ) : null}
    </div>
  );
}
