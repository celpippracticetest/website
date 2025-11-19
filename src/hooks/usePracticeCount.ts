import { useMemo } from "react";
import { generatePracticeCount } from "@/lib/generatePracticeCount";

/**
 * React hook to generate practice count
 * 
 * @param taskId - The task ID
 * @param practiceId - The practice ID
 * @returns Formatted count string (e.g., "0.5k", "1.2k", "5.0k")
 * 
 * @example
 * ```tsx
 * const count = usePracticeCount(task.id, practice.id);
 * <StatBadge count={count} label="answered today" />
 * ```
 */
export function usePracticeCount(
  taskId: string,
  practiceId: string
): string {
  return useMemo(() => {
    if (!taskId || !practiceId) {
      return "1.0k";
    }
    return generatePracticeCount(taskId, practiceId);
  }, [taskId, practiceId]);
}

