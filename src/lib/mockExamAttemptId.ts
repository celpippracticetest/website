/**
 * Normalizes `attemptId` from the address bar or API payloads.
 * Bad links used `${searchParams.get("attemptId")}` when missing, which stringifies to `"null"`.
 */
export function sanitizeMockExamAttemptIdParam(
  raw: string | null | undefined
): string | undefined {
  if (raw == null) return undefined;
  const t = raw.trim();
  if (t === "" || t === "null" || t === "undefined" || t === "legacy") {
    return undefined;
  }
  return t;
}

/** Client-generated ids look like `att_<timestamp>_<random>`. */
export function isWellFormedMockExamAttemptId(
  raw: string | null | undefined,
): boolean {
  const t = sanitizeMockExamAttemptIdParam(raw);
  return Boolean(t && /^att_\d+_[a-z0-9]+$/i.test(t));
}

const attemptStorageKey = (examId: string) => `mockExamAttempt:${examId}`;

/** Keep the active attempt when users leave results / switch parts without query params. */
export function rememberMockExamAttemptId(
  examId: string,
  attemptRaw: string | null | undefined
): void {
  const aid = sanitizeMockExamAttemptIdParam(attemptRaw);
  if (!aid || typeof window === "undefined") return;
  try {
    sessionStorage.setItem(attemptStorageKey(examId), aid);
  } catch {
    /* private mode / quota */
  }
}

export function readRememberedMockExamAttemptId(
  examId: string
): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return sanitizeMockExamAttemptIdParam(
      sessionStorage.getItem(attemptStorageKey(examId))
    );
  } catch {
    return undefined;
  }
}

export function createMockExamAttemptId(): string {
  return `att_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function mockExamPartHref(
  examTaskId: string,
  partId: number,
  attemptRaw?: string | null | undefined,
  extras?: { section?: string | null }
): string {
  const params = new URLSearchParams();
  const aid = sanitizeMockExamAttemptIdParam(attemptRaw);
  if (aid) params.set("attemptId", aid);
  const section = extras?.section?.trim();
  if (section) params.set("section", section);
  const q = params.toString();
  return `/exams/exam_${examTaskId}/part${partId}${q ? `?${q}` : ""}`;
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

export type MockExamSkillSection = "listening" | "reading" | "writing" | "speaking";

const nextSectionAfterComplete: Record<
  MockExamSkillSection,
  { nextSection: MockExamSkillSection; startPart: number } | null
> = {
  listening: { nextSection: "reading", startPart: 7 },
  reading: { nextSection: "writing", startPart: 11 },
  writing: { nextSection: "speaking", startPart: 13 },
  speaking: null,
};

export function mockExamSectionResultsHref(
  examTaskId: string,
  section: MockExamSkillSection,
  attemptRaw?: string | null | undefined
): string {
  const params = new URLSearchParams();
  params.set("section", section);
  const aid = sanitizeMockExamAttemptIdParam(attemptRaw);
  if (aid) params.set("attemptId", aid);
  const next = nextSectionAfterComplete[section];
  if (next) params.set("continue", next.nextSection);
  return `/exams/exam_${examTaskId}/results?${params.toString()}`;
}

export function mockExamContinueAfterSectionHref(
  examTaskId: string,
  completedSection: MockExamSkillSection,
  attemptRaw?: string | null | undefined
): string | null {
  const next = nextSectionAfterComplete[completedSection];
  if (!next) return null;
  return mockExamContinueToSectionHref(
    examTaskId,
    next.nextSection,
    attemptRaw
  );
}

const sectionStartPart: Record<MockExamSkillSection, number> = {
  listening: 1,
  reading: 7,
  writing: 11,
  speaking: 13,
};

export function mockExamContinueToSectionHref(
  examTaskId: string,
  targetSection: MockExamSkillSection,
  attemptRaw?: string | null | undefined
): string {
  const params = new URLSearchParams();
  params.set("section", targetSection);
  const aid = sanitizeMockExamAttemptIdParam(attemptRaw);
  if (aid) params.set("attemptId", aid);
  const query = params.toString();
  return `/exams/exam_${examTaskId}/part${sectionStartPart[targetSection]}${query ? `?${query}` : ""}`;
}

export function parseMockExamSkillSection(
  raw: string | null | undefined
): MockExamSkillSection | undefined {
  if (
    raw === "listening" ||
    raw === "reading" ||
    raw === "writing" ||
    raw === "speaking"
  ) {
    return raw;
  }
  return undefined;
}
