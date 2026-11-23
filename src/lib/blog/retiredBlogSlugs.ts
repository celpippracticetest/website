/**
 * Retired blog posts (SEO sheet "Blog-Redirections", Nov 2026).
 *
 * Imported by `next.config.ts` (301 redirects) and `src/proxy.ts` (410), so
 * keep this file free of imports and aliases.
 *
 * Rows in the sheet whose destination was still "new content is being
 * created" are not listed yet; those posts stay live until a URL arrives.
 */

/** Old slug → new path. Served as permanent (301/308) redirects. */
export const RETIRED_BLOG_REDIRECTS: Record<string, string> = {
  "celpip-for-australian-visa-no-but-why-australiares-use-it-for-canadian-pr":
    "/blog/celpip-in-australia",
  "celpip-speaking-tips-talking-about-a-personal-experience-speaking-task-2":
    "/blog/celpip-speaking-task-2-template",
  "the-goldfish-memory-fix-how-to-master-note-taking-for-celpip-listening-parts-4-6":
    "/blog/note-taking-for-celpip-listening",
  "celpip-writing-task-1-samples-email-tone-clb-9-2026":
    "/blog/celpip-writing-task-1-template",
  "how-to-overcome-test-anxiety-for-the-3-hour-celpip-exam":
    "/blog/how-to-stay-calm-during-the-celpip-exam",
  "why-10-full-length-celpip-mock-tests-are-better-than-100-practice-questions":
    "/exam-overview",
  "complete-guide-celpip-test-booking-results-clb": "/blog/what-is-celpip-exam",
  "7-key-strategies-to-excel-in-celpip-writing-test":
    "/blog/increase-celpip-writing-score",
  "how-to-go-from-clb-8-to-9-in-celpip-writing-and-speaking-in-10-days":
    "/blog/increase-celpip-writing-score",
  "why-keep-celpip-score-updated-before-pr-application":
    "/blog/how-long-is-a-celpip-score-valid",
  "celpip-reading-tips-and-tricks": "/blog/increase-celpip-reading-score",
  "how-to-master-celpip-speaking-pictures-task-3-tips-with-sample-answers":
    "/blog/celpip-speaking-task-3",
};

/** Deleted posts. `/blog/<slug>` answers 410 Gone. */
export const GONE_BLOG_SLUGS: ReadonlySet<string> = new Set([
  "the-top-5-celpip-practice-platforms-of-2026-which-one-actually-gets-you-to-clb-9",
  "celpip-for-eces-why-early-childhood-educators-are-switching-from-ielts-to-celpip-in-2026",
  "ultimate-checklist-last-minute-celpip-practice-session",
  // Also in the redirect sheet with "new content later"; 410 until that URL exists.
  "celpip-speaking-topics-march-2026-analyzed-answered",
  "why-you-re-stuck-at-clb-8",
  "celpip-reading-score-chart-2026-how-to-calculate-your-clb-level-from-raw-scores-38-questions",
  "celpip-test-format-2026-complete-guide",
  "frequently-asked-questions-celpip-selpip-celpio",
  "why-clb-7-boosts-canada-immigration-chances",
  "mastering-celpip-g-study-materials-score-charts-registration",
]);

/** `/blog/<slug>` or `/blog/<slug>/` → gone? (case-insensitive) */
export function isGoneBlogPath(pathname: string): boolean {
  const m = /^\/blog\/([^/]+)\/?$/i.exec(pathname);
  if (!m) return false;
  let slug = m[1];
  try {
    slug = decodeURIComponent(slug);
  } catch {
    // malformed escape: compare the raw segment
  }
  return GONE_BLOG_SLUGS.has(slug.toLowerCase());
}

/**
 * If `path` points at a retired post, return its final destination so other
 * redirects don't chain (A → retired post → new post).
 */
export function resolveRetiredBlogPath(path: string): string {
  const m = /^\/blog\/([^/?#]+)\/?$/.exec(path);
  return (m && RETIRED_BLOG_REDIRECTS[m[1].toLowerCase()]) || path;
}
