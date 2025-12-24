import PracticeResultModal from "../practice/PracticeResultModal";
import React, { useEffect } from "react";

export default function SpeakingAnswerModal({
  isAnswerModalOpen,
  setAnswerModalOpen,
  result,
  taskContent,
}: {
  isAnswerModalOpen: boolean;
  setAnswerModalOpen: (isOpen: boolean) => void;
  result: Record<string, any> | null;
  taskContent?: string;
}) {
  return (
    <PracticeResultModal
      isOpen={isAnswerModalOpen}
      onClose={() => setAnswerModalOpen(false)}
      data={result}
      type="SPEAKING"
      taskContent={taskContent}
    />
  );
}
