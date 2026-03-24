import QuestionOption from "./QuestionOption";
import { TQuestion } from "@/models/question.model";
import QuestionPlayer from "./QuestionPlayer";
import { useState } from "react";
import { Box, Button, Collapse, Paper, Stack, Typography } from "@mui/material";

const officialFontFamily =
  '"Fira Sans", "Trebuchet MS", "Helvetica Neue", Helvetica, Arial, sans-serif';

interface ListeningQuestionListProps {
  question: TQuestion;
  onAnswerSelect: (questionId: number, answerId: string) => void;
  selectedAnswers: Record<string, string>;
  questionIndex: number;
  totalQuestions: number;
  playerVariant?: "default" | "official";
}

const ListeningQuestionList = ({
  question,
  onAnswerSelect,
  selectedAnswers,
  questionIndex,
  totalQuestions,
  playerVariant = "default",
}: ListeningQuestionListProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const isOfficialMode = playerVariant === "official";

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: isOfficialMode ? "row" : { xs: "column", xl: "row" },
        width: "100%",
        minHeight: isOfficialMode ? "559px" : "100%",
      }}
    >
      <Box
        id={isOfficialMode ? "panelLeft" : undefined}
        className={isOfficialMode ? "graybg" : undefined}
        sx={{
          width: isOfficialMode ? "50%" : { xs: "100%", xl: "46%" },
          flex: isOfficialMode ? "0 0 50%" : undefined,
          minHeight: isOfficialMode ? "559px" : undefined,
          p: { xs: 3, md: 4 },
          display: "flex",
          flexDirection: "column",
          justifyContent: isOfficialMode ? "flex-start" : undefined,
          alignItems: isOfficialMode ? "flex-start" : { xs: "center", xl: "flex-start" },
          borderBottom: {
            xs:
              isOfficialMode ? "none" : "1px solid #E2EAF6",
            xl: "none",
          },
          borderRight: {
            xl: isOfficialMode ? "1px solid #D7DCE4" : "1px solid #E2EAF6",
          },
          background:
            isOfficialMode
              ? "#F1F3F6"
              : "linear-gradient(180deg, rgba(247, 249, 252, 0.72), rgba(255, 255, 255, 0.96))",
        }}
      >
        <Typography
          component="p"
          sx={{
            fontFamily: isOfficialMode ? officialFontFamily : undefined,
            fontSize:
              isOfficialMode
                ? "16px"
                : { xs: "1.15rem", md: "1.3rem" },
            lineHeight: isOfficialMode ? "20px" : undefined,
            fontWeight: isOfficialMode ? 700 : 800,
            color: isOfficialMode ? "#516D91" : "#212E42",
            textAlign:
              isOfficialMode ? "left" : { xs: "center", xl: "left" },
          }}
        >
          {isOfficialMode
            ? "Listen to the question. You will hear it only once."
            : "Listen to the question."}
        </Typography>
        {!isOfficialMode && (
          <Typography
            sx={{
              mt: 1,
              fontSize: "1rem",
              color: "#526071",
              textAlign: { xs: "center", xl: "left" },
            }}
          >
            You will hear it only once.
          </Typography>
        )}
        {question?.audioUrl && (
          <Box sx={{ mt: isOfficialMode ? 3 : 0, mb: 1, width: isOfficialMode ? "100%" : undefined }}>
            <QuestionPlayer audioUrl={question.audioUrl} variant={playerVariant} />
          </Box>
        )}

        {!isOfficialMode && (
          <>
            <Stack
              spacing={2}
              sx={{
                width: "100%",
                maxWidth: "450px",
                mt: 3,
                alignItems: { xs: "center", xl: "flex-start" },
              }}
            >
              <Button
                onClick={() => setIsOpen(!isOpen)}
                variant="outlined"
                sx={{
                  minWidth: "164px",
                  minHeight: "44px",
                  px: 2.25,
                  borderRadius: "999px",
                  textTransform: "none",
                  fontWeight: 700,
                  color: "#212E42",
                  borderColor: "#76808F",
                  backgroundColor: isOpen ? "#F2F6FF" : "#FFFFFF",
                  "&:hover": {
                    borderColor: "#5E6878",
                    backgroundColor: "#F2F6FF",
                  },
                }}
              >
                {isOpen ? "Hide Transcript" : "Show Transcript"}
              </Button>

              <Collapse in={isOpen} sx={{ width: "100%" }}>
                <Paper
                  elevation={0}
                  sx={{
                    borderRadius: "18px",
                    border: "1px solid #D5DDE8",
                    backgroundColor: "#FFFFFF",
                    p: 2,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.96rem",
                      lineHeight: 1.8,
                      color: "#243244",
                    }}
                  >
                    {question.question}
                  </Typography>
                </Paper>
              </Collapse>
            </Stack>

            <Paper
              elevation={0}
              sx={{
                mt: 4,
                width: "100%",
                maxWidth: "520px",
                px: 2,
                py: 1.5,
                borderRadius: "16px",
                backgroundColor: "#FFF7EE",
                border: "1px solid #FFE2C4",
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.95rem",
                  lineHeight: 1.7,
                  fontWeight: 600,
                  color: "#F4845F",
                }}
              >
                In the official test, you can&apos;t rewind or replay the audio,
                and there&apos;s no transcript.
              </Typography>
            </Paper>
          </>
        )}
      </Box>

      <Box
        id={isOfficialMode ? "panelRight" : undefined}
        className={isOfficialMode ? "bluebg" : undefined}
        sx={{
          flex: isOfficialMode ? "0 0 50%" : 1,
          width: isOfficialMode ? "50%" : undefined,
          minHeight: isOfficialMode ? "559px" : undefined,
          p: { xs: 3, md: 4 },
          backgroundColor: isOfficialMode ? "#EAF2FF" : undefined,
        }}
      >
        <Stack spacing={2.25} key={question.id}>
          <Typography
            sx={{
              fontFamily: isOfficialMode ? officialFontFamily : undefined,
              fontSize: isOfficialMode ? "12px" : "0.92rem",
              lineHeight: isOfficialMode ? "19px" : undefined,
              fontWeight: isOfficialMode ? 400 : 600,
              color: isOfficialMode ? "#5E7088" : "#526071",
            }}
          >
            Question {questionIndex} of {totalQuestions}
          </Typography>
          <Typography
            sx={{
              fontFamily: isOfficialMode ? officialFontFamily : undefined,
              fontSize:
                isOfficialMode
                  ? "16px"
                  : { xs: "1.05rem", md: "1.15rem" },
              lineHeight: isOfficialMode ? "20px" : undefined,
              fontWeight: isOfficialMode ? 700 : 800,
              color: isOfficialMode ? "#516D91" : "#212E42",
            }}
          >
            {isOfficialMode
              ? "Choose the best answer to each question."
              : "Choose the best answer to the question."}
          </Typography>
          <Stack
            component={isOfficialMode ? "ol" : "div"}
            spacing={isOfficialMode ? 0 : 1.25}
            sx={{
              m: 0,
              pl: isOfficialMode ? "18px" : 0,
            }}
          >
            {question.choices.map((option, index) => (
              <QuestionOption
                key={option.id}
                option={option}
                questionId={question.id}
                isSelected={selectedAnswers[questionIndex - 1] === option.id}
                showResults={false}
                isCorrect={false}
                onClick={() => onAnswerSelect(questionIndex, option.id)}
                isLastItem={index === question.choices.length - 1}
                variant={isOfficialMode ? "official" : "default"}
              />
            ))}
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
};

export default ListeningQuestionList;
