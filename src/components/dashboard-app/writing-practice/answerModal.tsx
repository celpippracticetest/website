"use client";
import CircularSkillProgress from "@/components/shared/CircularSkillProgress";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import React from "react";
import { useState } from "react";

const WritingAnswerModal = ({
  isAnswerModalOpen,
  setAnswerModalOpen,
  result,
}: {
  isAnswerModalOpen: boolean;
  setAnswerModalOpen: (isOpen: boolean) => void;
  result: Record<string, any> | null;
}) => {
  const [onlyShowCorrect, setOnlyShowCorrect] = useState(false);

  const skillScores = {
    coherence: result ? result.result.contentAndCoherence : 0, // Green (high)
    vocabulary: result ? result.result.vocabulary : 0, // Yellow (medium)
    readability: result ? result.result.readabilityAndGrammar : 0, // Orange (low-medium)
    fulfillment: result ? result.result.taskFulfillment : 0, // Red (low)
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

  const scoreDetails = getScoreDescription(result ? result.result.overall : 0);

  return (
    <div>
      {isAnswerModalOpen && (
        <div
          onClick={() => {
            setAnswerModalOpen(false);
          }}
          className="fixed inset-0 z-50 bg-stone-300/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 transition-all duration-300"
        ></div>
      )}
      {isAnswerModalOpen && (
        <div
          role="dialog"
          id="radix-:rsm:"
          aria-describedby="radix-:rso:"
          aria-labelledby="radix-:rsn:"
          data-state="open"
          className="fixed z-50 gap-4 bg-background shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500 inset-y-0 right-0 h-full border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-[550px] w-full max-w-[90vw] flex flex-col p-0 overflow-y-auto"
          tabIndex={-1}
          style={{ pointerEvents: "auto" }}
        >
          <p className="text-[14px] text-muted-foreground border-slate-300 p-6 pb-28 flex flex-col gap-4">
            <button
              type="button"
              className="rounded-sm flex items-center gap-2 text-gray-800 outline-none mb-4"
              onClick={() => {
                setAnswerModalOpen(false);
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                className="lucide lucide-arrow-left h-5 w-5"
              >
                <path d="m12 19-7-7 7-7"></path>
                <path d="M19 12H5"></path>
              </svg>
              <span className="text-[14px] font-medium">Back</span>
            </button>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  className="lucide lucide-circle-user w-5 h-5 text-slate-400"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <circle cx="12" cy="10" r="3"></circle>
                  <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"></path>
                </svg>
                <h4 className="font-semibold text-lg text-slate-700">
                  Your Response
                </h4>
              </div>
              <p className="text-slate-700 whitespace-pre-line leading-6">
                {result ? result.text : "Something happened..."}
              </p>
            </div>

            <div className="overflow-hidden border rounded-lg">
              {/* Header section with main score */}
              <div className="p-6 pb-8 border-b flex flex-col md:flex-row items-center md:items-start gap-6">
                <div className="w-40 flex-shrink-0">
                  <CircularSkillProgress
                    label="Score"
                    score={overallScore}
                    maxScore={maxScore}
                  />
                </div>

                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    {scoreDetails.title}
                  </h2>
                  <p className="text-gray-600">{scoreDetails.description}</p>
                </div>
              </div>

              {/* Skills breakdown table */}
              <Table>
                <TableBody>
                  <TableRow className="border-b-0">
                    <TableCell className="p-0">
                      <div className="p-6 flex flex-col items-center justify-center border-r h-full">
                        <CircularSkillProgress
                          label="Coherence"
                          score={skillScores.coherence}
                          maxScore={maxScore}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="p-0">
                      <div className="p-6 flex flex-col items-center justify-center border-r h-full">
                        <CircularSkillProgress
                          label="Vocabulary"
                          score={skillScores.vocabulary}
                          maxScore={maxScore}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="p-0">
                      <div className="p-6 flex flex-col items-center justify-center border-r h-full">
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
            <div className="flex flex-col gap-2 mb-10 ">
              <div className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  className="lucide lucide-triangle-alert w-5 h-5 text-rose-400"
                >
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"></path>
                  <path d="M12 9v4"></path>
                  <path d="M12 17h.01"></path>
                </svg>
                <h4 className="font-bold text-lg text-slate-900">
                  Your Mistakes
                </h4>
              </div>
              <div className="prose prose-base max-w-none prose-blue text-slate-700">
                <span className="text-slate-700">
                  {result?.result.grammarMistakes.map(
                    (mistakeBlock: any, index: number) => {
                      if (mistakeBlock.improvement == null) {
                        return (
                          <span key={index} className="text-slate-700">
                            {" "}
                            {mistakeBlock.original}{" "}
                          </span>
                        );
                      } else {
                        if (onlyShowCorrect) {
                          return (
                            <span key={index} className="text-slate-700">
                              {" "}
                              {mistakeBlock.improvement}{" "}
                            </span>
                          );
                        }
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
              <button
                onClick={() => {
                  setOnlyShowCorrect(!onlyShowCorrect);
                }}
                className="inline-flex items-center justify-center whitespace-nowrap font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 rounded-md px-3 text-xs text-slate-700 mt-2 w-fit"
              >
                {onlyShowCorrect
                  ? "Show Difference"
                  : "Show only the correct version"}
              </button>
            </div>
            <div className="flex flex-col gap-2 mb-10">
              <div className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  className="lucide lucide-sparkles w-5 h-5 text-blue-400"
                >
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path>
                  <path d="M5 3v4"></path>
                  <path d="M19 17v4"></path>
                  <path d="M3 5h4"></path>
                  <path d="M17 19h4"></path>
                </svg>
                <h4 className="font-bold text-lg text-slate-900">
                  A better version of your response
                </h4>
              </div>
              <div className="prose prose-base max-w-none prose-blue text-slate-700">
                <div>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: result?.result.betterVersion
                        .replace(/\n/g, "<br />")
                        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>"),
                    }}
                  ></div>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 mb-10">
              <div className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  className="lucide lucide-graduation-cap w-5 h-5 text-teal-400"
                >
                  <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"></path>
                  <path d="M22 10v6"></path>
                  <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"></path>
                </svg>
                <h4 className="font-bold text-lg text-slate-900">
                  How to improve the score?
                </h4>
              </div>
              <div className="prose prose-base max-w-none prose-blue prose-blockquote:border-l-4 prose-blockquote:border-gray-200 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:mb-8 prose-blockquote:mt-0 prose-p:mb-2 prose-p:mt-0  prose-h4:mb-0 prose-h4:mt-2 prose-h4:text-[14px] prose-h4:font-extrabold prose-h4:text-slate-950 text-slate-700">
                <div
                  dangerouslySetInnerHTML={{
                    __html: result?.result.feedback
                      .replace(/<\/?feedback>/g, "")
                      .replace(/\n/g, "<br />")
                      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>"),
                  }}
                ></div>
              </div>
            </div>
          </p>
        </div>
      )}
    </div>
  );
};

export default WritingAnswerModal;
