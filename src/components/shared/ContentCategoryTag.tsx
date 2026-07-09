import { BrandNavIcon, type BrandNavIconName } from "@/components/brand/BrandNavIcon";
import { cn } from "@/lib/utils";

type SkillKey = "listening" | "reading" | "writing" | "speaking";

const SKILL_ICON_COLOR: Record<SkillKey, string> = {
  listening: "text-brand-blue",
  reading: "text-brand-blue",
  writing: "text-brand-red",
  speaking: "text-brand-red",
};

function skillFromCategory(category: string): SkillKey | null {
  const key = category.trim().toLowerCase();
  if (
    key === "listening" ||
    key === "reading" ||
    key === "writing" ||
    key === "speaking"
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
        variant === "surface" ? "bg-white" : "bg-brand-surface-muted",
        className,
      )}
    >
      {skill ? (
        <BrandNavIcon
          name={skill}
          className={cn("h-3 w-3 shrink-0", SKILL_ICON_COLOR[skill])}
        />
      ) : (
        <span
          className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-brand-muted"
          aria-hidden
        />
      )}
      {category}
    </span>
  );
}
