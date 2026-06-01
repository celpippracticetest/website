import SvgCheckCircle from "@/components/icons/CheckCircle";
import SvgCircle from "@/components/icons/Circle";
import { cn } from "@/lib/utils";
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

const officialFontFamily =
  '"Fira Sans", "Trebuchet MS", "Helvetica Neue", Helvetica, Arial, sans-serif';

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
  const isWrongSelection = showResults && isSelected && !isCorrect;

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
          fontFamily: officialFontFamily,
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
            fontFamily: officialFontFamily,
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
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary1/25 focus-visible:ring-offset-2",
        showResults
          ? isCorrect
            ? "border-success/40 bg-success5"
            : isWrongSelection
              ? "border-error1/40 bg-error5/70"
              : "border-outline bg-white"
          : isSelected
            ? "border-primary1/40 bg-primary6"
            : "border-outline bg-white hover:border-primary1/25 hover:bg-primary6/60"
      )}
    >
      {!showResults && (
        <span className="mt-0.5 shrink-0">
          {isSelected ? (
            <SvgCheckCircle className="shrink-0" />
          ) : (
            <SvgCircle className="shrink-0" />
          )}
        </span>
      )}

      <span className="flex min-w-0 flex-1 flex-col gap-1">
        {showResults && isCorrect && (
          <span className="font-body text-xs font-bold text-success">
            Correct answer:
          </span>
        )}
        {showResults && isWrongSelection && (
          <span className="font-body text-xs font-bold text-error1">
            Your answer:
          </span>
        )}
        <span className="font-body text-sm leading-relaxed text-text1">
          {option.text}
        </span>
      </span>
    </button>
  );
};

export default QuestionOption;
