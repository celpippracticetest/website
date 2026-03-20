import { Box, Typography } from "@mui/material";
import { Button } from "@/components/ui/button";
import type { TPracticeDto } from "@/models/practice.model";
import SvgArrowRight from "@/components/icons/ArrowRight";
import SvgCheckCircle from "@/components/icons/CheckCircle";
import SvgRecording from "@/components/icons/Recording";
import OfficialExamFrame from "../OfficialExamFrame";
import OfficialInstructionBlock from "../OfficialInstructionBlock";
import { officialFontFamily, type OfficialViewFrameProps } from "./shared";

type SpeakingOfficialPage = "description" | "question" | "evaluateResult";

interface SpeakingOfficialViewProps extends OfficialViewFrameProps {
  page: SpeakingOfficialPage;
  practice: TPracticeDto;
  partId: number;
  shouldShowPractice: boolean;
  sendingResult: boolean;
  time: number;
  recordingTime: number;
  progressBar: number;
  isSubmit: boolean;
  isRecording: boolean;
  errorAccessingMicrophone: boolean;
  needsUserInteraction: boolean;
  resultHref: string;
  onLockedAction: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

const SpeakingOfficialView = ({
  title,
  primaryActionLabel,
  onPrimaryAction,
  primaryActionDisabled = false,
  onBack,
  backDisabled = false,
  statusSlot,
  page,
  practice,
  partId,
  shouldShowPractice,
  sendingResult,
  time,
  recordingTime,
  progressBar,
  isSubmit,
  isRecording,
  errorAccessingMicrophone,
  needsUserInteraction,
  resultHref,
  onLockedAction,
  onStartRecording,
  onStopRecording,
}: SpeakingOfficialViewProps) => {
  const hasPicturePrompt = Boolean(practice.passages[0].pictureUrl);
  const promptPanel = (
    <Box
      sx={{
        position: "relative",
        px: { xs: 2.5, md: 3 },
        py: { xs: 2.5, md: 3 },
        backgroundColor: "#EEF1F4",
        borderBottom: "1px solid #D7DCE3",
      }}
    >
      {practice.passages[0].body && practice.passages[0].body.length > 30 ? (
        <>
          {!practice.passages[0].pictureUrl && (
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
              Read the following message
            </Typography>
          )}
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
                <Box component="span">{practice.passages[0].body.slice(0, 150)}</Box>
                <Box
                  component="span"
                  sx={{
                    color: "#8896A8",
                    filter: "blur(4px)",
                  }}
                >
                  {practice.passages[0].body.slice(100)}
                </Box>
              </>
            ) : (
              <Box component="span">{practice.passages[0].body}</Box>
            )}
          </Typography>
        </>
      ) : (
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
          Read the following message, photo or diagram
        </Typography>
      )}

      {practice.passages[0].pictureUrl && (
        <img
          src={practice.passages[0].pictureUrl}
          alt={practice.passages[0].title}
          className={`mb-4 h-auto w-full rounded-lg shadow-md ${!shouldShowPractice ? "blur-sm" : ""}`}
        />
      )}

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
            aria-label="Upgrade to unlock speaking task"
            onClick={onLockedAction}
          >
            Upgrade to Pro
            <SvgArrowRight />
          </Button>
        </Box>
      )}
    </Box>
  );

  const recorderContent = (
    <div className="flex flex-col items-center">
      <div className="flex w-full flex-col items-center">
        {errorAccessingMicrophone ? (
          <div role="alert" className="relative h-[204px] rounded-[12px] border border-[#FF8FA7]">
            <div className="flex h-[44px] items-center gap-2 rounded-tl-[12px] rounded-tr-[12px] bg-[#FFE2E8] px-[16px]">
              <span className="text-[24px] text-[#EE4266]">!</span>
              <h5 className="text-[14px] font-semibold">Can&apos;t Use Microphone!</h5>
            </div>
            <div className="p-[16px] text-[14px] font-semibold text-[#212E42]">
              We don&apos;t have permission to use your microphone.
              <ol className="mt-[16px] font-normal">
                <li>Click &apos;Settings&apos; icon near the website address.</li>
                <li>Find &apos;Microphone&apos; and set it to Allow.</li>
                <li>Refresh the page.</li>
              </ol>
            </div>
          </div>
        ) : needsUserInteraction && time === 0 ? (
          <div className="relative flex w-full flex-col items-center justify-center">
            <div className="mb-4 w-full text-center text-[16px] font-semibold text-[#212E42]">
              Preparation time is over
            </div>
            <button
              className="flex items-center justify-center gap-2 rounded-[4px] bg-[#316BFF] px-6 py-3 text-[14px] font-medium uppercase tracking-[0.06em] text-white transition-colors hover:bg-[#2556E6]"
              onClick={onStartRecording}
            >
              <SvgRecording />
              Start Recording
            </button>
          </div>
        ) : isRecording ? (
          <Box
            sx={{
              width: "100%",
              maxWidth: "390px",
              minHeight: "105px",
              px: 3,
              py: 2.5,
              border: "1px solid #D8DDE5",
              backgroundColor: "#F7F8FA",
              color: "#5A6573",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 1.5,
            }}
          >
            <Typography
              sx={{
                fontFamily: officialFontFamily,
                fontSize: "14px",
                lineHeight: "20px",
                fontWeight: 500,
                color: "#5B6472",
                textAlign: "center",
              }}
            >
              Recording...
            </Typography>
          </Box>
        ) : time > 0 && !isSubmit && progressBar === 0 ? (
          <Box
            sx={{
              width: "100%",
              maxWidth: "390px",
              minHeight: "105px",
              px: 3,
              py: 2.5,
              border: "1px solid #D8DDE5",
              backgroundColor: "#F7F8FA",
              color: "#5A6573",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 1.5,
            }}
          >
            <Typography
              sx={{
                fontFamily: officialFontFamily,
                fontSize: "14px",
                lineHeight: "20px",
                fontWeight: 700,
                color: "#5B6472",
                textAlign: "center",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Preparation Time
            </Typography>
            <Typography
              sx={{
                fontFamily: officialFontFamily,
                fontSize: "28px",
                lineHeight: "32px",
                fontWeight: 700,
                color: "#2F4259",
                textAlign: "center",
              }}
            >
              {time}
            </Typography>
          </Box>
        ) : isSubmit && progressBar === 100 ? (
          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-col items-center gap-2">
              <SvgCheckCircle />
              <span className="text-xl font-bold text-green-700">
                Your recording submitted!
              </span>
              <p className="text-gray-600">You can now proceed to the next step.</p>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex w-full flex-col items-center justify-center space-y-2">
            <div className="mb-2 w-full text-center text-[14px] font-medium text-gray-800">
              Upload recording...
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
          </div>
        )}
      </div>
    </div>
  );

  const recorderPane = (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: { xs: 320, md: 360 },
        px: { xs: 2.5, md: 3 },
        py: { xs: 3, md: 4 },
        backgroundColor: "#EAF2F8",
      }}
    >
      {recorderContent}
    </Box>
  );

  const content =
    page === "evaluateResult" && !sendingResult ? (
      <Box className="flex h-full flex-col items-center justify-center p-6 text-center">
        <p className="mb-4 text-[16px] font-bold text-[#212E42]">Evaluation Complete!</p>
        <a href={resultHref}>
          <button className="flex items-center rounded-[4px] bg-[#4A7DFF] px-[24px] text-white h-[40px] cursor-pointer uppercase tracking-[0.06em]">
            View Results
          </button>
        </a>
      </Box>
    ) : page === "evaluateResult" && sendingResult ? (
      <Box className="flex h-full flex-col items-center justify-center p-6 text-center">
        <div className="mb-8">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <p className="mb-2 text-2xl font-bold text-gray-800">Evaluating your answers...</p>
          <p className="text-gray-600">Please wait {time} seconds</p>
        </div>
        <p className="max-w-md text-[14px] text-gray-500">
          We are calculating your score and analyzing your performance across all
          sections.
        </p>
      </Box>
    ) : page === "description" ? (
      <OfficialInstructionBlock
        title="Speaking Test Instructions"
        items={[
          "You will complete 8 speaking tasks.",
          "Each task begins with preparation time before the recording starts.",
          "Allow microphone access so your response can be recorded and submitted.",
        ]}
      />
    ) : hasPicturePrompt ? (
      <Box
        sx={{
          minHeight: { xs: 520, md: 580 },
          px: { xs: 2.5, md: 3 },
          py: { xs: 2.5, md: 3 },
          backgroundColor: "#EEF1F4",
        }}
      >
        {practice.passages[0].body && (
          <Typography
            sx={{
              mb: 2,
              fontFamily: officialFontFamily,
              fontSize: "16px",
              lineHeight: "24px",
              color: "#243244",
            }}
          >
            {!shouldShowPractice ? (
              <>
                <Box component="span">{practice.passages[0].body.slice(0, 150)}</Box>
                <Box
                  component="span"
                  sx={{
                    color: "#8896A8",
                    filter: "blur(4px)",
                  }}
                >
                  {practice.passages[0].body.slice(100)}
                </Box>
              </>
            ) : (
              <Box component="span">{practice.passages[0].body}</Box>
            )}
          </Typography>
        )}

        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            alignItems: { md: "flex-start" },
            gap: 3,
          }}
        >
          <Box
            sx={{
              flex: 1,
              position: "relative",
            }}
          >
            {practice.passages[0].pictureUrl ? (
              <img
                src={practice.passages[0].pictureUrl}
                alt={practice.passages[0].title}
                className={`h-auto w-full rounded-lg shadow-md ${!shouldShowPractice ? "blur-sm" : ""}`}
              />
            ) : null}
            {!shouldShowPractice && (
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
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
                  aria-label="Upgrade to unlock speaking task"
                  onClick={onLockedAction}
                >
                  Upgrade to Pro
                  <SvgArrowRight />
                </Button>
              </Box>
            )}
          </Box>
          <Box
            sx={{
              width: { xs: "100%", md: "390px" },
              display: "flex",
              justifyContent: "center",
            }}
          >
            {recorderContent}
          </Box>
        </Box>
      </Box>
    ) : (
      <Box sx={{ minHeight: { xs: 520, md: 580 }, backgroundColor: "#FFFFFF" }}>
        {promptPanel}
        {recorderPane}
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

export default SpeakingOfficialView;
