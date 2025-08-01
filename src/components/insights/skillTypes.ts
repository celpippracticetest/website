
export type QuestionResult = {
  type: string;
  score: string;
};

export type FeedbackItem = {
  label: string;
  score: number;
  description: string;
};

export type SkillData = {
  title: string;
  description: string;
  questionResults: QuestionResult[];
  feedback: FeedbackItem[];
  focusAreas: string[];
};

export type SkillDataMap = {
  [key: string]: SkillData;
};
