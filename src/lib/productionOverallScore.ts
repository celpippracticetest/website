type ProductionResult = {
  overall?: number;
  contentAndCoherence?: number;
  vocabulary?: number;
  readabilityAndGrammar?: number;
  taskFulfillment?: number;
};

type ProductionAnswer = {
  overalScore?: number;
  result?: ProductionResult | null;
};

function isFiniteScore(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function averageSkillScores(result: ProductionResult): number | null {
  const skillScores = [
    result.contentAndCoherence,
    result.vocabulary,
    result.readabilityAndGrammar,
    result.taskFulfillment,
  ].filter(isFiniteScore);

  if (skillScores.length === 0) {
    return null;
  }

  return Math.round(
    skillScores.reduce((sum, score) => sum + score, 0) / skillScores.length
  );
}

/** Resolve writing/speaking overall score from stored fields or skill subscores. */
export function getProductionOverallScore(
  answer?: ProductionAnswer | null
): number {
  if (!answer) {
    return 0;
  }

  if (isFiniteScore(answer.result?.overall)) {
    return answer.result.overall;
  }

  if (isFiniteScore(answer.overalScore)) {
    return answer.overalScore;
  }

  if (answer.result) {
    const fromSkills = averageSkillScores(answer.result);
    if (fromSkills !== null) {
      return fromSkills;
    }
  }

  return 0;
}

export function getProductionSkillScores(answer?: ProductionAnswer | null) {
  return {
    coherence: answer?.result?.contentAndCoherence ?? 0,
    vocabulary: answer?.result?.vocabulary ?? 0,
    readability: answer?.result?.readabilityAndGrammar ?? 0,
    fulfillment: answer?.result?.taskFulfillment ?? 0,
  };
}
