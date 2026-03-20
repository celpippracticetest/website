"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TPracticeDto } from "@/models/practice.model";
import ExamHeader from "./components/ExamHeader";
import ReadingExamView from "./ReadingExamView";
import ListeningExamView from "./ListeningExamView";
import WritingExamView from "./WritingExamView";
import SpeakingExamView from "./SpeakingExamView";
import { useExamViewMode } from "./components/useExamViewMode";
import { Box, Switch, Typography } from "@mui/material";
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
}

const MockExamView = ({
  practice,
  partId,
  examId,
  partNumber,
  examName,
  examNumber,
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
      {viewMode === "official" && (
        <Box
          sx={{
            position: "fixed",
            top: { xs: 4, md: 4 },
            right: { xs: 12, md: 20 },
            zIndex: 1200,
            display: "flex",
            alignItems: "center",
            gap: 0.8,
            px: 1.25,
            py: 0.45,
            borderRadius: "999px",
            border: "1px solid rgba(184, 192, 203, 0.9)",
            backgroundColor: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(10px)",
            boxShadow: "0 10px 24px rgba(40, 55, 79, 0.14)",
          }}
        >
          <Typography
            component="span"
            sx={{
              fontSize: "0.8rem",
              fontWeight: 700,
              color: "#90A0B3",
            }}
          >
            Classic
          </Typography>
          <Switch
            size="small"
            checked
            onChange={(event) => setViewMode(event.target.checked ? "official" : "classic")}
            inputProps={{ "aria-label": "Toggle exam view mode" }}
            sx={{
              mx: 0.2,
              "& .MuiSwitch-switchBase": {
                color: "#FFFFFF",
              },
              "& .MuiSwitch-switchBase.Mui-checked": {
                color: "#FFFFFF",
              },
              "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                backgroundColor: "#316BFF",
                opacity: 1,
              },
              "& .MuiSwitch-track": {
                borderRadius: "999px",
                backgroundColor: "#C9D4E3",
                opacity: 1,
              },
              "& .MuiSwitch-thumb": {
                boxShadow: "0 2px 8px rgba(55, 70, 92, 0.16)",
              },
            }}
          />
          <Typography
            component="span"
            sx={{
              fontSize: "0.8rem",
              fontWeight: 800,
              color: "#316BFF",
            }}
          >
            CELPIP
          </Typography>
        </Box>
      )}

      {viewMode !== "official" && (
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
      )}

      <Box sx={viewMode === "official" ? { pt: { xs: 5, md: 4 } } : undefined}>
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
          />
        )}
      </Box>
    </>
  );
};

export default MockExamView;
