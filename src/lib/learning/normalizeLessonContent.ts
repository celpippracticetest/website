const RUBRIC_KEYS = [
  "contentCoherence",
  "vocabulary",
  "listenabilityReadability",
  "taskFulfillment",
] as const;

type RubricKey = (typeof RUBRIC_KEYS)[number];

export type NormalizedRubricPair = {
  clbCurrentHabits: string;
  clbTargetUpgrades: string;
};

function splitRubricString(text: string): NormalizedRubricPair {
  const trimmed = text.trim();
  const splitPatterns = [
    /\bTarget upgrades?:\s*/i,
    /\bCLB target[^:]*:\s*/i,
    /\bAt target[^:]*:\s*/i,
    /\bUpgrades?:\s*/i,
    /\n---+\n/,
    /\n\n(?=(?:•|\u2022|-|\d+[.)])\s*)/,
  ];

  for (const pattern of splitPatterns) {
    const parts = trimmed.split(pattern);
    if (parts.length >= 2 && parts[0]!.trim() && parts[1]!.trim()) {
      return {
        clbCurrentHabits: parts[0]!.trim(),
        clbTargetUpgrades: parts.slice(1).join("\n").trim(),
      };
    }
  }

  return {
    clbCurrentHabits: trimmed,
    clbTargetUpgrades:
      "Apply the target-level habits described in the core lesson and exemplar analysis.",
  };
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

export function normalizeRubricPair(value: unknown): NormalizedRubricPair {
  if (typeof value === "string") {
    return splitRubricString(value);
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const current =
      readString(record.clbCurrentHabits) ??
      readString(record.clbCurrent) ??
      readString(record.current) ??
      readString(record.currentHabits) ??
      readString(record.atYourLevel) ??
      readString(record.clb6) ??
      readString(record.currentLevel);
    const target =
      readString(record.clbTargetUpgrades) ??
      readString(record.clbTarget) ??
      readString(record.target) ??
      readString(record.targetUpgrades) ??
      readString(record.upgrades) ??
      readString(record.clb8) ??
      readString(record.targetLevel);

    if (current && target) {
      return { clbCurrentHabits: current, clbTargetUpgrades: target };
    }
    if (current) {
      return splitRubricString(current);
    }
    if (target) {
      return {
        clbCurrentHabits:
          "See the core lesson for habits typical at your current CLB level.",
        clbTargetUpgrades: target,
      };
    }
  }

  return {
    clbCurrentHabits: "Review the core lesson for current-level habits.",
    clbTargetUpgrades: "Review the core lesson for target-level upgrades.",
  };
}

function normalizeRubricComparison(raw: unknown): Record<RubricKey, NormalizedRubricPair> {
  const source =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  const result = {} as Record<RubricKey, NormalizedRubricPair>;
  for (const key of RUBRIC_KEYS) {
    result[key] = normalizeRubricPair(source[key]);
  }
  return result;
}

/** Coerce LLM / legacy lesson JSON into the shape expected by DailyLessonContentSchema. */
export function normalizeDailyLessonContent(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return raw;
  }

  const input = raw as Record<string, unknown>;
  return {
    ...input,
    rubricComparison: normalizeRubricComparison(input.rubricComparison),
  };
}
