import { cn } from "@/lib/utils";

type SkillKey = "listening" | "reading" | "writing" | "speaking" | "general";

const SKILL_DOT_COLOR: Record<SkillKey, string> = {
  listening: "bg-primary1",
  reading: "bg-error1",
  writing: "bg-success",
  speaking: "bg-secondary2",
  general: "bg-primary2",
};

function skillFromCategory(category: string): SkillKey | null {
  const key = category.trim().toLowerCase();
  if (
    key === "listening" ||
    key === "reading" ||
    key === "writing" ||
    key === "speaking" ||
    key === "general"
  ) {
    return key;
  }
  return null;
}

type ContentCategoryTagProps = {
  category: string;
  className?: string;
  variant?: "muted" | "surface";
};

export function ContentCategoryTag({
  category,
  className,
  variant = "muted",
}: ContentCategoryTagProps) {
  const skill = skillFromCategory(category);

  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-text3",
        variant === "surface" ? "bg-white" : "bg-primary6",
        className,
      )}
    >
      <span
        className={cn(
          "inline-block h-1.5 w-1.5 shrink-0 rounded-full",
          skill ? SKILL_DOT_COLOR[skill] : "bg-text3",
        )}
        aria-hidden
      />
      {category}
    </span>
  );
}
