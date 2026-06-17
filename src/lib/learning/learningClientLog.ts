type LearningClientLogMeta = Record<string, unknown>;

export function learningClientLog(phase: string, meta?: LearningClientLogMeta) {
  if (process.env.NODE_ENV === "production") return;
  if (meta && Object.keys(meta).length > 0) {
    console.log(`[learning:client] ${phase}`, meta);
    return;
  }
  console.log(`[learning:client] ${phase}`);
}

export function startLearningClientTimer(phase: string, meta?: LearningClientLogMeta) {
  const startedAt = performance.now();
  learningClientLog(`${phase} start`, meta);

  return (extra?: LearningClientLogMeta) => {
    learningClientLog(phase, {
      ms: Math.round(performance.now() - startedAt),
      ...meta,
      ...extra,
    });
  };
}

export function summarizeClientLessonStates(
  lessons: Array<{ skill: string; state: string; sequenceNumber?: number }> | undefined
) {
  if (!lessons?.length) return {};
  return Object.fromEntries(
    lessons.map((lesson) => [
      lesson.skill,
      lesson.sequenceNumber != null
        ? `${lesson.state}#${lesson.sequenceNumber}`
        : lesson.state,
    ])
  );
}
