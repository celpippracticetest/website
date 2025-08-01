
export interface SampleResponse {
  id: string;
  title: string;
  subject?: string;
  body: string;
}

export interface SpeakingPracticeItem {
  id: string;
  title: string;
  description?: string;
  pictureUrl?: string;
  duration: string;
  sampleResponse: SampleResponse[];
  isFree: boolean;
  difficulty: "beginner" | "intermediate" | "advanced";
}

export interface SpeakingCategory {
  id: string;
  title: string;
  description?: string;
  icon: string;
  practices: SpeakingPracticeItem[];
}

// CMS Input types
// export interface SpeakingChoice {
//   id: string;
//   text: string;
// }

export interface SpeakingSampleResponse {
  id: string;
  title: string,
  body: string, 
  subject?: string
}

export interface ConversationTurn {
  name: string;
  text: string;
}

export interface SpeakingPassage {
  id: string;
  pictureUrl?: File;
  title: string;
  body?: string;
  sampleResponse: SpeakingSampleResponse[];
}

export interface SpeakingPracticeInput {
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
  passages: SpeakingPassage[];
}
