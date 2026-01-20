import SvgArrowRight from "@/components/icons/ArrowRight";
import SvgChevronDownExam from "@/components/icons/ChevronDownExam";
import CircularSkillProgress from "@/components/shared/CircularSkillProgress";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { TWritingAnswerDto } from "@/models/answer";
import { TExamPartSchemaDto } from "@/models/examParts.model";

import { Accordion } from "radix-ui";
import * as React from "react";
import AudioPlayer from "../listening-practice/components/AudioPlayer";
import { PRACTICE_PARTS } from "@/constants";

const WritingResultView = ({
  examPart,
  attemptId,
}: {
  examPart: TExamPartSchemaDto | undefined;
  attemptId?: string | null;
}) => {
  const [answer, setAnswer] = React.useState<TWritingAnswerDto | null>(null);
  const [showMoreMistake, setShowMoreMistake] = React.useState(false);
  const [showMoreBetterVersion, setShowMoreBetterVersion] =
    React.useState(false);
  const [showMoreHowToImprove, setShowMoreHowToImprove] = React.useState(false);
  const fetchUsersAnswer = async () => {
    try {
      const url = new URL("/api/exams/answers/writing", window.location.origin);
      url.searchParams.append("examId", examPart?.examId.toString() ?? "");
      url.searchParams.append("partId", examPart?.partId.toString() ?? "");
      if (attemptId) {
        url.searchParams.append("attemptId", attemptId);
      }
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Network response was not ok.");
      }
      const data = await response.json();
      if (data.items.length > 0) {
        setAnswer(data.items[0]);
      }
    } catch (error) {
      console.error("Error fetching answer:", error);
    }
  };
  React.useEffect(() => {
    fetchUsersAnswer();
  }, [examPart?.examId, examPart?.partId, attemptId]);
  if (!examPart) {
    return <div></div>;
  }

  const skillScores = {
    coherence: answer?.result?.contentAndCoherence ?? 0,
    vocabulary: answer?.result?.vocabulary ?? 0,
    readability: answer?.result?.readabilityAndGrammar ?? 0,
    fulfillment: answer?.result?.taskFulfillment ?? 0,
  };

  const maxScore = 12;
  const overallScore = Math.round(
    Object.values(skillScores).reduce((sum, score) => sum + score, 0) /
    Object.keys(skillScores).length
  );

  // Determine the description based on overall score
  const getScoreDescription = (score: number) => {
    if (score >= 8)
      return {
        title: "Excellent and Clear",
        description:
          "The response addresses all requirements with clear organization, varied vocabulary, and proper language use.",
      };
    if (score >= 6)
      return {
        title: "Good but Limited",
        description:
          "The response addresses most requirements with adequate organization and vocabulary, but has some language errors.",
      };
    if (score >= 4)
      return {
        title: "Partially Developed",
        description:
          "The response addresses some requirements but lacks organization and has limited vocabulary with frequent errors.",
      };
    return {
      title: "Incomplete and Unclear",
      description:
        "The response is extremely brief, lacks essential details, and doesn't address the task requirements.",
    };
  };
  const scoreDetails = getScoreDescription(answer?.result?.overall ?? 0);

  return (
    <Accordion.Root
      className="border  border-[#D5D6D8] rounded-[8px] bg-white overflow-hidden"
      type="single"
      collapsible
    >
      <Accordion.Item value="item-1">
        <Accordion.Header className="flex">
          <Accordion.Trigger className="group flex  text-[14px] font-medium cursor-pointer bg-[#F6F7F9] px-[24px] flex-1 h-[88px] [&[data-state=open]]:h-[144px] screen744:!h-[54px] screen744:[&[data-state=open]]:h-[72px] items-center justify-between  [&[data-state=open]>div>svg]:rotate-180 ">
            <div className="flex gap-[10px] flex-col-reverse screen744:!flex-row items-start group">
              <span className="font-semibold text-left">
                {examPart?.partId && PRACTICE_PARTS[examPart?.partId - 1]}
              </span>
              <span className="text-[#212E42] px-[12px] rounded-[24px] flex items-center text-[11px] font-medium  h-[24px] border border-[#D5D6D8]">
                Score: {answer && answer.overalScore ? answer?.overalScore : 0}
                /12
              </span>
              <a
                className="flex group-data-[state=closed]:hidden text-[#F27059] border border-[#F27059] bg-white px-[16px]  gap-[8px] h-[40px] rounded-[24px] text-[14px] justify-center items-center screen744:!hidden"
                href={
                  "/exams/exam_" + examPart?.examId + "/part" + examPart?.partId
                }
              >
                Go to this part
                <SvgArrowRight />
              </a>
            </div>

            <div className="flex items-center gap-[40px]">
              <div className="hidden group-data-[state=open]:flex">
                <a
                  className="hidden text-[#F27059] border border-[#F27059] bg-white px-[16px] ml-[8px] gap-[8px] h-[40px] rounded-[24px] text-[14px] justify-center items-center screen744:!flex"
                  href={
                    "/exams/exam_" +
                    examPart?.examId +
                    "/part" +
                    examPart?.partId
                  }
                >
                  Go to this part
                  <SvgArrowRight />
                </a>
              </div>
              <SvgChevronDownExam />
            </div>
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Content>
          <div className="border-t bg-white">
            <div hidden={!answer} className="">
              <div className="flex flex-col px-[16px]">
                {answer && answer.audioUrl && (
                  <div className="flex flex-col gap-2 ">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-[16px] mt-[16px] text-[#316BFF]">
                        Your Answer
                      </h4>
                    </div>

                    <AudioPlayer audioUrl={answer.audioUrl} />
                  </div>
                )}
                <div className="flex flex-col gap-4 mt-[16px]">
                  {answer && answer.result && (
                    <div className="overflow-hidden border rounded-[8px] h-auto min-h-[255px]">
                      {/* Header section with main score */}
                      <div className="min-h-[128px] p-[16px] h-auto border-b flex flex-col md:flex-row justify-center items-center  gap-6">
                        <div className="w-40 flex-shrink-0">
                          <CircularSkillProgress
                            label="Score"
                            score={overallScore}
                            maxScore={maxScore}
                          />
                        </div>

                        <div className="flex-1">
                          <h2 className="text-[#212E42] text-[20px] font-bold  mb-[16px]">
                            {scoreDetails.title}
                          </h2>
                          <p className="text-[#37465C] text-[12px] font-normal">
                            {scoreDetails.description}
                          </p>
                        </div>
                      </div>
                      <Table>
                        <TableBody>
                          <TableRow className="border-b-0">
                            <TableCell className="p-0">
                              <div className="p-6 flex flex-col items-center justify-center  h-full">
                                <CircularSkillProgress
                                  label="Coherence"
                                  score={skillScores.coherence}
                                  maxScore={maxScore}
                                />
                              </div>
                            </TableCell>
                            <TableCell className="p-0">
                              <div className="p-6 flex flex-col items-center justify-center  h-full">
                                <CircularSkillProgress
                                  label="Vocabulary"
                                  score={skillScores.vocabulary}
                                  maxScore={maxScore}
                                />
                              </div>
                            </TableCell>
                            <TableCell className="p-0">
                              <div className="p-6 flex flex-col items-center justify-center  h-full">
                                <CircularSkillProgress
                                  label="Readability"
                                  score={skillScores.readability}
                                  maxScore={maxScore}
                                />
                              </div>
                            </TableCell>
                            <TableCell className="p-0">
                              <div className="p-6 flex flex-col items-center justify-center h-full">
                                <CircularSkillProgress
                                  label="Fulfillment"
                                  score={skillScores.fulfillment}
                                  maxScore={maxScore}
                                />
                              </div>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  <div className="flex flex-col gap-2 text-[14px]">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-[16px] text-[#EE4266]">
                        Your Mistakes
                      </h4>
                    </div>
                    <div className="relative">
                      <div className={"relative overflow-hidden"}>
                        <div className="prose prose-base max-w-none prose-blue text-slate-700 whitespace-pre-line">
                          <span className="text-slate-700">
                            {(answer?.result?.grammarMistakes ?? []).map(
                              (mistakeBlock, index) => {
                                if (mistakeBlock.improvement == null) {
                                  return (
                                    <span
                                      key={index}
                                      className="text-slate-700"
                                    >
                                      {" "}
                                      {mistakeBlock.original}{" "}
                                    </span>
                                  );
                                }
                                return (
                                  <React.Fragment key={index}>
                                    <span className="bg-red-100 text-red-800 line-through decoration-red-800/30">
                                      {mistakeBlock.original}
                                    </span>
                                    <span className="bg-green-50 text-green-800 font-medium">
                                      {mistakeBlock.improvement}
                                    </span>
                                  </React.Fragment>
                                );
                              }
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col ">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-[16px] text-[#0DAA94]">
                        A better version of your response
                      </h4>
                    </div>
                    <div className="relative">
                      <div className={"relative "}>
                        <div className="prose prose-base max-w-none prose-blue text-slate-700 whitespace-pre-line prose-p:mb-0 prose-p:mt-0">
                          <div>
                            <div
                              dangerouslySetInnerHTML={{
                                __html: (answer?.result?.betterVersion || "")
                                  .replace(/\n/g, "<br />")
                                  .replace(
                                    /\*\*(.*?)\*\*/g,
                                    "<strong>$1</strong>"
                                  ),
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 mb-10">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-[16px] text-[#F27059]">
                        How to improve the score?
                      </h4>
                    </div>
                    <div className="relative">
                      <div className={"relative "}>
                        <div className="prose prose-base max-w-none prose-blue prose-blockquote:border-l-4 prose-blockquote:border-gray-200 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:mb-8 prose-blockquote:mt-0 prose-p:mb-2 prose-p:mt-0  prose-h4:mb-0 prose-h4:mt-2 prose-h4:text-[14px] prose-h4:font-extrabold prose-h4:text-slate-950 text-slate-700">
                          <div
                            dangerouslySetInnerHTML={{
                              __html: (answer?.result?.feedback || "")
                                .replace(/<\/?feedback>/g, "")
                                .replace(/\n/g, "<br />")
                                .replace(
                                  /\*\*(.*?)\*\*/g,
                                  "<strong>$1</strong>"
                                ),
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Accordion.Content>
      </Accordion.Item>
    </Accordion.Root>
  );
};

export default WritingResultView;
