type LearningLogMeta = Record<string, unknown>;

function learningTimingEnabled(): boolean {
  return process.env.LEARNING_TIMING_LOG !== "0";
}

export function learningTimingLog(phase: string, meta?: LearningLogMeta): void {
  if (!learningTimingEnabled()) return;
  if (meta && Object.keys(meta).length > 0) {
    console.log(`[learning] ${phase}`, meta);
    return;
  }
  console.log(`[learning] ${phase}`);
}

export function startLearningTimer(phase: string, meta?: LearningLogMeta) {
  const startedAt = performance.now();
  if (meta) {
    learningTimingLog(`${phase} start`, meta);
  } else {
    learningTimingLog(`${phase} start`);
  }

  return (extra?: LearningLogMeta) => {
    learningTimingLog(phase, {
      ms: Math.round(performance.now() - startedAt),
      ...meta,
      ...extra,
    });
  };
}

export function summarizeLessonStates(
  lessons: Array<{ skill: string; state: string; sequenceNumber?: number }>
) {
  return Object.fromEntries(
    lessons.map((lesson) => [
      lesson.skill,
      lesson.sequenceNumber != null
        ? `${lesson.state}#${lesson.sequenceNumber}`
        : lesson.state,
    ])
  );
}
