export type McqSkill = "Reading" | "Listening";
export type ProductionSkill = "Writing" | "Speaking";

export interface McqScoreBand {
  label: string;
  clbHint: string;
  summary: string;
  tips: string[];
}

export interface ProductionSkillTip {
  skill: string;
  score: number;
  tip: string;
}

const MCQ_BANDS: McqScoreBand[] = [
  {
    label: "Strong performance",
    clbHint: "CLB 9–12 range",
    summary:
      "You answered most questions correctly. Focus on speed and consistency under timed conditions.",
    tips: [
      "Review any missed items to catch recurring trap patterns.",
      "Practice full timed sets to build exam stamina.",
      "Note unfamiliar vocabulary and add it to your study list.",
    ],
  },
  {
    label: "Good foundation",
    clbHint: "CLB 7–8 range",
    summary:
      "Solid result with room to tighten accuracy on detail and inference questions.",
    tips: [
      "Re-read explanations for every wrong answer before moving on.",
      "Underline keywords in the question stem before scanning the passage or audio notes.",
      "Watch for distractors that use words from the text but change the meaning.",
    ],
  },
  {
    label: "Developing skills",
    clbHint: "CLB 5–6 range",
    summary:
      "You are building core skills. Target question-type strategy and vocabulary in context.",
    tips: [
      "Practice one question type at a time (inference, detail, vocabulary-in-context).",
      "For Listening: preview questions before the audio and jot numbers, dates, and names.",
      "For Reading: skim the passage first, then scan for answer evidence.",
    ],
  },
  {
    label: "Needs focused practice",
    clbHint: "Below CLB 5",
    summary:
      "Use this attempt to identify patterns—unanswered items often cost easy points.",
    tips: [
      "Answer every question, even when unsure—eliminate clearly wrong options first.",
      "Slow down on the first pass; accuracy beats speed at this stage.",
      "Redo this practice after reviewing explanations, then compare your score.",
    ],
  },
];

export function getMcqScoreBand(correct: number, total: number): McqScoreBand {
  const pct = total > 0 ? correct / total : 0;
  if (pct >= 0.85) return MCQ_BANDS[0];
  if (pct >= 0.65) return MCQ_BANDS[1];
  if (pct >= 0.45) return MCQ_BANDS[2];
  return MCQ_BANDS[3];
}

export function getMcqSkillTips(skill: McqSkill): string[] {
  if (skill === "Listening") {
    return [
      "Preview upcoming questions during instruction time.",
      "Write numbers, dates, and names while listening—don't rely on memory.",
      "If you miss a detail, keep listening; later context often clarifies the answer.",
    ];
  }
  return [
    "Read the question stem first, then scan the passage for proof.",
    "Paraphrase the correct option in your own words to confirm it matches the text.",
    "For opinion or inference items, eliminate options that are too extreme or off-topic.",
  ];
}

export function getMockExamMcqTips(skill: McqSkill): string[] {
  if (skill === "Listening") {
    return [
      "In a full mock you cannot replay audio—commit your answer and stay with the recording.",
      "Use pauses between parts to reset focus; Listening is often the longest section.",
      "Wrong answers here often come from similar-sounding options—watch for negation and qualifiers.",
    ];
  }
  return [
    "Pace yourself across all reading parts; answer easier items first, then revisit harder ones.",
    "Evidence for the correct option must be explicit in the passage—avoid outside knowledge.",
    "In a mock exam, accuracy under time pressure matters more than re-reading every line.",
  ];
}

export function getMockExamProductionTips(skill: ProductionSkill): string[] {
  if (skill === "Writing") {
    return [
      "Mock writing is strictly timed—sketch a quick outline in the first 2–3 minutes.",
      "Hit every bullet in the prompt; missing one requirement limits Task Fulfillment.",
      "Reserve the last 2 minutes for proofreading grammar, articles, and word count.",
    ];
  }
  return [
    "Speaking tasks come one after another—keep answers focused and avoid rushing the opener.",
    "Use preparation time to choose two clear points; a simple structure beats a long ramble.",
    "Fluency and clarity matter as much as vocabulary in timed mock conditions.",
  ];
}

export function getWeakestProductionSkills(scores: {
  coherence: number;
  vocabulary: number;
  readability: number;
  fulfillment: number;
}): ProductionSkillTip[] {
  const entries: ProductionSkillTip[] = [
    { skill: "Coherence", score: scores.coherence, tip: "" },
    { skill: "Vocabulary", score: scores.vocabulary, tip: "" },
    { skill: "Readability", score: scores.readability, tip: "" },
    { skill: "Task Fulfillment", score: scores.fulfillment, tip: "" },
  ];

  const tipsBySkill: Record<string, string> = {
    Coherence:
      "Use clear paragraph breaks and linking words (First, Additionally, Therefore) so your ideas flow logically.",
    Vocabulary:
      "Swap repeated words for precise synonyms and add 1–2 topic-specific terms per paragraph.",
    Readability:
      "Vary sentence length and proofread for subject–verb agreement, articles, and punctuation.",
    "Task Fulfillment":
      "Address every bullet in the prompt; include a greeting, all requested details, and a clear closing.",
  };

  return entries
    .map((e) => ({ ...e, tip: tipsBySkill[e.skill] ?? "" }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 2);
}

export function getProductionScoreHeadline(
  overall: number
): { title: string; description: string } {
  if (overall >= 10) {
    return {
      title: "Near test-ready",
      description:
        "Your response shows strong control. Polish timing, tone, and minor language slips to reach the next band.",
    };
  }
  if (overall >= 8) {
    return {
      title: "Competitive response",
      description:
        "Good structure and language with a few gaps. Target your two lowest rubric scores for the fastest gain.",
    };
  }
  if (overall >= 6) {
    return {
      title: "Building toward target",
      description:
        "Core ideas are present but organization or accuracy holds the score back. Use the better version as a model.",
    };
  }
  return {
    title: "Foundation stage",
    description:
      "Focus on fully answering the prompt with a simple, clear structure before adding advanced vocabulary.",
  };
}
