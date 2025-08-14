import SvgArrowRight from "@/components/icons/ArrowRight";
import SvgChevronDownExam from "@/components/icons/ChevronDownExam";
import { TListeningAndReadingAnswerDto } from "@/models/answer";
import { TExamPartSchemaDto } from "@/models/examParts.model";
import { TQuestion } from "@/models/question.model";
import { Accordion } from "radix-ui";
import * as React from "react";

const parts = [
  "Problem Solving",
  "A Daily life conversation",
  "Information",
  "News Item",
  "Discussion",
  "Viewpoints",
  "Correspondence",
  "Apply a Diagram",
  "Information",
  "Viewpoints",
  "Writing an Email",
  "Survey Questions",
  "Giving Advice",
  "Talking about personal experience",
  "Describing a Scene",
  "Making predictions",
  "Comparing and Persuading",
  "Dealing with a difficult situation",
  "Expressing opinions",
  "Describing an unusual situation",
];

const ListeningResultView = ({
  examPart,
  answer: userAnswer,
}: {
  examPart: TExamPartSchemaDto | undefined;
  answer: TListeningAndReadingAnswerDto | undefined;
}) => {
  const allQuestions: any = examPart?.passages.reduce(
    (questions, passage: any) => {
      return questions.concat(passage.questions);
    },
    []
  );

  const numberOfCorrect = allQuestions.filter(
    (q: any, index: number) =>
      userAnswer?.answers[index] && q.answer === userAnswer?.answers[index]
  ).length;

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
                {examPart?.partId && parts[examPart?.partId - 1]}
              </span>
              <span className="text-[#212E42] px-[12px] rounded-[24px] flex items-center text-[11px] font-medium  h-[24px] border border-[#D5D6D8]">
                {numberOfCorrect}/{allQuestions ? allQuestions.length : "0"}{" "}
                correct
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
          <div className="p-4 border-t border-gray-300 bg-white">
            <div className=" gap-6 text-[14px] font-medium">
              {allQuestions?.map((question: TQuestion, index: number) => (
                <React.Fragment key={index}>
                  <div key={index} className="flex flex-col gap-2 col-span-3">
                    <div className="flex flex-col gap-[12px]">
                      <div className="py-1 w-full flex gap-[12px]">
                        <span className="text-[#37465C] text-[16px] font-normal">
                          Question{index + 1}: {question.question}
                        </span>
                        <span
                          className={`ml-2 flex shrink-0 items-center rounded-[24px] font-semibold h-[24px] text-[11px] ${
                            !userAnswer?.answers[index]
                              ? "text-[#212E42] bg-[#E6E6E6] px-[12px]"
                              : userAnswer.answers[index] === question.answer
                              ? "text-[#0DAA94] bg-[#F0FFFD] px-[12px]"
                              : "text-[#EE4266] bg-[#FFE2E8] px-[12px]"
                          }`}
                        >
                          {!userAnswer?.answers[index]
                            ? "Not Answered"
                            : userAnswer.answers[index] === question.answer
                            ? "Correct"
                            : "Wrong"}
                        </span>
                      </div>
                      <div className=" w-full text-[#212E42]">
                        <span className="font-medium text-[#0DAA94] text-[16px]">
                          Correct answer:
                        </span>{" "}
                        {(() => {
                          const found = question.choices.find(
                            (answer) =>
                              answer.id && answer.id === question.answer
                          );
                          return found ? found.text : "";
                        })()}
                      </div>
                      <div className="py-1 w-full">
                        <span className="font-medium text-[#EE4266] text-[16px]">
                          Your answer:
                        </span>{" "}
                        <span
                          className={
                            userAnswer?.answers[index] === question.answer
                              ? "text-green-700"
                              : "text-rose-700"
                          }
                        >
                          {(() => {
                            if (!userAnswer?.answers[index]) {
                              return "";
                            }
                            const found = question.choices.find(
                              (answer) =>
                                answer.id &&
                                answer.id === userAnswer?.answers[index]
                            );
                            return found ? found.text : "";
                          })()}
                        </span>
                      </div>
                    </div>
                    {question.description && (
                      <div className="flex pl-[16px]  rounded-[8px] text-[#5786FF] items-center h-[40px] bg-[#F2F6FF] text-[16px] font-medium  overflow-x-auto whitespace-nowrap">
                        {question.description}
                      </div>
                    )}
                  </div>

                  {index != allQuestions.length - 1 && (
                    <div className="h-[1px] bg-[#D5D6D8] my-[16px]"></div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </Accordion.Content>
      </Accordion.Item>
    </Accordion.Root>
  );
};

export default ListeningResultView;
