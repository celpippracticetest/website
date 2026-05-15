/**
 * Normalizes `attemptId` from the address bar or API payloads.
 * Bad links used `${searchParams.get("attemptId")}` when missing, which stringifies to `"null"`.
 */
export function sanitizeMockExamAttemptIdParam(
  raw: string | null | undefined
): string | undefined {
  if (raw == null) return undefined;
  const t = raw.trim();
  if (t === "" || t === "null" || t === "undefined") return undefined;
  return t;
}

/** Bucket for results / history: bogus or missing attempt → same group as legacy rows. */
export function mockExamAttemptGroupKey(raw: string | null | undefined): string {
  return sanitizeMockExamAttemptIdParam(raw) ?? "legacy";
}

export function mockExamResultsHref(
  examTaskId: string,
  attemptRaw: string | null | undefined
): string {
  const aid = sanitizeMockExamAttemptIdParam(attemptRaw);
  return aid
    ? `/exams/exam_${examTaskId}/results?attemptId=${encodeURIComponent(aid)}`
    : `/exams/exam_${examTaskId}/results`;
}
