/** `/skill/{taskId}` (task picker) or `/skill/{practiceId}/{taskId}` (session). */
export function parsePracticeSlug(slug: string[] | undefined) {
  if (!slug?.length) return null;
  if (slug.length === 1) {
    return { kind: "task" as const, taskId: slug[0] };
  }
  if (slug.length === 2) {
    return { kind: "practice" as const, practiceId: slug[0], taskId: slug[1] };
  }
  return null;
}
