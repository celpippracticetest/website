/** Mock exam shown as "Exam 1". Guests can take it; results require an account. */
export const FREE_GUEST_MOCK_EXAM_ORDER = 1;

export function isFreeGuestMockExam(
  exam: { order?: number | null } | null | undefined,
): boolean {
  return exam?.order === FREE_GUEST_MOCK_EXAM_ORDER;
}
