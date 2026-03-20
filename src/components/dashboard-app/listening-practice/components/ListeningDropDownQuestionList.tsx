import { TQuestion } from "@/models/question.model";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Box, Button, Menu, MenuItem, Paper, Typography } from "@mui/material";
import SvgCircle from "@/components/icons/Circle";
import SvgCheckCircle from "@/components/icons/CheckCircle";

interface ListeningDropDownQuestionListProps {
  question: TQuestion;
  onAnswerSelect: (questionId: number, answerId: string) => void;
  selectedAnswers: Record<string, string>;
  questionIndex: number;
  totalQuestions: number;
  variant?: "default" | "official";
}

const ListeningDropDownQuestionList = ({
  question,
  onAnswerSelect,
  selectedAnswers,
  questionIndex,
  totalQuestions,
  variant = "default",
}: ListeningDropDownQuestionListProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const isOpen = Boolean(anchorEl);
  const isOfficialMode = variant === "official";
  const selectedAnswerId = selectedAnswers[questionIndex - 1];
  const selectedAnswerLabel = selectedAnswerId
    ? question.choices.find((option) => option.id === selectedAnswerId)?.text
    : "";

  if (isOfficialMode) {
    return (
      <Box
        sx={{
          px: { xs: 2.5, md: 3 },
          py: 0.9,
        }}
      >
        <Box
          component="div"
          sx={{
            m: 0,
            fontFamily:
              '"Trebuchet MS", "Fira Sans", "Helvetica Neue", Helvetica, Arial, sans-serif',
            fontSize: "17px",
            lineHeight: "27px",
            fontWeight: 400,
            color: "#4A5565",
          }}
        >
          <Box
            component="span"
            sx={{
              mr: 0.75,
              fontFamily:
                '"Trebuchet MS", "Fira Sans", "Helvetica Neue", Helvetica, Arial, sans-serif',
              fontSize: "17px",
              lineHeight: "27px",
              color: "#4A5565",
            }}
          >
            {questionIndex}.
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
            endIcon={isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
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
                fontFamily:
                  '"Trebuchet MS", "Fira Sans", "Helvetica Neue", Helvetica, Arial, sans-serif',
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
                    fontFamily:
                      '"Trebuchet MS", "Fira Sans", "Helvetica Neue", Helvetica, Arial, sans-serif',
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
                      pt: "2px",
                      color: isSelected ? "#316BFF" : "#7F8896",
                    }}
                  >
                    {isSelected ? (
                      <SvgCheckCircle className="shrink-0" />
                    ) : (
                      <SvgCircle className="shrink-0" />
                    )}
                  </Box>
                  <Box
                    component="span"
                    sx={{
                      flex: 1,
                    }}
                  >
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
    <Box sx={{ px: { xs: 2.5, md: 3.5 }, pt: { xs: 2.5, md: 3 } }}>
      <Paper
        key={question.id}
        elevation={0}
        sx={{
          p: { xs: 2.25, md: 2.5 },
          borderRadius: "22px",
          border: "1px solid #E2EAF6",
          backgroundColor: "#FFFFFF",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", lg: "row" },
            alignItems: { lg: "center" },
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Typography
            component="p"
            sx={{
              flex: 1,
              m: 0,
              fontSize: { xs: "0.98rem", md: "1rem" },
              lineHeight: 1.7,
              color: "#212E42",
            }}
          >
            <Box
              component="span"
              sx={{
                fontSize: "1rem",
                fontWeight: 800,
                color: "#76808F",
              }}
            >
              {questionIndex}/{totalQuestions}
              .{" "}
            </Box>
            <Box
              component="span"
              sx={{
                fontSize: "1rem",
                fontWeight: 800,
                color: "#212E42",
              }}
            >
              {question.question}
            </Box>
          </Typography>

          <Box sx={{ width: { xs: "100%", lg: "320px" } }}>
            <Button
              fullWidth
              variant="outlined"
              onClick={(event) => setAnchorEl(isOpen ? null : event.currentTarget)}
              endIcon={isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              sx={{
                justifyContent: "space-between",
                minHeight: "48px",
                px: 2,
                borderRadius: "16px",
                textTransform: "none",
                borderColor: "#D9E1EE",
                backgroundColor: "#FFFFFF",
                "&:hover": {
                  borderColor: "#BFCDE2",
                  backgroundColor: "#F8FBFF",
                },
              }}
            >
              <Box
                component="span"
                sx={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  color: selectedAnswerLabel ? "#37465C" : "#93A0B1",
                  fontWeight: selectedAnswerLabel ? 600 : 500,
                }}
              >
                {selectedAnswerLabel || "Select an answer"}
              </Box>
            </Button>

            <Menu
              anchorEl={anchorEl}
              open={isOpen}
              onClose={() => setAnchorEl(null)}
              transformOrigin={{ horizontal: "left", vertical: "top" }}
              anchorOrigin={{ horizontal: "left", vertical: "bottom" }}
              PaperProps={{
                sx: {
                  mt: 1,
                  width: { xs: "calc(100vw - 56px)", lg: "320px" },
                  maxWidth: "320px",
                  borderRadius: "18px",
                  border: "1px solid #D9E1EE",
                  boxShadow: "0 18px 42px rgba(55, 70, 92, 0.12)",
                  p: 1,
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
                      minHeight: "48px",
                      px: 2,
                      py: 1.25,
                      borderRadius: "12px",
                      whiteSpace: "normal",
                      lineHeight: 1.55,
                      fontSize: "0.95rem",
                      color: isSelected ? "#FFFFFF" : "#212E42",
                      backgroundColor: isSelected ? "#3EBBF3" : "#FFFFFF",
                      "&:hover": {
                        backgroundColor: isSelected ? "#24A8E2" : "#EEF7FF",
                      },
                      "&.Mui-selected": {
                        backgroundColor: "#3EBBF3",
                      },
                      "&.Mui-selected:hover": {
                        backgroundColor: "#24A8E2",
                      },
                    }}
                  >
                    {option.text}
                  </MenuItem>
                );
              })}
            </Menu>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default ListeningDropDownQuestionList;
