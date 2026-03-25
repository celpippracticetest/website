import QuestionOption from "./QuestionOption";
import { TQuestion } from "@/models/question.model";
import KeyboardArrowDown from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUp from "@mui/icons-material/KeyboardArrowUp";
import SvgCheckCircle from "@/components/icons/CheckCircle";
import SvgCircle from "@/components/icons/Circle";
import { Box, Button, Menu, MenuItem, Typography } from "@mui/material";
import { useState } from "react";

interface ReadingQuestionListProps {
  question: TQuestion;
  onAnswerSelect: (questionId: number, answerId: string) => void;
  selectedAnswers: Record<string, string>;
  questionIndex: number;
  totalQuestions: number;
  variant?: "default" | "official";
}

const officialFontFamily =
  '"Fira Sans", "Trebuchet MS", "Helvetica Neue", Helvetica, Arial, sans-serif';

const ReadingQuestionList = ({
  question,
  onAnswerSelect,
  selectedAnswers,
  questionIndex,
  totalQuestions,
  variant = "default",
}: ReadingQuestionListProps) => {
  const isOfficialMode = variant === "official";
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const isOpen = Boolean(anchorEl);
  const selectedAnswerId = selectedAnswers[questionIndex];
  const selectedAnswerLabel = selectedAnswerId
    ? question.choices.find((option) => option.id === selectedAnswerId)?.text
    : "";

  if (isOfficialMode) {
    return (
      <Box
        sx={{
          py: 0.9,
        }}
      >
        <Box
          component="div"
          sx={{
            fontFamily: officialFontFamily,
            fontSize: "17px",
            lineHeight: "27px",
            fontWeight: 400,
            color: "#4A5565",
          }}
        >
          <Box component="span" sx={{ mr: 0.75 }}>
            {questionIndex + 1}.
          </Box>
          <Box component="span">{question.question}</Box>
          <Box
            component="span"
            sx={{
              display: "inline-flex",
              verticalAlign: "middle",
              ml: 1,
            }}
          >
            <Button
              variant="outlined"
              onClick={(event) => setAnchorEl(isOpen ? null : event.currentTarget)}
              endIcon={isOpen ? <KeyboardArrowUp sx={{ fontSize: 16 }} /> : <KeyboardArrowDown sx={{ fontSize: 16 }} />}
              sx={{
                justifyContent: "space-between",
                minWidth: selectedAnswerLabel ? "320px" : "88px",
                maxWidth: "260px",
                minHeight: "24px",
                px: selectedAnswerLabel ? 1 : 0.5,
                py: 0,
                borderRadius: 0,
                borderColor: "#DADDE3",
                backgroundColor: "#FFFFFF",
                textTransform: "none",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)",
                "& .MuiButton-endIcon": {
                  ml: selectedAnswerLabel ? 0.5 : 0,
                  mr: 0,
                },
                "&:hover": {
                  borderColor: "#C5CBD5",
                  backgroundColor: "#FDFDFD",
                },
              }}
            >
              <Box
                component="span"
                sx={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  textAlign: "left",
                  fontFamily: officialFontFamily,
                  fontSize: "15px",
                  lineHeight: "18px",
                  color: selectedAnswerLabel ? "#3F4A59" : "#7D8796",
                }}
              >
                {selectedAnswerLabel || ""}
              </Box>
            </Button>
          </Box>

          <Menu
            anchorEl={anchorEl}
            open={isOpen}
            onClose={() => setAnchorEl(null)}
            transformOrigin={{ horizontal: "left", vertical: "top" }}
            anchorOrigin={{ horizontal: "left", vertical: "bottom" }}
            PaperProps={{
              sx: {
                mt: 0.25,
                width: { xs: "calc(100vw - 64px)", md: "407px" },
                maxWidth: "407px",
                borderRadius: "8px",
                border: "1px solid #DADDE3",
                boxShadow: "0 6px 18px rgba(55, 70, 92, 0.12)",
                p: 0,
                overflow: "hidden",
              },
            }}
          >
            {question.choices.map((option) => {
              const isSelected = selectedAnswerId === option.id;

              return (
                <MenuItem
                  key={option.id}
                  onClick={() => {
                    onAnswerSelect(questionIndex, option.id);
                    setAnchorEl(null);
                  }}
                  selected={isSelected}
                  sx={{
                    minHeight: "26px",
                    pl: "25px",
                    pr: "8px",
                    pt: "2px",
                    pb: "2px",
                    borderRadius: 0,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 0.75,
                    borderBottom:
                      option.id === question.choices[question.choices.length - 1]?.id
                        ? "none"
                        : "1px dotted #CCC",
                    whiteSpace: "normal",
                    lineHeight: "17px",
                    fontFamily: officialFontFamily,
                    fontSize: "13px",
                    color: "#3F4A59",
                    backgroundColor: isSelected ? "#E8F0FF" : "#FFFFFF",
                    "&:hover": {
                      backgroundColor: "#E7F8F3",
                    },
                    "&.Mui-selected": {
                      backgroundColor: "#E8F0FF",
                    },
                    "&.Mui-selected:hover": {
                      backgroundColor: "#DDF5EE",
                    },
                  }}
                >
                  <Box
                    component="span"
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      pt: "1px",
                      color: isSelected ? "#316BFF" : "#7F8896",
                    }}
                  >
                    {isSelected ? (
                      <SvgCheckCircle className="shrink-0" />
                    ) : (
                      <SvgCircle className="shrink-0" />
                    )}
                  </Box>
                  <Box component="span" sx={{ flex: 1 }}>
                    {option.text}
                  </Box>
                </MenuItem>
              );
            })}
          </Menu>
        </Box>
      </Box>
    );
  }

  return (
    <div key={question.id} className="bg-white p-4 rounded-lg  ">
      <p className="text-[14px] text-[#212e42]  font-semibold mb-3">
        {question.id}.{question.question}
      </p>
      <div className="flex flex-col gap-1">
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
