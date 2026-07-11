/** Relative label for a practice submission (prefers last update over original create time). */
export function formatSubmissionRelativeTime(answer: {
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
}): string {
  const now = new Date();
  const submittedAt = new Date(answer.updatedAt ?? answer.createdAt ?? 0);
  if (Number.isNaN(submittedAt.getTime())) return "";

  const diffInMs = now.getTime() - submittedAt.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) return "Just now";
  if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
  if (diffInHours < 24) return `${diffInHours} hours ago`;
  if (diffInDays < 365) {
    return submittedAt.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
    });
  }
  return submittedAt.toLocaleDateString("en-US", {
    year: "2-digit",
    month: "short",
  });
}
