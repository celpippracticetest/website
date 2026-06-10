export type FlowSkill = "listening" | "reading" | "writing" | "speaking";
export type UrgencyLevel = "high" | "medium" | "low";
export type FlowStepKind = "learning" | "practice" | "review";

export type BuildMicrolearningFlowInput = {
  subGoal?: string | null;
  targetScore?: number | null;
  focusSkill?: string | null;
  testDate?: string | null;
};

export type MicrolearningStep = {
  id: string;
  kind: FlowStepKind;
  title: string;
  description: string;
  durationMinutes: number;
  skill: FlowSkill;
  ctaLabel: string;
};

export type MicrolearningFlow = {
  urgency: UrgencyLevel;
  daysToExam: number | null;
  focusSkill: FlowSkill;
  targetScore: number | null;
  subGoal: string | null;
  firstActionType: "learning" | "practice";
  steps: MicrolearningStep[];
  reasoning: string[];
};

const TEST_DATE_TO_DAYS: Record<string, number | null> = {
  "In less than 2 weeks": 10,
  "In 1 month": 30,
  "In 2+ months": 75,
  "I haven't booked it yet": null,
};

const SKILL_LABEL_MAP: Record<FlowSkill, string> = {
  listening: "Listening",
  reading: "Reading",
  writing: "Writing",
  speaking: "Speaking",
};

function toFlowSkill(raw: string | null | undefined): FlowSkill {
  const value = (raw || "").toLowerCase();
  if (value.includes("listen")) return "listening";
  if (value.includes("read")) return "reading";
  if (value.includes("writ")) return "writing";
  if (value.includes("speak")) return "speaking";
  return "speaking";
}

function toUrgency(daysToExam: number | null): UrgencyLevel {
  if (daysToExam !== null && daysToExam <= 14) return "high";
  if (daysToExam !== null && daysToExam <= 45) return "medium";
  return "low";
}

function toDaysToExam(testDate: string | null | undefined): number | null {
  if (!testDate) return null;
  if (testDate in TEST_DATE_TO_DAYS) {
    return TEST_DATE_TO_DAYS[testDate] ?? null;
  }

  const parsed = new Date(testDate);
  if (Number.isNaN(parsed.getTime())) return null;
  const diffMs = parsed.getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

function buildReasoning(
  urgency: UrgencyLevel,
  focusSkill: FlowSkill,
  targetScore: number | null,
  daysToExam: number | null,
  subGoal: string | null
): string[] {
  const reasons: string[] = [];
  reasons.push(`Primary focus is ${SKILL_LABEL_MAP[focusSkill]} based on your onboarding choice.`);

  if (daysToExam !== null) {
    reasons.push(`Exam timeline is ${daysToExam} day(s), so urgency is ${urgency}.`);
  } else {
    reasons.push("No fixed exam date detected, so your flow prioritizes consistency and fundamentals.");
  }

  if (typeof targetScore === "number") {
    reasons.push(`Target score signal is CLB ${targetScore}, shaping task intensity and review depth.`);
  }

  if (subGoal) {
    reasons.push(`Flow is contextualized for your sub-goal: ${subGoal}.`);
  }

  return reasons;
}

function buildSteps(focusSkill: FlowSkill, urgency: UrgencyLevel): MicrolearningStep[] {
  const skillLabel = SKILL_LABEL_MAP[focusSkill];
  const warmupMinutes = urgency === "high" ? 8 : 12;
  const practiceMinutes = urgency === "high" ? 22 : urgency === "medium" ? 18 : 15;
  const reviewMinutes = urgency === "high" ? 10 : 12;

  return [
    {
      id: "today-learn",
      kind: "learning",
      title: `${skillLabel} Daily Lesson`,
      description: "Review today's CLB-focused module with rubric tips, vocabulary, and drills.",
      durationMinutes: warmupMinutes,
      skill: focusSkill,
      ctaLabel: "Open Daily Learning",
    },
    {
      id: "today-practice",
      kind: "practice",
      title: `${skillLabel} Timed Practice`,
      description: "Complete one focused practice set under real exam timing.",
      durationMinutes: practiceMinutes,
      skill: focusSkill,
      ctaLabel: "Start Practice",
    },
    {
      id: "today-review",
      kind: "review",
      title: `${skillLabel} Error Review`,
      description: "Capture mistakes, corrections, and one next-attempt rule.",
      durationMinutes: reviewMinutes,
      skill: focusSkill,
      ctaLabel: "Review Results",
    },
  ];
}

export function buildMicrolearningFlow(
  input: BuildMicrolearningFlowInput
): MicrolearningFlow {
  const normalizedSubGoal = input.subGoal?.trim() || null;
  const normalizedTargetScore =
    typeof input.targetScore === "number" && Number.isFinite(input.targetScore)
      ? input.targetScore
      : null;
  const normalizedFocusSkill = toFlowSkill(input.focusSkill);
  const daysToExam = toDaysToExam(input.testDate);
  const urgency = toUrgency(daysToExam);
  const steps = buildSteps(normalizedFocusSkill, urgency);
  const firstActionType: "learning" | "practice" = "practice";

  return {
    urgency,
    daysToExam,
    focusSkill: normalizedFocusSkill,
    targetScore: normalizedTargetScore,
    subGoal: normalizedSubGoal,
    firstActionType,
    steps,
    reasoning: buildReasoning(
      urgency,
      normalizedFocusSkill,
      normalizedTargetScore,
      daysToExam,
      normalizedSubGoal
    ),
  };
}
