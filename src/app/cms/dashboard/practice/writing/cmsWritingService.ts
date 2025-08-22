import AWS from "aws-sdk";
import { WritingPassage } from "./WritingPractice";
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { createReadStream } from "fs";
import axios from "axios";
import { redirect, RedirectType } from "next/navigation";

export interface WritingQuestion {
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
export const transformWritingPracticeData = (input: any) => {
  // Here we would transform the input data into the format needed by the application
  // For now, we're just returning a simplified version of the data

  // Flatten all questions from all passages
  const allQuestions: WritingQuestion[] = [];

  input.passages.forEach(async (passage: WritingPassage) => {
    passage?.questions?.forEach((q) => {
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
 * Save writing practice data (this would typically integrate with a backend)
 */
export const saveWritingPractice = async (
  data: any,
  selectedPracticeId: string | null
) => {
  // In a real application, this would make an API call to save the data
  // For now, we'll just log it and simulate a successful save

  let config = {
    method: selectedPracticeId ? "put" : "post",
    maxBodyLength: Infinity,
    url:
      "/api/practices" + (selectedPracticeId ? `/${selectedPracticeId}` : ""),
    headers: {
      "Content-Type": "application/json",
    },
    data: data,
  };

  try {
    const response = await axios.request(config);
    alert(
      `http://localhost:3000/writing?selectedPracticeId=${response.data.id}`
    );
    redirect("/cms/practice", RedirectType.push);
  } catch (error) {
    console.error("Error uploading data:", error);
  }

  return {
    success: true,
    data: transformWritingPracticeData(data),
  };
};
