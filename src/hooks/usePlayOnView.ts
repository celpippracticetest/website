"use client";

/**
 * Touch screens have no hover, so hover-only transitions never run there.
 * `playOnView` replays them once: the first time an element scrolls into
 * view on a touch device, it gets a `data-play` attribute for a moment.
 * Pair every `hover:`/`group-hover/x:` class with a `data-[play]:` /
 * `group-data-[play]/x:` twin to opt in.
 *
 * Usage: <a ref={playOnView} data-play-delay={index * 120} ...>
 */

/** How long the "hovered" state is held before it eases back. */
const PLAY_HOLD_MS = 1100;

let observer: IntersectionObserver | null = null;

const shouldPlay = () =>
  typeof window !== "undefined" &&
  !window.matchMedia("(hover: hover)").matches &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Adds `data-play` after `delay` ms and removes it again after the hold. */
export function playOnce(el: HTMLElement, delay = 0) {
  if (!shouldPlay()) return;
  window.setTimeout(() => {
    el.setAttribute("data-play", "");
    window.setTimeout(() => el.removeAttribute("data-play"), PLAY_HOLD_MS);
  }, delay);
}

function getObserver() {
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          observer?.unobserve(el);
          playOnce(el, 250 + Number(el.dataset.playDelay ?? 0));
        }
      },
      { threshold: 0.6 },
    );
  }
  return observer;
}

/** Callback ref: plays the element's hover transition once when it scrolls into view (touch only). */
export function playOnView(el: HTMLElement | null) {
  if (!el || !shouldPlay()) return;
  getObserver().observe(el);
}
