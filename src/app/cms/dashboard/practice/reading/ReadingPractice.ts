
export interface ReadingQuestion {
  id: string;
  question: string;
  options: {
    id: string;
    text: string;
  }[];
  answer: string;
}

export interface ReadingPracticeItem {
  id: string;
  title: string;
  description: string;
  pictureUrl?: string;
  duration: string;
  questions: ReadingQuestion[];
  isFree: boolean;
  difficulty: "beginner" | "intermediate" | "advanced";
}

export interface ReadingCategory {
  id: string;
  title: string;
  description: string;
  icon: string;
  practices: ReadingPracticeItem[];
}

// CMS Input types
export interface ReadingChoice {
  id: string;
  text: string;
}

export interface ReadingPassageQuestion {
  id: string;
  question: string;
  choices: ReadingChoice[];
  type: string;
  answer: string;
}

export interface ConversationTurn {
  name: string;
  text: string;
}

export interface ReadingPassage {
  id: string;
  pictureUrl?: File;
  title: string;
  body?: string;
  questions: ReadingPassageQuestion[];
}

export interface ReadingPracticeInput {
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
  passages: ReadingPassage[];
}
