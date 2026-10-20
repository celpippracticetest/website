"use client";

import { useEffect, useState } from "react";
import type { BlogTocItem } from "@/lib/blog/toc";

/** Heading counts as "current" once its top passes this line (below the header). */
const ACTIVE_OFFSET = 140;

function useActiveHeading(items: BlogTocItem[]): string | null {
  const [active, setActive] = useState<string | null>(items[0]?.id ?? null);

  useEffect(() => {
    if (!items.length) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      let current: string | null = items[0]?.id ?? null;
      for (const item of items) {
        const el = document.getElementById(item.id);
        if (!el) continue;
        if (el.getBoundingClientRect().top - ACTIVE_OFFSET <= 0) current = item.id;
        else break;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [items]);

  return active;
}

function jumpTo(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  history.replaceState(null, "", `#${id}`);
}

function TocList({
  items,
  active,
  onPick,
}: {
  items: BlogTocItem[];
  active: string | null;
  onPick?: () => void;
}) {
  return (
    <ol className="flex flex-col border-l border-[#E3E8F2]">
      {items.map((item) => {
        const isActive = item.id === active;
        return (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              aria-current={isActive ? "location" : undefined}
              onClick={(event) => {
                event.preventDefault();
                jumpTo(item.id);
                onPick?.();
              }}
              className={`relative -ml-px block border-l-2 py-1.5 pr-2 text-[14px] leading-snug transition-colors duration-200 ${
                item.level === 3 ? "pl-7 text-[13.5px]" : "pl-4"
              } ${
                isActive
                  ? "border-[#2554D6] font-semibold text-[#2554D6]"
                  : "border-transparent text-[#5B6B82] hover:border-[#C9D5F5] hover:text-[#212E42]"
              }`}
            >
              {item.text}
            </a>
          </li>
        );
      })}
    </ol>
  );
}

/** Sticky sidebar version (large screens). */
export function BlogTocSidebar({ items }: { items: BlogTocItem[] }) {
  const active = useActiveHeading(items);
  if (items.length < 2) return null;
  return (
    <nav
      aria-label="Table of contents"
      className="rounded-2xl border border-[#E3E8F2] bg-white p-5"
    >
      <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.08em] text-[#212E42]">
        On this page
      </p>
      <div className="max-h-[calc(100vh-420px)] min-h-[120px] overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin]">
        <TocList items={items} active={active} />
      </div>
    </nav>
  );
}

/** Collapsible version shown above the article on phones and tablets. */
export function BlogTocInline({ items }: { items: BlogTocItem[] }) {
  const [open, setOpen] = useState(false);
  const active = useActiveHeading(items);
  if (items.length < 2) return null;
  return (
    <nav
      aria-label="Table of contents"
      className="mt-8 rounded-2xl border border-[#E3E8F2] bg-[#FAFBFE]"
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 rounded-2xl px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2554D6]/40"
      >
        <span className="text-[15px] font-bold text-[#212E42]">
          On this page
          <span className="ml-2 text-[13px] font-medium text-[#5B6B82]">{items.length} sections</span>
        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`size-5 shrink-0 text-[#5B6B82] transition-transform duration-300 ease-out ${open ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-4" inert={!open}>
            <TocList items={items} active={active} onPick={() => setOpen(false)} />
          </div>
        </div>
      </div>
    </nav>
  );
}
