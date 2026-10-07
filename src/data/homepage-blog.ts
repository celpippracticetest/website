/**
 * Articles featured in the homepage "CELPIP Tips and Guides" section, in display
 * order. Card copy (title, category, read time) is editorial, from the design
 * handoff; the cover image and publish date are read live from the CMS by slug.
 * A post that is missing or unpublished in the CMS is skipped.
 */
export type HomepageFeaturedPost = {
  slug: string;
  title: string;
  category: string;
  readTime: string;
  /** Shown only if the CMS has no publish date. */
  fallbackDate: string;
};

export const HOMEPAGE_FEATURED_POSTS: HomepageFeaturedPost[] = [
  {
    slug: "increase-celpip-listening-score",
    title: "How to Increase Your CELPIP Listening Score",
    category: "Listening",
    readTime: "7 min read",
    fallbackDate: "Sep 17, 2026",
  },
  {
    slug: "increase-celpip-reading-score",
    title: "How to Increase Your CELPIP Reading Score",
    category: "Reading",
    readTime: "6 min read",
    fallbackDate: "Sep 15, 2026",
  },
  {
    slug: "increase-celpip-speaking-score",
    title: "How to Increase Your CELPIP Speaking Score",
    category: "Speaking",
    readTime: "5 min read",
    fallbackDate: "Sep 13, 2026",
  },
  {
    slug: "how-to-book-celpip-exam",
    title: "How to Book the CELPIP Exam",
    category: "Test info",
    readTime: "8 min read",
    fallbackDate: "Sep 11, 2026",
  },
];
