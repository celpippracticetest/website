import React from "react";
import Image from "next/image";
import { Popover } from "radix-ui";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Box, Button as MuiButton, Typography } from "@mui/material";
import { Button } from "@/components/ui/button";
import type { TPracticeDto } from "@/models/practice.model";
import SvgArrowRight from "@/components/icons/ArrowRight";
import SvgCheckCircle from "@/components/icons/CheckCircle";
import SvgCircle from "@/components/icons/Circle";
import ReadingQuestionList from "@/components/dashboard-app/reading-practice/components/ReadingQuestionList";
import OfficialExamFrame from "../OfficialExamFrame";
import OfficialInstructionBlock from "../OfficialInstructionBlock";
import OfficialSplitPane from "./OfficialSplitPane";
import { officialFontFamily, type OfficialViewFrameProps } from "./shared";

type ReadingOfficialPage = "description" | "question" | "answer";

interface ReadingOfficialViewProps extends OfficialViewFrameProps {
  page: ReadingOfficialPage;
  practice: TPracticeDto;
  shouldShowPractice: boolean;
  selectedAnswers: Record<number, string>;
  onAnswerSelect: (questionId: number, answerId: string) => void;
  onLockedAction: () => void;
}

const sectionLabelSx = {
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
} as const;

const bodyTextSx = {
  whiteSpace: "pre-line",
  fontFamily: officialFontFamily,
  fontSize: "16px",
  lineHeight: "24px",
  color: "#243244",
} as const;

const ReadingOfficialView = ({
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
  selectedAnswers,
  onAnswerSelect,
  onLockedAction,
}: ReadingOfficialViewProps) => {
  const firstPassage = practice.passages[0];
  const secondPassage = practice.passages[1];
  const thirdPassage = practice.passages[2];

  const passagePaneContent = (
    <Box sx={{ position: "relative" }}>
      {firstPassage?.pictureUrl && (
        <>
          <Typography sx={sectionLabelSx}>
            Read the following message, photo or diagram
          </Typography>
          <Box
            sx={{
              mb: 3,
              overflow: "hidden",
              borderRadius: "8px",
              border: "1px solid #D9E1EB",
              boxShadow: "0 10px 30px rgba(44, 58, 84, 0.08)",
              filter: shouldShowPractice ? "none" : "blur(4px)",
            }}
          >
            <Image
              src={firstPassage.pictureUrl}
              alt={firstPassage.title || "Reading passage image"}
              width={800}
              height={600}
              className="w-full h-auto"
              priority={true}
            />
          </Box>
        </>
      )}

      {firstPassage?.body && firstPassage.body.length > 30 && (
        <>
          {!firstPassage.pictureUrl && (
            <Typography sx={sectionLabelSx}>Read the following message</Typography>
          )}
          <Typography sx={bodyTextSx}>
            {!shouldShowPractice ? (
              <>
                <Box component="span">{firstPassage.body.slice(0, 150)}</Box>
                <Box
                  component="span"
                  sx={{
                    color: "#8896A8",
                    filter: "blur(4px)",
                  }}
                >
                  {firstPassage.body.slice(100)}
                </Box>
              </>
            ) : (
              <Box component="span">{firstPassage.body}</Box>
            )}
          </Typography>
        </>
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
            aria-label="Upgrade to view full passage"
            onClick={onLockedAction}
          >
            Upgrade to Pro
            <SvgArrowRight />
          </Button>
        </Box>
      )}
    </Box>
  );

  const questionsPaneContent = (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {firstPassage?.questions?.length ? (
        <>
          <Typography
            component="p"
            sx={{
              mb: 1,
              fontFamily: officialFontFamily,
              fontSize: "16px",
              lineHeight: "22px",
              fontWeight: 700,
              color: "#4B6484",
            }}
          >
            Using the drop-down menu (
            <Box
              component="span"
              sx={{
                display: "inline-block",
                minWidth: "28px",
                textAlign: "center",
                fontWeight: 400,
                color: "#4A5565",
              }}
            >
              ▼
            </Box>
            ), choose the best option according to the information given in the
            message.
          </Typography>

          <Box
            sx={{
              mb: 2.5,
              px: { xs: 2, md: 2.5 },
              py: { xs: 2, md: 2.25 },
              border: "1px solid #C9D7E6",
              backgroundColor: "#EAF2F8",
            }}
          >
            <Box sx={{ display: "flex", flexDirection: "column" }}>
              {firstPassage.questions.map((question, index) => (
                <ReadingQuestionList
                  key={index}
                  questionIndex={index}
                  totalQuestions={practice.totalQuestion || 0}
                  question={question}
                  onAnswerSelect={(questionId: number, answerId: string) => {
                    if (shouldShowPractice) {
                      onAnswerSelect(questionId, answerId);
                    } else {
                      onLockedAction();
                    }
                  }}
                  selectedAnswers={selectedAnswers}
                  variant="official"
                />
              ))}
            </Box>
          </Box>
        </>
      ) : null}

      {secondPassage?.body && secondPassage.body.length > 0 && (
        <>
          <Typography component="p" sx={{ mt: 2, fontWeight: 700, color: "#0F172A" }}>
            {secondPassage.title}
          </Typography>
          <Box
            sx={{
              mb: 3,
              px: { xs: 2, md: 2.5 },
              py: { xs: 2, md: 2.25 },
              border: "1px solid #C9D7E6",
              backgroundColor: "#EAF2F8",
            }}
          >
            <Typography
              component="div"
              sx={{
                fontSize: "14px",
                lineHeight: 1.9,
                fontWeight: 500,
                color: "#212E42",
                whiteSpace: "pre-line",
                fontFamily: officialFontFamily,
              }}
            >
              {secondPassage.body.split("${Q}").map((paragraph, index, arr) => (
                <React.Fragment key={index}>
                  {paragraph}
                  {index !== arr.length - 1 && (
                    <Popover.Root>
                      <Popover.Trigger asChild>
                        <MuiButton
                          variant="outlined"
                          endIcon={<ChevronDown size={16} />}
                          sx={{
                            mx: 0.5,
                            minWidth: "88px",
                            maxWidth: "88px",
                            minHeight: "24px",
                            px: 0.5,
                            py: 0,
                            borderRadius: 0,
                            borderColor: "#DADDE3",
                            backgroundColor: "#FFFFFF",
                            textTransform: "none",
                            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)",
                            verticalAlign: "middle",
                            justifyContent: "space-between",
                            color: "#3F4A59",
                            "& .MuiButton-endIcon": {
                              ml: 0,
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
                              width: "100%",
                              minWidth: "1px",
                              display: "inline-block",
                            }}
                          />
                        </MuiButton>
                      </Popover.Trigger>
                      <Popover.Portal>
                        <Popover.Content
                          className="PopoverContent text-popover-foreground outline-none"
                          sideOffset={5}
                          align="start"
                          style={{
                            width: "176px",
                            maxWidth: "176px",
                            borderRadius: "8px",
                            border: "1px solid #DADDE3",
                            backgroundColor: "#FFFFFF",
                            boxShadow: "0 6px 18px rgba(55, 70, 92, 0.12)",
                            overflow: "hidden",
                            padding: 0,
                          }}
                        >
                          <Box sx={{ display: "flex", flexDirection: "column" }}>
                            {(secondPassage.questions?.[index]?.choices || []).map(
                              (choice, indexChoice) => (
                                <Popover.Close asChild key={indexChoice}>
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "flex-start",
                                      minHeight: "26px",
                                      cursor: "pointer",
                                      pl: "25px",
                                      pr: "8px",
                                      pt: "2px",
                                      pb: "2px",
                                      gap: 0.75,
                                      borderBottom:
                                        indexChoice ===
                                        (secondPassage.questions?.[index]?.choices || [])
                                          .length -
                                          1
                                          ? "none"
                                          : "1px dotted #CCC",
                                      transition: "background-color 0.2s ease",
                                      fontFamily: officialFontFamily,
                                      fontSize: "13px",
                                      lineHeight: "17px",
                                      color: "#3F4A59",
                                      "&:hover": {
                                        backgroundColor: "#E7F8F3",
                                      },
                                    }}
                                    onClick={() => {
                                      if (shouldShowPractice) {
                                        onAnswerSelect(
                                          (firstPassage?.questions?.length || 0) + index,
                                          choice.id
                                        );
                                      } else {
                                        onLockedAction();
                                      }
                                    }}
                                  >
                                    {selectedAnswers[(firstPassage?.questions?.length || 0) + index] ===
                                    choice.id ? (
                                      <SvgCheckCircle className="shrink-0" />
                                    ) : (
                                      <SvgCircle className="shrink-0" />
                                    )}
                                    <Box component="span" sx={{ flex: 1 }}>
                                      {choice.text}
                                    </Box>
                                  </Box>
                                </Popover.Close>
                              )
                            )}
                          </Box>
                          <Popover.Arrow className="PopoverArrow" />
                        </Popover.Content>
                      </Popover.Portal>
                    </Popover.Root>
                  )}
                </React.Fragment>
              ))}
            </Typography>
          </Box>
        </>
      )}

      {thirdPassage?.questions && thirdPassage.questions.length > 0 && (
        <Typography
          component="p"
          sx={{
            mt: 2,
            fontFamily: officialFontFamily,
            fontSize: "16px",
            lineHeight: "22px",
            fontWeight: 700,
            color: "#4B6484",
          }}
        >
          Here is a response to the message. Complete the response by filling in
          the blanks. Select the best choice for each blank from the drop-down
          menu (
          <Box
            component="span"
            sx={{
              display: "inline-block",
              minWidth: "28px",
              textAlign: "center",
              fontWeight: 400,
              color: "#4A5565",
            }}
          >
            ▼
          </Box>
          ).
        </Typography>
      )}

      {thirdPassage?.questions?.map((question, index) => (
        <ReadingQuestionList
          key={index}
          questionIndex={
            (firstPassage?.questions?.length || 0) +
            (secondPassage?.questions?.length || 0) +
            index
          }
          totalQuestions={practice.totalQuestion || 0}
          question={question}
          onAnswerSelect={(_questionId: number, answerId: string) => {
            if (shouldShowPractice) {
              onAnswerSelect(
                (firstPassage?.questions?.length || 0) +
                  (secondPassage?.questions?.length || 0) +
                  index,
                answerId
              );
            } else {
              onLockedAction();
            }
          }}
          selectedAnswers={selectedAnswers}
          variant="official"
        />
      ))}
    </Box>
  );

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
        }}
      >
        <Box className="mx-auto flex w-full flex-col items-center justify-center space-y-2">
          <Box sx={{ textAlign: "center", fontSize: "1rem", fontWeight: 500, color: "#1F2937" }}>
            Upload Answers...
          </Box>
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
      </Box>
    ) : page === "description" ? (
      <OfficialInstructionBlock
        title="Reading Test Instructions"
        items={[
          "You will read four separate passages.",
          "For each passage, questions will appear on the right side of the screen.",
          "Select the most appropriate answer for each question.",
        ]}
      />
    ) : (
      <OfficialSplitPane
        left={passagePaneContent}
        right={questionsPaneContent}
        rowFrom="md"
        sx={{
          flexDirection: { xs: "column", md: "row" },
          minHeight: { xs: 520, md: 630 },
          backgroundColor: "#EEF3F6",
        }}
        leftPaneSx={{
          backgroundColor: "#EEF3F6",
          width: { xs: "100%", md: "44%" },
          maxHeight: { md: "630px" },
          overflowY: "auto",
        }}
        rightPaneSx={{
          backgroundColor: "#EEF3F6",
          width: { xs: "100%", md: "56%" },
          maxHeight: { md: "630px" },
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

export default ReadingOfficialView;
