export type BlogAuthorProfile = {
  name: string;
  title: string;
  bio: string;
  /** Square image; falls back to initials when missing. */
  avatarUrl?: string;
  email?: string;
};

/**
 * Author cards on blog posts. Keyed by the post's "Author Name" (CMS field),
 * case-insensitive. Add a person here to give them their own card; anyone
 * not listed gets the team profile with their name.
 */
const BLOG_AUTHORS: BlogAuthorProfile[] = [
  {
    name: "CELPIP Practice Test Team",
    title: "CELPIP Content Team",
    bio: "Our team of CELPIP instructors and test-prep writers turns real exam patterns into clear strategies, sample answers and practice you can use right away.",
    avatarUrl: "/favicon/android-chrome-192x192.png",
    email: "support@celpippracticetest.com",
  },
];

const TEAM = BLOG_AUTHORS[0]!;

export function getBlogAuthor(name: string | null | undefined): BlogAuthorProfile {
  const key = (name ?? "").trim().toLowerCase();
  const match = BLOG_AUTHORS.find((author) => author.name.toLowerCase() === key);
  if (match) return match;
  if (!key) return TEAM;
  const displayName = (name ?? "").trim();
  return {
    name: displayName,
    title: "Writer, CELPIP Practice Test",
    bio: `${displayName} writes for the CELPIP Practice Test blog, sharing practical strategies and sample answers to help you reach your target CLB.`,
    email: TEAM.email,
  };
}
