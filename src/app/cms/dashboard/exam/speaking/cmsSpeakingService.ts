import { SpeakingPassage } from "./SpeakingPractice";
import axios from "axios";

export interface SpeakingQuestion {
  id: string;
  question: string;
  options: {
    id: string;
    text: string;
  }[];
  answer: string;
}
/**
 * Transforms CMS input format to the application's internal format
 */
export const transformSpeakingPracticeData = (input: any) => {
  // Here we would transform the input data into the format needed by the application
  // For now, we're just returning a simplified version of the data

  // Flatten all questions from all passages
  const allQuestions: SpeakingQuestion[] = [];

  input.passages.forEach(async (passage: SpeakingPassage) => {
    passage.questions.forEach((q) => {
      allQuestions.push({
        id: q.id,
        question: q.question,
        options: q.choices.map((choice) => ({
          id: choice.id,
          text: choice.text,
        })),
        answer: q.answer,
      });
    });
  });

  return {
    id: input.taskId,
    title: input.title,
    description: input.description,
    audioUrl: input.passages[0]?.audioUrl || "",
    duration: input.duration,
    questions: allQuestions,
    isFree: input.isFree,
    difficulty: input.difficulty,
    // Additional metadata could be stored here
    meta: {
      passages: input.passages.map((p) => ({
        id: p.id,
        title: p.title,
        setting: p.setting,
      })),
    },
  };
};

/**
 * Save speaking practice data (this would typically integrate with a backend)
 */
export const saveSpeakingPractice = async (
  data: any,
  selectedExamId: string | null
) => {
  // In a real application, this would make an API call to save the data
  // For now, we'll just log it and simulate a successful save

  const config = {
    method: selectedExamId ? "put" : "post",
    maxBodyLength: Infinity,
    url: "/api/examParts" + (selectedExamId ? `/${selectedExamId}` : ""),
    headers: {
      "Content-Type": "application/json",
    },
    data: data,
  };

  try {
    await axios.request(config);
    alert(`OK`);
  } catch (error) {
    console.error("Error uploading data:", error);
  }

  return {
    success: true,
    data: transformSpeakingPracticeData(data),
  };
};
