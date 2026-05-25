"use client";

import type { ReactNode } from "react";
import { ClipboardList, Library, Star, Users, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { pricingUpgradeModalHeaderBullets } from "@/components/pages/pricing/pricingContent";

const GOOGLE_REVIEWS_URL = process.env.NEXT_PUBLIC_GOOGLE_REVIEWS_URL?.trim();

const HEADER_BULLET_ICONS: Record<(typeof pricingUpgradeModalHeaderBullets)[number], LucideIcon> = {
  "60 full mock exams": ClipboardList,
  "3,000+ practice questions": Library,
};

const HEADER_BULLET_ICON_STYLES: Record<
  (typeof pricingUpgradeModalHeaderBullets)[number],
  { bg: string; text: string }
> = {
  "60 full mock exams": { bg: "bg-blue-50", text: "text-[#2563EB]" },
  "3,000+ practice questions": { bg: "bg-emerald-50", text: "text-emerald-600" },
};

const STAR_ICON_STYLE = { bg: "bg-amber-50", text: "text-amber-500" };
const USERS_ICON_STYLE = { bg: "bg-sky-50", text: "text-sky-600" };

function LivePulseDot() {
  return (
    <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
    </span>
  );
}

export type PricingUpgradeModalHeaderListProps = {
  /** When set, shows a “joined today” row (navbar modal live stat). */
  signupDisplay?: string;
  /** When set, shows a “visits today” row (hero live stat). */
  visitsDisplay?: string;
  className?: string;
  itemTextClassName?: string;
  emphasisTextClassName?: string;
  iconWrapClassName?: string;
  linkClassName?: string;
};

function HeaderListItem({
  icon: Icon,
  children,
  itemTextClassName,
  iconWrapClassName,
  iconBgClassName,
  iconColorClassName,
  emphasis,
  emphasisTextClassName,
}: {
  icon: LucideIcon;
  children: ReactNode;
  itemTextClassName?: string;
  iconWrapClassName?: string;
  iconBgClassName?: string;
  iconColorClassName?: string;
  emphasis?: boolean;
  emphasisTextClassName?: string;
}) {
  return (
    <li className="flex items-start gap-2.5 text-sm leading-snug">
      <span
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md",
          iconBgClassName ?? "bg-[#1B2B5A]/8",
          iconColorClassName ?? "text-[#1B2B5A]",
          iconWrapClassName
        )}
        aria-hidden
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
      </span>
      <span
        className={cn(
          itemTextClassName ?? "text-slate-600",
          emphasis && (emphasisTextClassName ?? "font-semibold text-[#1B2B5A]")
        )}
      >
        {children}
      </span>
    </li>
  );
}

export function PricingUpgradeModalHeaderList({
  signupDisplay,
  visitsDisplay,
  className,
  itemTextClassName,
  emphasisTextClassName,
  iconWrapClassName,
  linkClassName,
}: PricingUpgradeModalHeaderListProps) {
  return (
    <ul className={cn("m-0 max-w-xl list-none space-y-2", className)}>
      {pricingUpgradeModalHeaderBullets.map((label) => {
        const iconStyle = HEADER_BULLET_ICON_STYLES[label];
        return (
          <HeaderListItem
            key={label}
            icon={HEADER_BULLET_ICONS[label]}
            iconBgClassName={iconStyle.bg}
            iconColorClassName={iconStyle.text}
            itemTextClassName={itemTextClassName}
            iconWrapClassName={iconWrapClassName}
          >
            {label}
          </HeaderListItem>
        );
      })}
      {visitsDisplay != null ? (
        <li className="flex items-start gap-2.5 text-sm leading-snug">
          <span
            className={cn(
              "relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md",
              USERS_ICON_STYLE.bg,
              USERS_ICON_STYLE.text,
              iconWrapClassName
            )}
            aria-hidden
          >
            <Users className="h-3.5 w-3.5" strokeWidth={2.25} />
            <span className="absolute -right-0.5 -top-0.5">
              <LivePulseDot />
            </span>
          </span>
          <span
            className={cn(
              "flex flex-wrap items-center gap-1.5",
              itemTextClassName ?? "text-slate-600",
              emphasisTextClassName ?? "font-semibold text-[#1B2B5A]"
            )}
          >
            <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
              <span className="sr-only">Live — </span>
              Live
            </span>
            <span>{visitsDisplay} visits today</span>
          </span>
        </li>
      ) : signupDisplay != null ? (
        <li className="flex items-start gap-2.5 text-sm leading-snug">
          <span
            className={cn(
              "relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md",
              USERS_ICON_STYLE.bg,
              USERS_ICON_STYLE.text,
              iconWrapClassName
            )}
            aria-hidden
          >
            <Users className="h-3.5 w-3.5" strokeWidth={2.25} />
            <span className="absolute -right-0.5 -top-0.5">
              <LivePulseDot />
            </span>
          </span>
          <span
            className={cn(
              "flex flex-wrap items-center gap-1.5",
              itemTextClassName ?? "text-slate-600",
              emphasisTextClassName ?? "font-semibold text-[#1B2B5A]"
            )}
          >
            <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
              <span className="sr-only">Live — </span>
              Live
            </span>
            <span>
              {signupDisplay}+ joined today
            </span>
          </span>
        </li>
      ) : null}
      <HeaderListItem
        icon={Star}
        emphasis
        iconBgClassName={STAR_ICON_STYLE.bg}
        iconColorClassName={STAR_ICON_STYLE.text}
        itemTextClassName={itemTextClassName}
        iconWrapClassName={iconWrapClassName}
        emphasisTextClassName={emphasisTextClassName}
      >
        {GOOGLE_REVIEWS_URL ? (
          <a
            href={GOOGLE_REVIEWS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "font-semibold text-inherit hover:underline",
              linkClassName
            )}
          >
            4.9/5 — read reviews
          </a>
        ) : (
          <span>4.9/5 rating</span>
        )}
      </HeaderListItem>
    </ul>
  );
}
