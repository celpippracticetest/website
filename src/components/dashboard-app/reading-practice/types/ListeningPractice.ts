
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
