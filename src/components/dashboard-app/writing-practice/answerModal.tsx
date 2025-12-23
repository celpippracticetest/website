"use client";
import PracticeResultModal from "../practice/PracticeResultModal";
import React from "react";

const WritingAnswerModal = ({
  isAnswerModalOpen,
  setAnswerModalOpen,
  result,
  taskContent,
}: {
  isAnswerModalOpen: boolean;
  setAnswerModalOpen: (isOpen: boolean) => void;
  result: Record<string, any> | null;
  taskContent?: string;
}) => {
  return (
    <PracticeResultModal
      isOpen={isAnswerModalOpen}
      onClose={() => setAnswerModalOpen(false)}
      result={result}
      type="WRITING"
      taskContent={taskContent}
    />
  );
};

export default WritingAnswerModal;
