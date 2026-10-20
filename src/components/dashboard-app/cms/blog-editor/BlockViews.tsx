"use client";

import { useState } from "react";
import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import {
  BLOCK_BODY_CLASS,
  CALLOUT_BOX_CLASS,
  CALLOUT_HEADER_CLASS,
  CALLOUT_ICON_WRAP_CLASS,
  CALLOUT_VARIANTS,
  CHECKLIST_BOX_CLASS,
  CHECKLIST_ITEM_CLASS,
  CHECKLIST_LIST_CLASS,
  CHECKLIST_MARK_CLASS,
  COPY_BLOCK_BODY_CLASS,
  COPY_BLOCK_BUTTON_CLASS,
  COPY_BLOCK_CLASS,
  COPY_BLOCK_HEADER_CLASS,
  CTA_BACKGROUNDS,
  CTA_BOX_CLASS,
  CTA_BUTTON_CLASS,
  CTA_BUTTONS,
  CTA_TEMPLATES,
  CTA_TEXT_CLASS,
  CTA_TITLE_CLASS,
  blogIconSvg,
  pickKey,
  safeBlockHref,
  type BlogIconName,
  type CalloutVariant,
  type CtaBackground,
  type CtaButton,
  type CtaTemplate,
} from "@/lib/blog/blocks";

function Icon({ name, className }: { name: BlogIconName; className: string }) {
  return (
    <span
      className="contents"
      dangerouslySetInnerHTML={{ __html: blogIconSvg(name, className) }}
    />
  );
}

/** Small "block" chip with a remove button, shown on every custom block. */
function BlockChrome({
  label,
  onDelete,
  children,
}: {
  label: string;
  onDelete: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div
      contentEditable={false}
      className="mb-3 flex select-none flex-wrap items-center gap-2 text-[12px] font-medium normal-case tracking-normal text-[#5B6B82]"
    >
      <span className="rounded-full bg-white/80 px-2 py-0.5 font-semibold text-[#37465C] ring-1 ring-[#E3E8F2]">
        {label}
      </span>
      {children}
      <button
        type="button"
        onClick={onDelete}
        className="ml-auto rounded-full px-2 py-0.5 text-[#B8431B] transition-colors hover:bg-[#FFF4EE]"
      >
        Remove
      </button>
    </div>
  );
}

const SELECT_CLASS =
  "h-7 rounded-full border border-[#E3E8F2] bg-white px-2 text-[12px] font-medium text-[#212E42] outline-none focus:border-[#2554D6]";

/* ---------------------------------------------------------------- callout */

export function CalloutView({ node, updateAttributes, deleteNode }: NodeViewProps) {
  const variant = pickKey(node.attrs.variant, CALLOUT_VARIANTS, "tip");
  const style = CALLOUT_VARIANTS[variant];
  return (
    <NodeViewWrapper as="aside" data-callout={variant} className={`${CALLOUT_BOX_CLASS} ${style.box}`}>
      <BlockChrome label="Callout box" onDelete={deleteNode}>
        <select
          aria-label="Callout type"
          value={variant}
          onChange={(event) => updateAttributes({ variant: event.target.value as CalloutVariant })}
          className={SELECT_CLASS}
        >
          {Object.entries(CALLOUT_VARIANTS).map(([key, value]) => (
            <option key={key} value={key}>
              {value.label}
            </option>
          ))}
        </select>
      </BlockChrome>
      <div contentEditable={false} className={`${CALLOUT_HEADER_CLASS} ${style.accent} select-none`}>
        <span className={`${CALLOUT_ICON_WRAP_CLASS} ${style.iconWrap}`}>
          <Icon name={style.icon} className="size-4" />
        </span>
        <span>{style.label}</span>
      </div>
      <NodeViewContent className={`${BLOCK_BODY_CLASS} ${style.body}`} />
    </NodeViewWrapper>
  );
}

/* ------------------------------------------------------------- copy block */

export function CopyBlockView({ node, updateAttributes, deleteNode }: NodeViewProps) {
  return (
    <NodeViewWrapper className={COPY_BLOCK_CLASS} data-copy-block="">
      <div contentEditable={false} className="px-4 pt-3 screen744:!px-5">
        <BlockChrome label="Copy box" onDelete={deleteNode} />
      </div>
      <div contentEditable={false} className={COPY_BLOCK_HEADER_CLASS}>
        <input
          aria-label="Copy box title"
          value={node.attrs.title ?? ""}
          placeholder="Title, e.g. Useful phrases"
          onChange={(event) => updateAttributes({ title: event.target.value })}
          className="min-w-0 flex-1 bg-transparent text-[13px] font-bold uppercase tracking-[0.08em] text-[#1B3FA8] outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-[#9AA8BD]"
        />
        <span className={`${COPY_BLOCK_BUTTON_CLASS} pointer-events-none`}>
          <Icon name="copy" className="size-3.5" />
          Copy
        </span>
      </div>
      <NodeViewContent className={COPY_BLOCK_BODY_CLASS} />
    </NodeViewWrapper>
  );
}

/* -------------------------------------------------------------- checklist */

export function ChecklistView({ node, updateAttributes, deleteNode }: NodeViewProps) {
  return (
    <NodeViewWrapper className={CHECKLIST_BOX_CLASS} data-checklist="">
      <BlockChrome label="Checklist" onDelete={deleteNode}>
        <span className="text-[#9AA8BD]">Click an item&apos;s icon to switch tick / box</span>
      </BlockChrome>
      <div contentEditable={false} className="flex items-center gap-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[#ECF9F2] text-[#0B7A55]">
          <Icon name="list" className="size-[18px]" />
        </span>
        <input
          aria-label="Checklist title"
          value={node.attrs.title ?? ""}
          placeholder="Checklist title"
          onChange={(event) => updateAttributes({ title: event.target.value })}
          className="min-w-0 flex-1 bg-transparent text-[18px] font-extrabold leading-snug text-[#212E42] outline-none placeholder:text-[#9AA8BD]"
        />
      </div>
      <div contentEditable={false}>
        <textarea
          aria-label="Checklist description"
          rows={1}
          value={node.attrs.description ?? ""}
          placeholder="Optional description"
          onChange={(event) => updateAttributes({ description: event.target.value })}
          className="mt-1.5 field-sizing-content w-full resize-none bg-transparent text-[15px] leading-[1.6] text-[#5B6B82] outline-none placeholder:text-[#9AA8BD]"
        />
      </div>
      {/* Typed as "div" only; any tag works at runtime and items are <li>. */}
      <NodeViewContent as={"ul" as "div"} className={CHECKLIST_LIST_CLASS} />
    </NodeViewWrapper>
  );
}

export function ChecklistItemView({ node, updateAttributes }: NodeViewProps) {
  const icon = node.attrs.icon === "square" ? "square" : "check";
  return (
    <NodeViewWrapper as="li" className={CHECKLIST_ITEM_CLASS} data-checklist-item={icon}>
      <button
        type="button"
        contentEditable={false}
        title="Switch between tick and box"
        onClick={() => updateAttributes({ icon: icon === "check" ? "square" : "check" })}
        className={`${CHECKLIST_MARK_CLASS[icon]} cursor-pointer transition-transform duration-150 hover:scale-110`}
      >
        {icon === "check" ? <Icon name="check" className="size-3.5" /> : null}
      </button>
      <NodeViewContent className="min-w-0 flex-1" />
    </NodeViewWrapper>
  );
}

/* ---------------------------------------------------------------- CTA box */

const FIELD_CLASS =
  "h-9 w-full rounded-lg border border-[#E3E8F2] bg-white px-3 text-[14px] text-[#212E42] outline-none transition-colors focus:border-[#2554D6]";

function Swatches<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Record<T, { label: string; swatch: string }>;
  onChange: (key: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-[12px] font-semibold text-[#5B6B82]">{label}</span>
      {(Object.keys(options) as T[]).map((key) => (
        <button
          key={key}
          type="button"
          title={options[key].label}
          aria-label={`${label}: ${options[key].label}`}
          aria-pressed={value === key}
          onClick={() => onChange(key)}
          style={{ background: options[key].swatch }}
          className={`size-6 rounded-full ring-1 ring-[#C9D5F5] transition-transform hover:scale-110 ${
            value === key ? "outline outline-2 outline-offset-2 outline-[#2554D6]" : ""
          }`}
        />
      ))}
    </div>
  );
}

export function CtaBoxView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const [editing, setEditing] = useState(false);
  const background = pickKey<CtaBackground>(node.attrs.background, CTA_BACKGROUNDS, "blue");
  const button = pickKey<CtaButton>(node.attrs.button, CTA_BUTTONS, "white");
  const bg = CTA_BACKGROUNDS[background];
  const hrefValid = Boolean(safeBlockHref(node.attrs.href));

  return (
    <NodeViewWrapper
      data-cta=""
      className={`my-8 rounded-2xl transition-shadow ${selected ? "ring-2 ring-[#2554D6] ring-offset-2" : ""}`}
    >
      <div contentEditable={false} className="mb-2">
        <BlockChrome label="Call to action" onDelete={deleteNode}>
          <button
            type="button"
            onClick={() => setEditing((open) => !open)}
            className="rounded-full bg-[#EEF3FF] px-2.5 py-0.5 font-semibold text-[#2554D6] transition-colors hover:bg-[#E3EBFF]"
          >
            {editing ? "Done" : "Edit"}
          </button>
        </BlockChrome>
      </div>
      <div contentEditable={false} className={`${CTA_BOX_CLASS} !my-0 ${bg.box}`}>
        <div className="min-w-0">
          <p className={`${CTA_TITLE_CLASS} ${bg.title}`}>{node.attrs.title || "CTA title"}</p>
          {node.attrs.description ? (
            <p className={`${CTA_TEXT_CLASS} ${bg.text}`}>{node.attrs.description}</p>
          ) : null}
        </div>
        <span className={`${CTA_BUTTON_CLASS} ${CTA_BUTTONS[button].className}`}>
          {node.attrs.buttonText || "Button"}
          <Icon name="arrowRight" className="size-4" />
        </span>
      </div>
      {editing ? (
        <div
          contentEditable={false}
          className="mt-3 grid gap-3 rounded-xl border border-[#E3E8F2] bg-[#FAFBFE] p-4 not-prose"
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[12px] font-semibold text-[#5B6B82]">Template</span>
            {(Object.keys(CTA_TEMPLATES) as CtaTemplate[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() =>
                  updateAttributes({
                    background: CTA_TEMPLATES[key].background,
                    button: CTA_TEMPLATES[key].button,
                  })
                }
                className="rounded-full border border-[#E3E8F2] bg-white px-2.5 py-1 text-[12px] font-medium text-[#37465C] transition-colors hover:border-[#2554D6] hover:text-[#2554D6]"
              >
                {CTA_TEMPLATES[key].label}
              </button>
            ))}
          </div>
          <label className="grid gap-1 text-[12px] font-semibold text-[#5B6B82]">
            Title
            <input
              value={node.attrs.title ?? ""}
              onChange={(event) => updateAttributes({ title: event.target.value })}
              className={FIELD_CLASS}
            />
          </label>
          <label className="grid gap-1 text-[12px] font-semibold text-[#5B6B82]">
            Description
            <textarea
              rows={2}
              value={node.attrs.description ?? ""}
              onChange={(event) => updateAttributes({ description: event.target.value })}
              className={`${FIELD_CLASS} h-auto py-2`}
            />
          </label>
          <div className="grid gap-3 screen744:!grid-cols-2">
            <label className="grid gap-1 text-[12px] font-semibold text-[#5B6B82]">
              Button text
              <input
                value={node.attrs.buttonText ?? ""}
                onChange={(event) => updateAttributes({ buttonText: event.target.value })}
                className={FIELD_CLASS}
              />
            </label>
            <label className="grid gap-1 text-[12px] font-semibold text-[#5B6B82]">
              Button link
              <input
                value={node.attrs.href ?? ""}
                placeholder="/sign-up or https://..."
                onChange={(event) => updateAttributes({ href: event.target.value })}
                className={`${FIELD_CLASS} ${hrefValid ? "" : "!border-[#C0362C]"}`}
              />
              {hrefValid ? null : (
                <span className="font-normal text-[#C0362C]">
                  Use a site path (/pricing) or a full https:// link. The button is hidden until this is valid.
                </span>
              )}
            </label>
          </div>
          <Swatches
            label="Background"
            value={background}
            options={CTA_BACKGROUNDS}
            onChange={(key) => updateAttributes({ background: key })}
          />
          <Swatches
            label="Button"
            value={button}
            options={CTA_BUTTONS}
            onChange={(key) => updateAttributes({ button: key })}
          />
        </div>
      ) : null}
    </NodeViewWrapper>
  );
}
