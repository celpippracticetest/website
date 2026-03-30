import SvgCheckCircle from "@/components/icons/CheckCircle";
import SvgCircle from "@/components/icons/Circle";
import { Box, Typography } from "@mui/material";

interface QuestionOptionProps {
  option: {
    id: string;
    text: string;
  };
  questionId: string;
  isSelected: boolean;
  showResults: boolean;
  isCorrect: boolean;
  onClick: () => void;
  isLastItem?: boolean;
  variant?: "default" | "official";
}

const QuestionOption = ({
  option,
  isSelected,
  showResults,
  isCorrect,
  onClick,
  isLastItem = false,
  variant = "default",
}: QuestionOptionProps) => {
  const isOfficialMode = variant === "official";
  const isUserSelection = isSelected;
  const isWrongSelection = showResults && isUserSelection && !isCorrect;
  const backgroundColor = showResults
    ? isCorrect
      ? "#F0FFFD"
      : isWrongSelection
        ? "#FFF4F5"
        : "#FFFFFF"
    : isSelected
      ? "#F2F6FF"
      : "#FFFFFF";
  const borderColor = showResults
    ? isCorrect
      ? "#0DAA94"
      : isWrongSelection
        ? "#EE4266"
        : "#E2EAF6"
    : isSelected
      ? "#AFC7FF"
      : "#E2EAF6";

  if (isOfficialMode && !showResults) {
    return (
      <Box
        component="li"
        onClick={onClick}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          m: 0,
          px: 0,
          py: "7px",
          listStyle: "none",
          borderBottom: isLastItem ? "none" : "1px solid #D8DDE5",
          backgroundColor: "transparent",
          cursor: "pointer",
          color: "#000000",
          transition: "background-color 0.2s ease",
          fontFamily:
            '"Fira Sans", "Trebuchet MS", "Helvetica Neue", Helvetica, Arial, sans-serif',
          fontSize: "12px",
          lineHeight: "18px",
          fontWeight: 400,
          "&:hover": {
            backgroundColor: "#E7F8F3",
            textDecoration: "none",
          },
        }}
      >
        <Box
          component="span"
          aria-hidden="true"
          sx={{
            width: "13px",
            minWidth: "13px",
            height: "13px",
            borderRadius: "999px",
            border: "1px solid #7E8794",
            backgroundColor: "#FFFFFF",
            position: "relative",
            "&::after": isSelected
              ? {
                  content: '""',
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  width: "7px",
                  height: "7px",
                  borderRadius: "999px",
                  backgroundColor: "#4D5B70",
                  transform: "translate(-50%, -50%)",
                }
              : {},
          }}
        />
        <Typography
          component="span"
          sx={{
            fontFamily:
              '"Fira Sans", "Trebuchet MS", "Helvetica Neue", Helvetica, Arial, sans-serif',
            fontSize: "12px",
            lineHeight: "18px",
            fontWeight: 400,
            color: "#000000",
          }}
        >
          {option.text}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      onClick={onClick}
      sx={{
        px: { xs: 1.5, sm: 1.75 },
        py: { xs: 0.5, sm: 1.5 },
        borderRadius: { xs: 0, sm: "18px" },
        border: {
          xs: "none",
          sm: `1px solid ${borderColor}`,
        },
        borderBottom: {
          xs: isLastItem ? "none" : "1px solid #E2EAF6",
          sm: "none",
        },
        backgroundColor,
        cursor: "pointer",
        transition:
          "border-color 0.2s ease, background-color 0.2s ease, transform 0.2s ease",
        "&:hover": {
          transform: { xs: "none", sm: "translateY(-1px)" },
          ...(showResults
            ? { backgroundColor }
            : {
                borderColor: isSelected ? "#8BAEFF" : "#C7D6F8",
                backgroundColor: "#E7F8F3",
              }),
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: 1.25,
          ...(showResults ? { my: 0.5 } : {}),
        }}
      >
        {!showResults && isSelected && <SvgCheckCircle className="shrink-0" />}
        {!showResults && !isSelected && <SvgCircle className="shrink-0" />}
        {showResults && isCorrect && (
          <Typography
            sx={{
              fontSize: { xs: "0.82rem", sm: "0.95rem" },
              fontWeight: 700,
              color: "#0DAA94",
              whiteSpace: "nowrap",
            }}
          >
            Correct answer:
          </Typography>
        )}
        {showResults && !isCorrect && (
          <Typography
            sx={{
              fontSize: { xs: "0.82rem", sm: "0.95rem" },
              fontWeight: 700,
              color: "#EE4266",
              whiteSpace: "nowrap",
            }}
          >
            Your answer:
          </Typography>
        )}
        <Typography
          sx={{
            flex: 1,
            fontSize: "14px",
            lineHeight: 1.65,
            color: "#243244",
          }}
        >
          {option.text}
        </Typography>
      </Box>
    </Box>
  );
};

export default QuestionOption;
