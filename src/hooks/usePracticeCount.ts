import { useMemo } from "react";
import { generatePracticeCount } from "@/lib/generatePracticeCount";

/**
 * React hook to generate practice count
 * 
 * @param taskId - The task ID
 * @param practiceId - The practice ID
 * @param taskNumber - Task number string (e.g., "Task #1") to ensure proper ordering
 * @returns Formatted count string (e.g., "0.5k", "1.2k", "5.0k")
 * 
 * @example
 * ```tsx
 * const count = usePracticeCount(task.id, practice.id, task.taskNumber);
 * <StatBadge count={count} label="answered today" />
 * ```
 */
export function usePracticeCount(
  taskId: string,
  practiceId: string,
  taskNumber?: string
): string {
  return useMemo(() => {
    if (!taskId || !practiceId) {
      return "1.0k";
    }
    return generatePracticeCount(taskId, practiceId, taskNumber);
  }, [taskId, practiceId, taskNumber]);
}

