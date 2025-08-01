
import { useState } from "react";
import { ListeningQuestion } from "../types/ListeningPractice";
import { TQuestion } from "@/models/question.model";

export const useListeningPracticeQuestions = (questions: TQuestion[]) => {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  
  const handleAnswerSelect = (questionId: string, answerId: string) => {
    if (showResults) return; // Can't change answers after submitting
    
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: answerId
    }));
  };
  
  const handleSubmit = () => {
    // Calculate score
    let correctAnswers = 0;
    
    // questions.forEach(question => {
      // if (selectedAnswers[question.id] === question.answer) {
        // correctAnswers++;
      // }
    // }
  // );
    
    const calculatedScore = Math.round((correctAnswers / questions.length) * 100);
    setScore(calculatedScore);
    setShowResults(true);
    
    return { correctAnswers, score: calculatedScore };
  };
  
  const isQuestionAnswered = (questionId: string) => {
    return !!selectedAnswers[questionId];
  };
  
  const allQuestionsAnswered = questions.every(q => isQuestionAnswered(q.id));
  
  const getCorrectAnswersCount = () => {
    let correctAnswers = 0;
    
    questions.forEach(question => {
      if (selectedAnswers[question.id] === question.answer) {
        correctAnswers++;
      }
    });
    
    return correctAnswers;
  };
  
  return {
    selectedAnswers,
    showResults,
    score,
    handleAnswerSelect,
    handleSubmit,
    isQuestionAnswered,
    allQuestionsAnswered,
    getCorrectAnswersCount
  };
};
