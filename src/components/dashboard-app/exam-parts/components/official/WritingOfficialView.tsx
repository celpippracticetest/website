import { Box, Typography } from "@mui/material";
import { Button } from "@/components/ui/button";
import type { TPracticeDto } from "@/models/practice.model";
import SvgArrowRight from "@/components/icons/ArrowRight";
import SvgCheckCircle from "@/components/icons/CheckCircle";
import OfficialExamFrame from "../OfficialExamFrame";
import OfficialInstructionBlock from "../OfficialInstructionBlock";
import OfficialSplitPane from "./OfficialSplitPane";
import { officialFontFamily, type OfficialViewFrameProps } from "./shared";

type WritingOfficialPage = "description" | "question";

interface WritingOfficialViewProps extends OfficialViewFrameProps {
  page: WritingOfficialPage;
  practice: TPracticeDto;
  shouldShowPractice: boolean;
  wordCount: number;
  progressBar: number;
  isSubmit: boolean;
  tryToSubmit: boolean;
  text: string;
  completionActionLabel: string;
  onLockedAction: () => void;
  onTextChange: (value: string) => void;
  onSubmit: () => void;
  onCompletionAction: () => void;
}

const WritingOfficialView = ({
  title,
  primaryActionLabel,
  onPrimaryAction,
  primaryActionDisabled = false,
  onBack,
  backDisabled = false,
  statusSlot,
  page,
  practice,
  shouldShowPractice,
  wordCount,
  progressBar,
  isSubmit,
  tryToSubmit,
  text,
  completionActionLabel,
  onLockedAction,
  onTextChange,
  onSubmit,
  onCompletionAction,
}: WritingOfficialViewProps) => {
  const promptPane = (
    <Box sx={{ position: "relative" }}>
      <Typography
        sx={{
          mb: "5px",
          fontFamily: officialFontFamily,
          fontSize: "17px",
          lineHeight: "1.2em",
          fontWeight: 700,
          textTransform: "uppercase",
          color: "#1A578A",
          pl: "25px",
          backgroundImage:
            'url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18"><circle cx="9" cy="9" r="8" fill="%231A578A"/><rect x="8.2" y="7.2" width="1.6" height="5.2" rx="0.8" fill="white"/><circle cx="9" cy="4.9" r="1" fill="white"/></svg>\')',
          backgroundPosition: "left 0px",
          backgroundRepeat: "no-repeat",
        }}
      >
        Read the following information
      </Typography>

      <Typography
        sx={{
          whiteSpace: "pre-line",
          fontFamily: officialFontFamily,
          fontSize: "16px",
          lineHeight: "24px",
          color: "#243244",
        }}
      >
        {!shouldShowPractice ? (
          <>
            <Box component="span">{practice.passages[0].body?.slice(0, 150)}</Box>
            <Box
              component="span"
              sx={{
                color: "#8896A8",
                filter: "blur(4px)",
              }}
            >
              {practice.passages[0].body?.slice(100)}
            </Box>
          </>
        ) : (
          <Box component="span">{practice.passages[0].body}</Box>
        )}
      </Typography>

      {!shouldShowPractice && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            top: "80px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <Button
            variant="outline"
            className="mt-[32px] flex items-center justify-center gap-[8px] rounded-[24px] bg-[#4A7DFF] text-[14px] font-normal text-white"
            aria-label="Upgrade to unlock writing prompt"
            onClick={onLockedAction}
          >
            Upgrade to Pro
            <SvgArrowRight />
          </Button>
        </Box>
      )}
    </Box>
  );

  const editorPane =
    ((!tryToSubmit && !isSubmit) || (wordCount < 20 && tryToSubmit)) ? (
      <Box sx={{ width: "100%" }}>
        <Typography
          sx={{
            mb: 2,
            fontFamily: officialFontFamily,
            fontSize: "16px",
            lineHeight: "22px",
            fontWeight: 700,
            color: "#4B6484",
          }}
        >
          Write an email to the restaurant&apos;s manager in about 150-200 words.
          Your email should do the following things:
        </Typography>
        <Box
          sx={{
            mb: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
          }}
        >
          <Typography
            sx={{
              fontSize: "1rem",
              fontWeight: 700,
              color: "#243244",
            }}
          >
            Write your response below
          </Typography>
        </Box>

        <textarea
          className="h-[360px] w-full rounded-[4px] border border-[#C9D7E6] bg-white p-[16px]"
          placeholder="Type your response here..."
          value={text}
          onChange={(event) => onTextChange(event.target.value)}
        />

        <Box
          sx={{
            mt: 1,
            textAlign: "center",
            fontFamily: officialFontFamily,
            fontSize: "14px",
            lineHeight: "20px",
            color: "#526071",
          }}
        >
          {wordCount} words
        </Box>

        <Box sx={{ mt: 3, display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Box
            hidden={!tryToSubmit}
            sx={{
              minHeight: "44px",
              display: "flex",
              alignItems: "center",
              px: 2,
              borderRadius: "8px",
              backgroundColor: "#FFF1F3",
              border: "1px solid #FFD4DB",
            }}
          >
            <Typography
              sx={{
                fontSize: "0.9rem",
                fontWeight: 600,
                color: "#D84A67",
              }}
            >
              Your response must be at least 20 words long.
            </Typography>
          </Box>
        </Box>
      </Box>
    ) : isSubmit && progressBar === 100 ? (
      <Box className="flex flex-col items-center gap-4">
        <Box className="flex flex-col items-center gap-2">
          <SvgCheckCircle className="text-[#0DAA94]" />
          <span className="text-[18px] font-bold text-[#0DAA94]">
            Your answer submitted!
          </span>
          <p className="text-[14px] font-medium text-[#37465C]">
            You can now proceed to the next step.
          </p>
          <Button
            className="mt-4 rounded-[4px] bg-[#4A7DFF] px-6 py-2 uppercase tracking-[0.06em] text-white"
            onClick={onCompletionAction}
          >
            {completionActionLabel}
          </Button>
        </Box>
      </Box>
    ) : (
      <Box className="mx-auto flex w-full flex-col items-center justify-center space-y-2">
        <div className="mb-2 w-full text-center text-[14px] font-medium text-gray-800">
          Upload your answer...
        </div>
        <Box className="animate-spin text-gray-800">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeOpacity="0.2"
              strokeWidth="4"
            />
            <path
              d="M22 12a10 10 0 0 1-10 10"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
        </Box>
      </Box>
    );

  const content =
    page === "description" ? (
      <OfficialInstructionBlock
        title="Writing Test Instructions"
        items={[
          "You will complete two writing tasks.",
          "The first task gives you 27 minutes to respond.",
          "The second task gives you 26 minutes to complete your response.",
        ]}
      />
    ) : (
      <OfficialSplitPane
        left={promptPane}
        right={editorPane}
        rowFrom="md"
        sx={{
          flexDirection: { xs: "column", md: "row" },
          minHeight: { xs: 520, md: 600 },
        }}
        leftPaneSx={{
          backgroundColor: "#EEF1F4",
          position: "relative",
          width: { xs: "100%", md: "33%" },
          maxHeight: { md: "600px" },
          overflowY: "auto",
        }}
        rightPaneSx={{
          backgroundColor: "#EAF2F8",
          width: { xs: "100%", md: "67%" },
          maxHeight: { md: "600px" },
          overflowY: "auto",
        }}
      />
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

export default WritingOfficialView;
