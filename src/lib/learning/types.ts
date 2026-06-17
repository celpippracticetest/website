import { z } from "zod";
import { normalizeDailyLessonContent } from "@/lib/learning/normalizeLessonContent";

export const LEARNING_SKILLS = [
  "LISTENING",
  "READING",
  "WRITING",
  "SPEAKING",
] as const;

export type LearningSkill = (typeof LEARNING_SKILLS)[number];

export const ClbScoresSchema = z.object({
  listening: z.number().int().min(4).max(12),
  reading: z.number().int().min(4).max(12),
  writing: z.number().int().min(4).max(12),
  speaking: z.number().int().min(4).max(12),
});

export type ClbScores = z.infer<typeof ClbScoresSchema>;

export const RubricPairSchema = z.object({
  clbCurrentHabits: z.string().min(1),
  clbTargetUpgrades: z.string().min(1),
});

export const VocabularyBankItemSchema = z.object({
  term: z.string().min(1),
  definition: z.string().min(1),
  usage: z.string().min(1),
});

export const ExemplarAnalysisSchema = z.object({
  clbCurrentExample: z.string().min(1),
  clbTargetExample: z.string().min(1),
  linguisticUpgrades: z.string().min(1),
});

export const ActionableDrillSchema = z.object({
  drillTitle: z.string().min(1),
  instructions: z.string().min(1),
  selfAssessmentChecklist: z.string().min(1),
});

export const DailyLessonContentSchema = z.preprocess(
  normalizeDailyLessonContent,
  z.object({
    title: z.string().min(1).max(120),
    focusArea: z.string().min(1),
    linguisticKey: z.string().min(1),
    rubricComparison: z.object({
      contentCoherence: RubricPairSchema,
      vocabulary: RubricPairSchema,
      listenabilityReadability: RubricPairSchema,
      taskFulfillment: RubricPairSchema,
    }),
    vocabularyBank: z.array(VocabularyBankItemSchema).min(1).max(8),
    coreLesson: z.string().min(100),
    mentalTemplate: z.string().min(1),
    exemplarAnalysis: ExemplarAnalysisSchema,
    actionableDrills: z.array(ActionableDrillSchema).min(1).max(3),
  })
);

export type DailyLessonContent = z.infer<typeof DailyLessonContentSchema>;

export type AssignmentStatus = "active" | "completed";

export type SkillLessonState =
  | "active"
  | "completed_today"
  | "subscription_required"
  | "skipped"
  | "loading"
  | "error";

export function isSkillPracticeSkipped(
  current: number,
  target: number
): boolean {
  return target === current;
}

export type UserLearningProfile = {
  userId: string;
  currentClb: ClbScores;
  targetClb: ClbScores;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
};

export type LearningContentPoolRow = {
  id: string;
  skill: LearningSkill;
  currentClb: number;
  targetClb: number;
  sequenceNumber: number;
  content: DailyLessonContent;
  model: string | null;
  createdAt: Date;
};

export type UserLearningAssignment = {
  id: string;
  userId: string;
  skill: LearningSkill;
  contentPoolId: string;
  sequenceNumber: number;
  lessonDate: string;
  status: AssignmentStatus;
  completedAt: Date | null;
  createdAt: Date;
};

export type SkillLessonPayload = {
  skill: LearningSkill;
  state: SkillLessonState;
  assignmentId?: string;
  sequenceNumber?: number;
  lessonDate?: string;
  content?: DailyLessonContent;
  error?: string;
};

export function skillToKey(skill: LearningSkill): keyof ClbScores {
  return skill.toLowerCase() as keyof ClbScores;
}

export function skillLabel(skill: LearningSkill): string {
  return skill.charAt(0) + skill.slice(1).toLowerCase();
}
