import { TExamPartSchemaDto } from "@/models/examParts.model";

export interface PracticeQuestion {
  id: string;
  question: string;
  choices: {
    id: string;
    text: string;
  }[];
  type: string;
  answer: string;
  audioUrl?: string;
}

export interface PracticePassage {
  id: string;
  title: string;
  audioUrl?: string;
  setting?: string;
  conversation?: {
    name: string;
    text: string;
  }[];
  questions: PracticeQuestion[];
}

export interface Practice {
  id: string;
  title: string;
  name: string;
  description?: string;
  instructions?: string[];
  passages: PracticePassage[];
  type: "LISTENING" | "READING" | "WRITING" | "SPEAKING";
  isFree: boolean;
  duration: string;
  taskId: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  totalQuestion: number;
  totalPassages: number;
}

export interface PracticeApiResponse {
  items: Practice[];
  page: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  filters: {
    type: string | null;
    isFree: boolean | null;
  };
}

export interface ExamPartApiResponse {
  items: TExamPartSchemaDto[];
  page: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  filters: {
    examId: string | null;
    partId: string | null;
  };
}
