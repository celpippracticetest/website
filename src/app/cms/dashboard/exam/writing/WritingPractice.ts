
export interface SampleResponse {
  id: string;
  title: string;
  subject: string;
  body: string;
}

export interface WritingPracticeItem {
  id: string;
  title: string;
  description?: string;
  pictureUrl?: string;
  duration: string;
  sampleResponse: SampleResponse[];
  isFree: boolean;
  difficulty: "beginner" | "intermediate" | "advanced";
}

export interface WritingCategory {
  id: string;
  title: string;
  description?: string;
  icon: string;
  practices: WritingPracticeItem[];
}

// CMS Input types
// export interface WritingChoice {
//   id: string;
//   text: string;
// }

export interface WritingSampleResponse {
  id: string;
  title: string,
  body: string, 
  subject: string
}

export interface ConversationTurn {
  name: string;
  text: string;
}

export interface WritingPassage {
  id: string;
  pictureUrl?: File;
  title: string;
  body: string;
  sampleResponse: WritingSampleResponse[];
}

export interface WritingPracticeInput {
  name: string;
  title: string;
  description?: string;
  instructions: string[];
  type: string;
  isFree: boolean;
  difficulty: "beginner" | "intermediate" | "advanced";
  totalQuestion: number;
  totalPassages: number;
  taskId: string;
  passages: WritingPassage[];
}
