"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TPracticeDto } from "@/models/practice.model";
import ExamHeader from "./components/ExamHeader";
import ReadingExamView from "./ReadingExamView";
import ListeningExamView from "./ListeningExamView";
import WritingExamView from "./WritingExamView";
import SpeakingExamView from "./SpeakingExamView";
import { useExamViewMode } from "./components/useExamViewMode";
import { Box } from "@mui/material";
import {
  createMockPracticeSections,
  getMockExamPartsForSection,
} from "./mockExamShared";

interface MockExamViewProps {
  practice: TPracticeDto;
  partId: number;
  examId?: string;
  partNumber?: string;
  examName?: string;
  examNumber?: number;
  firstReadyExamId?: string | null;
}

const MockExamView = ({
  practice,
  partId,
  examId,
  partNumber,
  examName,
  examNumber,
  firstReadyExamId,
}: MockExamViewProps) => {
  const [menuShowModal, setMenuShowModal] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { viewMode, setViewMode } = useExamViewMode();
  const practiceSections = useMemo(() => createMockPracticeSections(), []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setMenuShowModal(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <>
      <ExamHeader
        examPractice={practice.type.charAt(0) + practice.type.slice(1).toLowerCase()}
        ref={ref}
        setShowModal={setMenuShowModal}
        menuShowModal={menuShowModal}
        examId={examId ?? practice.taskId}
        partId={partId}
        examName={examName ?? practice.name}
        examNumber={examNumber}
        practiceSections={practiceSections}
        getPartsForSection={getMockExamPartsForSection}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />

      <Box>
        {practice.type === "LISTENING" && (
          <ListeningExamView
            practice={practice}
            partId={partId}
            examId={examId ?? practice.taskId}
            partNumber={partNumber ?? partId.toString()}
            examName={examName ?? practice.name}
            examNumber={examNumber}
            hideHeader
            viewMode={viewMode}
            setViewMode={setViewMode}
            practiceSections={practiceSections}
            getPartsForSection={getMockExamPartsForSection}
            firstReadyExamId={firstReadyExamId}
          />
        )}

        {practice.type === "READING" && (
          <ReadingExamView
            practice={practice}
            partId={partId}
            examId={examId ?? practice.taskId}
            partNumber={partNumber}
            examName={examName ?? practice.name}
            examNumber={examNumber}
            hideHeader
            viewMode={viewMode}
            setViewMode={setViewMode}
            practiceSections={practiceSections}
            getPartsForSection={getMockExamPartsForSection}
            firstReadyExamId={firstReadyExamId}
          />
        )}

        {practice.type === "WRITING" && (
          <WritingExamView
            practice={practice}
            partId={partId}
            examId={examId ?? practice.taskId}
            partNumber={partNumber}
            examName={examName ?? practice.name}
            examNumber={examNumber}
            hideHeader
            viewMode={viewMode}
            setViewMode={setViewMode}
            practiceSections={practiceSections}
            getPartsForSection={getMockExamPartsForSection}
            firstReadyExamId={firstReadyExamId}
          />
        )}

        {practice.type === "SPEAKING" && (
          <SpeakingExamView
            practice={practice}
            partId={partId}
            examId={examId ?? practice.taskId}
            partNumber={partNumber}
            examName={examName ?? practice.name}
            examNumber={examNumber}
            hideHeader
            viewMode={viewMode}
            setViewMode={setViewMode}
            practiceSections={practiceSections}
            getPartsForSection={getMockExamPartsForSection}
            firstReadyExamId={firstReadyExamId}
          />
        )}
      </Box>
    </>
  );
};

export default MockExamView;
