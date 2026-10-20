/**
 * Design tokens for the blog editor's content blocks (callouts, copy boxes,
 * checklists, CTA boxes, tables, text colour and highlight).
 *
 * Shared by the CMS editor (live preview) and `blogJsonToHtml` (published
 * HTML), so a block looks the same in both. Everything here is a whitelist:
 * the renderer only ever emits classes and colours listed in this file.
 * Class names are written out in full so Tailwind generates them.
 */

/* ------------------------------------------------------------------ icons */

/** Lucide-style stroke icons (24x24). Inner SVG markup only. */
export const BLOG_ICONS = {
  tip: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
  warning:
    '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  example:
    '<path d="M12 20h9"/><path d="M16.38 3.62a1 1 0 0 1 3 3L7.37 18.64a2 2 0 0 1-.86.5l-2.87.84a.5.5 0 0 1-.62-.62l.84-2.87a2 2 0 0 1 .5-.86z"/>',
  note: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  takeaway:
    '<path d="M21.8 10A10 10 0 1 1 17 3.34"/><path d="m9 11 3 3L22 4"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  arrowRight: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  list: '<path d="M11 6h10"/><path d="M11 12h10"/><path d="M11 18h10"/><path d="m3 6 1.5 1.5L7 5"/><path d="m3 12 1.5 1.5L7 11"/><path d="m3 18 1.5 1.5L7 17"/>',
} as const;

export type BlogIconName = keyof typeof BLOG_ICONS;

export function blogIconSvg(name: BlogIconName, className: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="${className}">${BLOG_ICONS[name]}</svg>`;
}

/* -------------------------------------------------- text colour/highlight */

export const BLOG_TEXT_COLORS = {
  blue: { label: "Blue", hex: "#2554D6", className: "text-[#2554D6]" },
  navy: { label: "Navy", hex: "#212E42", className: "text-[#212E42]" },
  orange: { label: "Orange", hex: "#B8431B", className: "text-[#B8431B]" },
  green: { label: "Green", hex: "#0B7A55", className: "text-[#0B7A55]" },
  purple: { label: "Purple", hex: "#6D4BD8", className: "text-[#6D4BD8]" },
  red: { label: "Red", hex: "#C0362C", className: "text-[#C0362C]" },
  gray: { label: "Gray", hex: "#5B6B82", className: "text-[#5B6B82]" },
} as const;

export type BlogTextColor = keyof typeof BLOG_TEXT_COLORS;

const HIGHLIGHT_BASE =
  "rounded-[4px] px-[3px] py-[1px] text-inherit [box-decoration-break:clone] [-webkit-box-decoration-break:clone]";

export const BLOG_HIGHLIGHTS = {
  yellow: { label: "Yellow", hex: "#FFF1B8", className: `${HIGHLIGHT_BASE} bg-[#FFF1B8]` },
  blue: { label: "Blue", hex: "#E3EBFF", className: `${HIGHLIGHT_BASE} bg-[#E3EBFF]` },
  orange: { label: "Peach", hex: "#FCE3D5", className: `${HIGHLIGHT_BASE} bg-[#FCE3D5]` },
  green: { label: "Mint", hex: "#D7F3E5", className: `${HIGHLIGHT_BASE} bg-[#D7F3E5]` },
  purple: { label: "Lilac", hex: "#ECE6FD", className: `${HIGHLIGHT_BASE} bg-[#ECE6FD]` },
  pink: { label: "Pink", hex: "#FCE1EA", className: `${HIGHLIGHT_BASE} bg-[#FCE1EA]` },
} as const;

export type BlogHighlight = keyof typeof BLOG_HIGHLIGHTS;

/* ---------------------------------------------------------------- callouts */

/** Shared spacing/typography for rich content nested inside a block. */
export const BLOCK_BODY_CLASS =
  "text-[16px] leading-[1.7] [&>*:first-child]:!mt-0 [&>*:last-child]:!mb-0 [&_p]:!my-2 [&_p]:!leading-[1.7] [&_ul]:!my-2 [&_ul]:!ml-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:!my-2 [&_ol]:!ml-0 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:!mb-1 [&_a]:font-semibold [&_a]:underline [&_a]:underline-offset-2";

export const CALLOUT_VARIANTS = {
  tip: {
    label: "Tip",
    icon: "tip",
    box: "border-[#C9D5F5] bg-[#EEF3FF]",
    accent: "text-[#2554D6]",
    iconWrap: "bg-white text-[#2554D6] ring-1 ring-[#C9D5F5]",
    body: "text-[#37465C] [&_strong]:!text-[#1B3FA8] [&_a]:!text-[#1B3FA8]",
  },
  warning: {
    label: "Common mistake",
    icon: "warning",
    box: "border-[#F8CDB7] bg-[#FFF4EE]",
    accent: "text-[#B8431B]",
    iconWrap: "bg-white text-[#B8431B] ring-1 ring-[#F8CDB7]",
    body: "text-[#4A3A33] [&_strong]:!text-[#8F3415] [&_a]:!text-[#8F3415]",
  },
  example: {
    label: "Example",
    icon: "example",
    box: "border-[#DDD3FB] bg-[#F6F3FF]",
    accent: "text-[#6D4BD8]",
    iconWrap: "bg-white text-[#6D4BD8] ring-1 ring-[#DDD3FB]",
    body: "text-[#3B3552] [&_strong]:!text-[#4F33A8] [&_a]:!text-[#4F33A8]",
  },
  note: {
    label: "Note",
    icon: "note",
    box: "border-[#DCE3EC] bg-[#F5F7FA]",
    accent: "text-[#37465C]",
    iconWrap: "bg-white text-[#37465C] ring-1 ring-[#DCE3EC]",
    body: "text-[#37465C] [&_strong]:!text-[#212E42] [&_a]:!text-[#2554D6]",
  },
  takeaway: {
    label: "Key takeaway",
    icon: "takeaway",
    box: "border-[#BFE7D3] bg-[#ECF9F2]",
    accent: "text-[#0B7A55]",
    iconWrap: "bg-white text-[#0B7A55] ring-1 ring-[#BFE7D3]",
    body: "text-[#2F4A3F] [&_strong]:!text-[#08603F] [&_a]:!text-[#08603F]",
  },
} as const satisfies Record<
  string,
  { label: string; icon: BlogIconName; box: string; accent: string; iconWrap: string; body: string }
>;

export type CalloutVariant = keyof typeof CALLOUT_VARIANTS;

export const CALLOUT_BOX_CLASS =
  "not-prose my-7 rounded-2xl border px-5 py-4 screen744:!px-6 screen744:!py-5";
export const CALLOUT_HEADER_CLASS =
  "mb-2 flex items-center gap-2.5 text-[13px] font-bold uppercase tracking-[0.08em]";
export const CALLOUT_ICON_WRAP_CLASS =
  "grid size-7 shrink-0 place-items-center rounded-full";

/* -------------------------------------------------------------- copy block */

export const COPY_BLOCK_CLASS =
  "not-prose my-7 overflow-hidden rounded-2xl border border-[#C9D5F5] bg-white shadow-[0_1px_2px_rgba(33,46,66,0.04)]";
export const COPY_BLOCK_HEADER_CLASS =
  "flex items-center justify-between gap-3 border-b border-[#E3E8F2] bg-[#F4F7FF] px-4 py-2.5 screen744:!px-5";
export const COPY_BLOCK_TITLE_CLASS =
  "min-w-0 truncate text-[13px] font-bold uppercase tracking-[0.08em] text-[#1B3FA8]";
export const COPY_BLOCK_BUTTON_CLASS =
  "inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-[#C9D5F5] bg-white px-3 text-[13px] font-semibold text-[#2554D6] transition-[background-color,border-color,transform] duration-200 ease-out hover:border-[#2554D6] hover:bg-[#EEF3FF] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2554D6]/40 data-[copied]:border-[#BFE7D3] data-[copied]:bg-[#ECF9F2] data-[copied]:text-[#0B7A55]";
export const COPY_BLOCK_BODY_CLASS = `px-4 py-4 text-[#37465C] screen744:!px-5 ${BLOCK_BODY_CLASS} [&_strong]:!text-[#212E42] [&_a]:!text-[#2554D6]`;

/* --------------------------------------------------------------- checklist */

export const CHECKLIST_ICONS = {
  check: { label: "Tick" },
  square: { label: "Box" },
} as const;

export type ChecklistIcon = keyof typeof CHECKLIST_ICONS;

export const CHECKLIST_BOX_CLASS =
  "not-prose my-7 rounded-2xl border border-[#E3E8F2] bg-[#FAFBFE] px-5 py-5 screen744:!px-6";
export const CHECKLIST_TITLE_CLASS =
  "flex items-center gap-2.5 text-[18px] font-extrabold leading-snug text-[#212E42]";
export const CHECKLIST_DESCRIPTION_CLASS = "mt-1.5 text-[15px] leading-[1.6] text-[#5B6B82]";
export const CHECKLIST_LIST_CLASS = "!mt-4 !mb-0 !ml-0 flex list-none flex-col gap-2.5 !pl-0";
export const CHECKLIST_ITEM_CLASS =
  "!m-0 flex items-start gap-3 rounded-xl border border-[#E3E8F2] bg-white px-3.5 py-3 text-[15.5px] leading-[1.6] text-[#37465C] [&_strong]:!text-[#212E42] [&_a]:font-semibold [&_a]:!text-[#2554D6] [&_a]:underline";
export const CHECKLIST_MARK_CLASS: Record<ChecklistIcon, string> = {
  check: "mt-[3px] grid size-5 shrink-0 place-items-center rounded-full bg-[#0B7A55] text-white",
  square: "mt-[3px] size-5 shrink-0 rounded-[6px] border-2 border-[#9AA8BD] bg-white",
};

/* ----------------------------------------------------------------- CTA box */

export const CTA_BACKGROUNDS = {
  blue: {
    label: "Blue",
    swatch: "#2554D6",
    box: "bg-[#2554D6]",
    title: "text-white",
    text: "text-white/85",
  },
  navy: {
    label: "Navy",
    swatch: "#212E42",
    box: "bg-[#212E42]",
    title: "text-white",
    text: "text-white/80",
  },
  orange: {
    label: "Orange",
    swatch: "#C8461F",
    box: "bg-[linear-gradient(120deg,#C8461F_0%,#D65326_100%)]",
    title: "text-white",
    text: "text-white/90",
  },
  soft: {
    label: "Soft blue",
    swatch: "#EEF3FF",
    box: "border border-[#C9D5F5] bg-[#EEF3FF]",
    title: "text-[#212E42]",
    text: "text-[#37465C]",
  },
  cream: {
    label: "Cream",
    swatch: "#FFF4EE",
    box: "border border-[#F8CDB7] bg-[#FFF4EE]",
    title: "text-[#212E42]",
    text: "text-[#4A3A33]",
  },
  mint: {
    label: "Mint",
    swatch: "#ECF9F2",
    box: "border border-[#BFE7D3] bg-[#ECF9F2]",
    title: "text-[#212E42]",
    text: "text-[#2F4A3F]",
  },
} as const;

export type CtaBackground = keyof typeof CTA_BACKGROUNDS;

export const CTA_BUTTONS = {
  white: {
    label: "White",
    swatch: "#FFFFFF",
    className: "bg-white text-[#212E42] hover:bg-[#F4F7FF]",
  },
  blue: {
    label: "Blue",
    swatch: "#2554D6",
    className: "bg-[#2554D6] text-white hover:bg-[#1B3FA8]",
  },
  orange: {
    label: "Orange",
    swatch: "#C8461F",
    className: "bg-[#C8461F] text-white hover:bg-[#B8431B]",
  },
  navy: {
    label: "Navy",
    swatch: "#212E42",
    className: "bg-[#212E42] text-white hover:bg-[#37465C]",
  },
  green: {
    label: "Green",
    swatch: "#0B7A55",
    className: "bg-[#0B7A55] text-white hover:bg-[#08603F]",
  },
} as const;

export type CtaButton = keyof typeof CTA_BUTTONS;

/** Ready-made CTA looks; picking one sets background + button together. */
export const CTA_TEMPLATES = {
  practice: { label: "Practice (blue)", background: "blue", button: "white" },
  offer: { label: "Offer (orange)", background: "orange", button: "white" },
  soft: { label: "Soft", background: "soft", button: "blue" },
  dark: { label: "Dark", background: "navy", button: "orange" },
  calm: { label: "Calm (mint)", background: "mint", button: "green" },
} as const satisfies Record<string, { label: string; background: CtaBackground; button: CtaButton }>;

export type CtaTemplate = keyof typeof CTA_TEMPLATES;

export const CTA_BOX_CLASS =
  "not-prose my-8 flex flex-col items-start gap-4 rounded-2xl px-5 py-6 screen744:!flex-row screen744:!items-center screen744:!justify-between screen744:!gap-6 screen744:!px-7 screen744:!py-7";
export const CTA_TITLE_CLASS = "text-[20px] font-extrabold leading-tight tracking-[-0.01em] screen744:!text-[22px]";
export const CTA_TEXT_CLASS = "mt-1.5 text-[15px] leading-[1.6]";
export const CTA_BUTTON_CLASS =
  "group/cta inline-flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-bold !no-underline shadow-[0_6px_16px_-8px_rgba(33,46,66,0.45)] transition-[background-color,transform] duration-200 ease-out active:scale-[0.97] screen744:!w-auto";

/* ------------------------------------------------------------------ tables */

/** Colours offered in the table designer. Keys are stored, never raw input. */
export const TABLE_COLORS = {
  white: "#FFFFFF",
  paper: "#FAFBFE",
  mist: "#F4F7FF",
  sky: "#EEF3FF",
  periwinkle: "#C9D5F5",
  blue: "#2554D6",
  deepBlue: "#1B3FA8",
  navy: "#212E42",
  slate: "#37465C",
  gray: "#5B6B82",
  line: "#E3E8F2",
  cream: "#FFF4EE",
  peach: "#FCE3D5",
  orange: "#C8461F",
  mint: "#ECF9F2",
  green: "#0B7A55",
  lilac: "#F6F3FF",
  purple: "#6D4BD8",
} as const;

export type TableColor = keyof typeof TABLE_COLORS;

export const TABLE_FONT_SIZES = { sm: "14px", base: "15.5px", lg: "17px" } as const;
export type TableFontSize = keyof typeof TABLE_FONT_SIZES;

export const TABLE_PADDINGS = {
  compact: "8px 12px",
  normal: "12px 16px",
  relaxed: "16px 20px",
} as const;
export type TablePadding = keyof typeof TABLE_PADDINGS;

export const TABLE_ALIGNS = ["left", "center", "right"] as const;
export type TableAlign = (typeof TABLE_ALIGNS)[number];

export const TABLE_BORDER_WIDTHS = [0, 1, 2] as const;
export type TableBorderWidth = (typeof TABLE_BORDER_WIDTHS)[number];

export type TableDesign = {
  headerBg: TableColor;
  headerText: TableColor;
  bodyBg: TableColor;
  bodyText: TableColor;
  borderColor: TableColor;
  borderWidth: TableBorderWidth;
  stripeBg: TableColor;
  striped: boolean;
  fontSize: TableFontSize;
  padding: TablePadding;
  align: TableAlign;
};

export const TABLE_TEMPLATES = {
  classic: {
    label: "Classic",
    design: {
      headerBg: "sky",
      headerText: "navy",
      bodyBg: "white",
      bodyText: "slate",
      borderColor: "line",
      borderWidth: 1,
      stripeBg: "paper",
      striped: false,
      fontSize: "base",
      padding: "normal",
      align: "left",
    },
  },
  brand: {
    label: "Brand blue",
    design: {
      headerBg: "blue",
      headerText: "white",
      bodyBg: "white",
      bodyText: "slate",
      borderColor: "periwinkle",
      borderWidth: 1,
      stripeBg: "mist",
      striped: true,
      fontSize: "base",
      padding: "normal",
      align: "left",
    },
  },
  dark: {
    label: "Navy header",
    design: {
      headerBg: "navy",
      headerText: "white",
      bodyBg: "white",
      bodyText: "slate",
      borderColor: "line",
      borderWidth: 1,
      stripeBg: "paper",
      striped: true,
      fontSize: "base",
      padding: "normal",
      align: "left",
    },
  },
  warm: {
    label: "Warm",
    design: {
      headerBg: "orange",
      headerText: "white",
      bodyBg: "white",
      bodyText: "slate",
      borderColor: "peach",
      borderWidth: 1,
      stripeBg: "cream",
      striped: true,
      fontSize: "base",
      padding: "normal",
      align: "left",
    },
  },
  minimal: {
    label: "Minimal",
    design: {
      headerBg: "white",
      headerText: "navy",
      bodyBg: "white",
      bodyText: "slate",
      borderColor: "line",
      borderWidth: 1,
      stripeBg: "paper",
      striped: false,
      fontSize: "base",
      padding: "compact",
      align: "left",
    },
  },
} as const satisfies Record<string, { label: string; design: TableDesign }>;

export type TableTemplate = keyof typeof TABLE_TEMPLATES;

export const DEFAULT_TABLE_TEMPLATE: TableTemplate = "classic";

function pick<T extends string>(value: unknown, allowed: readonly T[] | Record<T, unknown>, fallback: T): T {
  const keys = (Array.isArray(allowed) ? allowed : Object.keys(allowed)) as readonly T[];
  return typeof value === "string" && keys.includes(value as T) ? (value as T) : fallback;
}

/** Template defaults overlaid with whatever the editor customised (validated). */
export function resolveTableDesign(attrs: Record<string, unknown> | null | undefined): TableDesign {
  const template = pick(attrs?.template, TABLE_TEMPLATES, DEFAULT_TABLE_TEMPLATE);
  const base: TableDesign = TABLE_TEMPLATES[template].design;
  // Number(null) is 0, so only read real values (null means "use the template").
  const borderWidth =
    attrs?.borderWidth == null || attrs.borderWidth === "" ? Number.NaN : Number(attrs.borderWidth);
  return {
    headerBg: pick(attrs?.headerBg, TABLE_COLORS, base.headerBg),
    headerText: pick(attrs?.headerText, TABLE_COLORS, base.headerText),
    bodyBg: pick(attrs?.bodyBg, TABLE_COLORS, base.bodyBg),
    bodyText: pick(attrs?.bodyText, TABLE_COLORS, base.bodyText),
    borderColor: pick(attrs?.borderColor, TABLE_COLORS, base.borderColor),
    borderWidth: (TABLE_BORDER_WIDTHS as readonly number[]).includes(borderWidth)
      ? (borderWidth as TableBorderWidth)
      : base.borderWidth,
    stripeBg: pick(attrs?.stripeBg, TABLE_COLORS, base.stripeBg),
    striped: typeof attrs?.striped === "boolean" ? attrs.striped : base.striped,
    fontSize: pick(attrs?.fontSize, TABLE_FONT_SIZES, base.fontSize),
    padding: pick(attrs?.padding, TABLE_PADDINGS, base.padding),
    align: pick(attrs?.align, TABLE_ALIGNS, base.align),
  };
}

/** CSS custom properties consumed by TABLE_WRAPPER_CLASS / TABLE_CLASS. */
export function tableStyleVars(design: TableDesign): string {
  return [
    `--tb-head-bg:${TABLE_COLORS[design.headerBg]}`,
    `--tb-head-fg:${TABLE_COLORS[design.headerText]}`,
    `--tb-bg:${TABLE_COLORS[design.bodyBg]}`,
    `--tb-fg:${TABLE_COLORS[design.bodyText]}`,
    `--tb-border:${TABLE_COLORS[design.borderColor]}`,
    `--tb-bw:${design.borderWidth}px`,
    `--tb-stripe:${design.striped ? TABLE_COLORS[design.stripeBg] : TABLE_COLORS[design.bodyBg]}`,
    `--tb-fs:${TABLE_FONT_SIZES[design.fontSize]}`,
    `--tb-pad:${TABLE_PADDINGS[design.padding]}`,
    `--tb-align:${design.align}`,
  ].join(";");
}

/**
 * Keeps the `article-table-scroll` marker so `sanitizeContentHtml` doesn't
 * wrap the table a second time.
 */
export const TABLE_WRAPPER_CLASS =
  "article-table-scroll not-prose !my-7 max-w-full overflow-x-auto rounded-xl [border:var(--tb-bw)_solid_var(--tb-border)] bg-[var(--tb-bg)]";

export const TABLE_CLASS =
  "!my-0 w-full min-w-full border-collapse [border-style:hidden] text-[length:var(--tb-fs)] leading-[1.55] text-[color:var(--tb-fg)] [&_th]:![border:var(--tb-bw)_solid_var(--tb-border)] [&_td]:![border:var(--tb-bw)_solid_var(--tb-border)] [&_th]:![padding:var(--tb-pad)] [&_td]:![padding:var(--tb-pad)] [&_th]:[text-align:var(--tb-align)] [&_td]:[text-align:var(--tb-align)] [&_th]:align-top [&_td]:align-top [&_th]:!bg-[var(--tb-head-bg)] [&_th]:!text-[color:var(--tb-head-fg)] [&_th]:font-bold [&_td]:bg-[var(--tb-bg)] [&_tbody_tr:nth-child(even)_td]:bg-[var(--tb-stripe)] [&_p]:!m-0 [&_p]:!leading-[1.55] [&_strong]:!text-inherit [&_ul]:!my-1 [&_ul]:!ml-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:!my-1 [&_ol]:!ml-0 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:!mb-0.5";

/* ----------------------------------------------------------------- helpers */

const SAFE_HREF = /^(https?:\/\/|\/(?!\/)|#|mailto:)/i;

/** Only allow web, site-relative, anchor and mailto links in CTA buttons. */
export function safeBlockHref(value: unknown): string {
  const href = typeof value === "string" ? value.trim() : "";
  return href && SAFE_HREF.test(href) ? href : "";
}

export function pickKey<T extends string>(value: unknown, allowed: Record<T, unknown>, fallback: T): T {
  return pick(value, allowed, fallback);
}
