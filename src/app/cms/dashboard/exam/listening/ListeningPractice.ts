
export interface ListeningQuestion {
  id: string;
  question: string;
  options: {
    id: string;
    text: string;
  }[];
  answer: string;
}

export interface ListeningPracticeItem {
  id: string;
  title: string;
  description: string;
  audioUrl: string;
  duration: string;
  questions: ListeningQuestion[];
  isFree: boolean;
  difficulty: "beginner" | "intermediate" | "advanced";
}

export interface ListeningCategory {
  id: string;
  title: string;
  description: string;
  icon: string;
  practices: ListeningPracticeItem[];
}

// CMS Input types
export interface ListeningChoice {
  id: string;
  text: string;
}

export interface ListeningPassageQuestion {
  id: string;
  question: string;
  audioUrl?: string;
  choices: ListeningChoice[];
  type: string;
  answer: string;
}

export interface ConversationTurn {
  name: string;
  text: string;
}

export interface ListeningPassage {
  id: string;
  audioUrl: File;
  title: string;
  setting: string;
  conversation: ConversationTurn[];
  questions: ListeningPassageQuestion[];
}

export interface ListeningPracticeInput {
  name: string;
  title: string;
  description: string;
  instructions: string[];
  type: string;
  isFree: boolean;
  duration: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  totalQuestion: number;
  totalPassages: number;
  taskId: string;
  passages: ListeningPassage[];
}
