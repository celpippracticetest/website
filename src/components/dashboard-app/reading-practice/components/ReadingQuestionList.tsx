import QuestionOption from "./QuestionOption";
import { TQuestion } from "@/models/question.model";
import { useState } from "react";

interface ReadingQuestionListProps {
  question: TQuestion;
  onAnswerSelect: (questionId: number, answerId: string) => void;
  selectedAnswers: Record<string, string>;
  questionIndex: number;
  totalQuestions: number;
}

const ReadingQuestionList = ({
  question,
  onAnswerSelect,
  selectedAnswers,
  questionIndex,
  totalQuestions,
}: ReadingQuestionListProps) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div key={question.id} className="bg-white p-4 rounded-lg  ">
      <p className="text-[14px] text-[#212e42]  font-semibold mb-3">
        {question.id}.{question.question}
      </p>
      <div className="flex flex-col gap-1" role="radiogroup" aria-label={`Question ${question.id}`}>
        {question.choices.map((option) => (
          <QuestionOption
            key={option.id}
            option={option}
            questionId={question.id}
            isSelected={selectedAnswers[questionIndex] === option.id}
            showResults={false}
            isCorrect={false}
            onClick={() => onAnswerSelect(questionIndex, option.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default ReadingQuestionList;
