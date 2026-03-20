import { Box, CircularProgress, Stack, Typography } from "@mui/material";
import type { TPracticeDto } from "@/models/practice.model";
import type { ReactNode } from "react";
import AudioPlayer from "@/components/dashboard-app/listening-practice/components/AudioPlayer";
import ListeningDropDownQuestionList from "@/components/dashboard-app/listening-practice/components/ListeningDropDownQuestionList";
import ListeningQuestionList from "@/components/dashboard-app/listening-practice/components/ListeningQuestionList";
import OfficialExamFrame from "../OfficialExamFrame";
import OfficialInstructionBlock from "../OfficialInstructionBlock";
import {
  officialFontFamily,
  type OfficialViewFrameProps,
} from "./shared";

type ListeningOfficialPage =
  | "description"
  | "instructions"
  | "transition"
  | "problem"
  | "question"
  | "answer";

interface ListeningOfficialViewProps extends OfficialViewFrameProps {
  page: ListeningOfficialPage;
  practice: TPracticeDto;
  currentPassage: TPracticeDto["passages"][number] | undefined;
  questionIndex: number;
  questionIndexInPractice: number;
  isMultiQuestionPart: boolean;
  selectedAnswers: Record<number, string>;
  descriptionItems: ReactNode[];
  transitionSectionLabel: string;
  transitionCountdown: number;
  onAnswerSelect: (questionId: number, answerId: string) => void;
}

const ListeningOfficialView = ({
  title,
  primaryActionLabel,
  onPrimaryAction,
  primaryActionDisabled = false,
  onBack,
  backDisabled = false,
  statusSlot,
  page,
  practice,
  currentPassage,
  questionIndex,
  questionIndexInPractice,
  isMultiQuestionPart,
  selectedAnswers,
  descriptionItems,
  transitionSectionLabel,
  transitionCountdown,
  onAnswerSelect,
}: ListeningOfficialViewProps) => {
  const content =
    page === "answer" ? (
      <Box
        sx={{
          minHeight: { xs: 420, md: 520 },
          px: 3,
          py: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#FFFFFF",
        }}
      >
        <Stack spacing={2} alignItems="center">
          <CircularProgress sx={{ color: "#316BFF" }} />
          <Typography sx={{ fontSize: "0.95rem", fontWeight: 600, color: "#37465C" }}>
            Uploading answers...
          </Typography>
        </Stack>
      </Box>
    ) : page === "description" ? (
      <OfficialInstructionBlock
        title="Listening Test Overview"
        items={descriptionItems}
      />
    ) : page === "instructions" ? (
      <OfficialInstructionBlock
        title="Listening Test Instructions"
        items={practice.instructions?.length ? practice.instructions : descriptionItems}
      />
    ) : page === "transition" ? (
      <Box
        sx={{
          minHeight: { xs: 420, md: 560 },
          px: { xs: 3, md: 4 },
          py: { xs: 6, md: 8 },
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#FFFFFF",
        }}
      >
        <Stack spacing={3} alignItems="center" textAlign="center">
          <Typography
            component="p"
            sx={{
              maxWidth: "720px",
              fontFamily: officialFontFamily,
              fontSize: "18px",
              lineHeight: "28px",
              fontWeight: 700,
              color: "#516D91",
            }}
          >
            You will hear the {transitionSectionLabel} of the conversation shortly.
          </Typography>
          <Stack spacing={1} alignItems="center">
            <Typography
              sx={{
                fontFamily: officialFontFamily,
                fontSize: "14px",
                lineHeight: "18px",
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "#7A8798",
              }}
            >
              Preparation Time
            </Typography>
            <Box
              sx={{
                minWidth: "104px",
                px: 2.5,
                py: 1.5,
                borderRadius: "8px",
                border: "1px solid #D9E0E8",
                backgroundColor: "#F7F9FC",
              }}
            >
              <Typography
                sx={{
                  fontFamily: officialFontFamily,
                  fontSize: "28px",
                  lineHeight: "32px",
                  fontWeight: 700,
                  color: "#316BFF",
                }}
              >
                {transitionCountdown}
              </Typography>
              <Typography
                sx={{
                  mt: 0.5,
                  fontFamily: officialFontFamily,
                  fontSize: "12px",
                  lineHeight: "16px",
                  color: "#6A7687",
                }}
              >
                sec
              </Typography>
            </Box>
          </Stack>
        </Stack>
      </Box>
    ) : page === "problem" ? (
      <Box sx={{ px: { xs: 2.5, md: 4 }, py: { xs: 3, md: 4 } }}>
        <Stack spacing={3}>
          <Typography
            component="p"
            sx={{
              fontFamily: officialFontFamily,
              fontSize: "19px",
              lineHeight: "28px",
              fontWeight: 700,
              color: "#516D91",
            }}
          >
            Listen to the conversation. You will hear the conversation only once.
            It is about 1 to 1.5 minutes long.
          </Typography>

          <Box
            sx={{
              width: "100%",
              maxWidth: "760px",
              mx: "auto",
              border: "1px solid #DEE3EB",
              borderRadius: "8px",
              p: { xs: 2, md: 3 },
              backgroundColor: "#FAFBFD",
            }}
          >
            <AudioPlayer audioUrl={currentPassage?.audioUrl} variant="official" />
          </Box>
        </Stack>
      </Box>
    ) : (
      <Box sx={{ minHeight: { xs: 420, md: 560 } }}>
        {isMultiQuestionPart ? (
          <Box sx={{ px: { xs: 2.5, md: 3 }, py: { xs: 2, md: 2.5 } }}>
            <Typography
              component="p"
              sx={{
                mb: 2.25,
                fontFamily: officialFontFamily,
                fontSize: "17px",
                lineHeight: "22px",
                fontWeight: 700,
                color: "#4B6484",
              }}
            >
              Choose the best answer to each question from the drop-down menu
              (<Box component="span" sx={{ fontWeight: 400 }}>▼</Box>).
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              {currentPassage?.questions?.map((question, index) => (
                <ListeningDropDownQuestionList
                  key={index}
                  questionIndex={index + 1}
                  totalQuestions={practice.totalQuestion || 0}
                  question={question as any}
                  onAnswerSelect={onAnswerSelect}
                  selectedAnswers={selectedAnswers}
                  variant="official"
                />
              ))}
            </Box>
          </Box>
        ) : (
          <ListeningQuestionList
            questionIndex={questionIndexInPractice}
            totalQuestions={practice.totalQuestion || 0}
            question={currentPassage?.questions?.[questionIndex] as any}
            onAnswerSelect={onAnswerSelect}
            selectedAnswers={selectedAnswers}
            playerVariant="official"
          />
        )}
      </Box>
    );

  return (
    <OfficialExamFrame
      title={title}
      primaryActionLabel={primaryActionLabel}
      onPrimaryAction={onPrimaryAction}
      primaryActionDisabled={primaryActionDisabled}
      onBack={onBack}
      backDisabled={backDisabled}
      statusSlot={statusSlot}
    >
      {content}
    </OfficialExamFrame>
  );
};

export default ListeningOfficialView;
