"use client";
import PracticeResultModal from "../practice/PracticeResultModal";
import React from "react";

const WritingAnswerModal = ({
  isAnswerModalOpen,
  setAnswerModalOpen,
  result,
}: {
  isAnswerModalOpen: boolean;
  setAnswerModalOpen: (isOpen: boolean) => void;
  result: Record<string, any> | null;
}) => {
  return (
    <PracticeResultModal
      isOpen={isAnswerModalOpen}
      onClose={() => setAnswerModalOpen(false)}
      result={result}
      type="WRITING"
    />
  );
};

export default WritingAnswerModal;
