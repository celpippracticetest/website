export type SkillLandingAvailableTask = {
  id: string;
  taskNumber: string;
};

export function matchSkillLandingTask(
  contentTaskId: string,
  availableTasks: SkillLandingAvailableTask[],
) {
  return availableTasks.find((task) => {
    const num = task.taskNumber.replace(/\D/g, "");
    return num === contentTaskId;
  });
}

export function skillLandingTaskHref(
  skillType: string,
  contentTaskId: string,
  availableTasks: SkillLandingAvailableTask[],
) {
  const realTask = matchSkillLandingTask(contentTaskId, availableTasks);
  return `/${skillType}?taskId=${realTask?.id ?? contentTaskId}`;
}
