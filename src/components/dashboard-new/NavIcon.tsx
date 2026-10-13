"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type NavIconName = "practice" | "mockExams" | "learning" | "words";

/**
 * One matching set of animated navigation icons (24 px, 1.8 stroke, rounded).
 * Each plays its motion when the closest `group/nav` parent is hovered or
 * focused, and once on mount when `active` (i.e. when you land on that page).
 * Colour comes from `currentColor`. Static under reduced motion.
 */
// Full class names (Tailwind only generates classes it can read literally).
const ANIMATIONS = {
  pageTurn: {
    trigger: "group-hover/nav:animate-nav-page-turn group-focus-visible/nav:animate-nav-page-turn",
    active: "animate-nav-page-turn",
  },
  draw: {
    trigger: "group-hover/nav:animate-nav-draw group-focus-visible/nav:animate-nav-draw",
    active: "animate-nav-draw",
  },
  pop: {
    trigger: "group-hover/nav:animate-nav-pop group-focus-visible/nav:animate-nav-pop",
    active: "animate-nav-pop",
  },
  wiggle: {
    trigger: "group-hover/nav:animate-nav-wiggle group-focus-visible/nav:animate-nav-wiggle",
    active: "animate-nav-wiggle",
  },
  flip: {
    trigger: "group-hover/nav:animate-nav-flip group-focus-visible/nav:animate-nav-flip",
    active: "animate-nav-flip",
  },
  swapOut: {
    trigger: "group-hover/nav:animate-nav-swap-out group-focus-visible/nav:animate-nav-swap-out",
    active: "animate-nav-swap-out",
  },
  swapIn: {
    trigger: "group-hover/nav:animate-nav-swap-in group-focus-visible/nav:animate-nav-swap-in",
    active: "animate-nav-swap-in",
  },
} as const;

const NavIcon = ({ name, active = false, className }: { name: NavIconName; active?: boolean; className?: string }) => {
  // Each motion has two triggers: hover/focus of the nav item, and an active
  // page (the class is present on mount, so it plays once when you land there).
  const play = (animation: keyof typeof ANIMATIONS, extra = "") =>
    cn(
      ANIMATIONS[animation].trigger,
      active && ANIMATIONS[animation].active,
      "motion-reduce:!animate-none",
      extra,
    );

  const svgProps = {
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    className: cn("overflow-visible", className),
  };

  if (name === "practice") {
    // Open book: a page turns over the spine.
    return (
      <svg {...svgProps}>
        <path d="M12 6.5C10.3 5.3 7.9 4.8 4 5v12.5c3.9-.2 6.3.3 8 1.5" />
        <path d="M12 6.5c1.7-1.2 4.1-1.7 8-1.5v12.5c-3.9-.2-6.3.3-8 1.5" />
        <path d="M12 6.5V19" />
        <path
          d="M12 6.5c1.4-.9 3.3-1.3 6-1.2v11c-2.7-.1-4.6.3-6 1.2z"
          className={play("pageTurn", "fill-white [transform-box:fill-box] origin-left")}
        />
      </svg>
    );
  }

  if (name === "mockExams") {
    // Test sheet: the lines write themselves, then a tick is drawn.
    const line = (d: string, delay: string) => (
      <path d={d} pathLength={1} strokeDasharray="1" className={play("draw", delay)} />
    );
    return (
      <svg {...svgProps}>
        <rect x="4.5" y="3" width="15" height="18" rx="2.6" />
        {line("M8.5 8h7", "[animation-delay:0ms]")}
        {line("M8.5 11.5h7", "[animation-delay:90ms]")}
        {line("M8.5 15h3", "[animation-delay:180ms]")}
        <path
          d="M13 15.6l1.6 1.6 2.9-3.2"
          pathLength={1}
          strokeDasharray="1"
          className={play("draw", "[animation-delay:280ms]")}
        />
      </svg>
    );
  }

  if (name === "learning") {
    // Light bulb (AI tutor): it lights up and the rays pop out.
    const ray = (d: string, delay: string) => (
      <path
        d={d}
        className={cn(
          "opacity-0 [transform-box:fill-box] origin-center",
          play("pop", delay),
          "group-hover/nav:opacity-100",
          active && "opacity-100",
        )}
      />
    );
    return (
      <svg {...svgProps}>
        <g className={play("wiggle", "[transform-box:fill-box] origin-bottom")}>
          <path
            d="M12 5.2a5 5 0 0 0-3 9c.6.5 1 1.2 1 2h4c0-.8.4-1.5 1-2a5 5 0 0 0-3-9z"
            className={cn(
              "fill-transparent transition-[fill] duration-300",
              "group-hover/nav:fill-current/15 group-focus-visible/nav:fill-current/15",
              active && "fill-current/15",
            )}
          />
          <path d="M10 19h4M10.6 21.4h2.8" />
        </g>
        {ray("M12 1.6v1.3", "[animation-delay:120ms]")}
        {ray("M5.3 4.3l.9.9", "[animation-delay:180ms]")}
        {ray("M18.7 4.3l-.9.9", "[animation-delay:180ms]")}
        {ray("M2.8 10.2h1.3", "[animation-delay:240ms]")}
        {ray("M21.2 10.2h-1.3", "[animation-delay:240ms]")}
      </svg>
    );
  }

  // Words: a flashcard flips over from "A" to "a".
  return (
    <svg {...svgProps}>
      <rect x="8" y="2.8" width="12" height="15" rx="2.4" className="opacity-50" />
      <g className={play("flip", "[transform-box:fill-box] origin-center")}>
        <rect x="4" y="6.2" width="12" height="15" rx="2.4" className="fill-white" />
        <path d="M7.4 17.4l2.6-7.2 2.6 7.2M8.3 15h3.4" className={play("swapOut")} />
        <g className={cn("opacity-0", play("swapIn"))}>
          <path d="M11.9 12.3v5.1" />
          <circle cx="10" cy="15.2" r="1.95" />
        </g>
      </g>
    </svg>
  );
};

export default NavIcon;
