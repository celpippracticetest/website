"use client";

import ListeningResultView from "./ListeningResultView";
import ReadingResultView from "./ReadingResultView";
import WritingResultView from "./WritingResultView";
import SpeakingResultView from "./SpeakingResultView";
import { TExamPartSchemaDto } from "@/models/examParts.model";
import { TListeningAndReadingAnswerDto } from "@/models/answer";
import { TExamSchemaDto } from "@/models/exam.model";
import { useRouter } from "nextjs-toploader/app";
import { useUser } from "@clerk/nextjs";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AskBeavoButton from "@/components/AskBeavo/AskBeavoButton";

function scaleToBand(weightedPercent: number): number {
  return Math.ceil((weightedPercent / 100) * 12);
}

const ResultExamView = ({
  exams,
  examParts,
  answers,
  speakingAndWritingAnswers,
}: {
  exams: TExamSchemaDto;
  examParts: TExamPartSchemaDto[];
  answers: (TListeningAndReadingAnswerDto & { overalScore?: number })[];
  speakingAndWritingAnswers: any;
}) => {
  const route = useRouter();

  const { user, isLoaded } = useUser();
  const listeningAverage = (() => {
    const average = Array.from({ length: 6 })
      .map((_, index) => {
        const userAnswer = answers.find((a) => a.partId == index + 1);
        if (
          !userAnswer ||
          !userAnswer.answers ||
          Object.keys(userAnswer.answers).length === 0
        )
          return 0;
        const examPart = examParts.find((e) => e.partId == index + 1);
        const allQuestions = examPart?.passages.reduce(
          (questions: any, passage) => {
            return questions.concat(passage.questions);
          },
          []
        );
        const numberOfCorrect = allQuestions.filter(
          (q: any, index: any) =>
            userAnswer?.answers[index] &&
            q.answer === userAnswer?.answers[index]
        ).length;
        const percentage = (numberOfCorrect / allQuestions.length) * 100;

        return (
          percentage *
          [15 / 100, 15 / 100, 20 / 100, 15 / 100, 15 / 100, 20 / 100][index]
        );
      })
      .reduce((sum, a) => sum + a, 0);

    return scaleToBand(average);
  })();
  const readingAverage = (() => {
    const average = Array.from({ length: 4 })
      .map((_, index) => {
        const userAnswer = answers.find((a) => a.partId == index + 7);
        if (
          !userAnswer ||
          !userAnswer.answers ||
          Object.keys(userAnswer.answers).length === 0
        )
          return 0;
        const examPart = examParts.find((e) => e.partId == index + 7);
        const allQuestions = examPart?.passages.reduce(
          (questions: any, passage: any) => {
            return questions.concat(passage.questions);
          },
          []
        );
        const numberOfCorrect = allQuestions.filter(
          (q: any, index: any) =>
            userAnswer?.answers[index] &&
            q.answer === userAnswer?.answers[index]
        ).length;
        const percentage = (numberOfCorrect / allQuestions.length) * 100;
        return percentage * [20 / 100, 20 / 100, 30 / 100, 30 / 100][index];
      })
      .reduce((sum, a) => sum + a, 0);

    return scaleToBand(average);
  })();

  const writingAverage = (() => {
    const tasks = [
      { partId: 11, weight: 0.5 },
      { partId: 12, weight: 0.5 },
    ];
    const weightedPercent = tasks
      .map(({ partId, weight }) => {
        const ans = speakingAndWritingAnswers.find(
          (a: any) => a.partId === partId
        );
        return ((ans?.overalScore ?? 0) / 12) * 100 * weight;
      })
      .reduce((sum, p) => sum + p, 0);
    return scaleToBand(weightedPercent);
  })();

  const speakingAverage = (() => {
    const sectionCount = 8;
    const weight = 1 / sectionCount;

    const weightedPercent = Array.from({ length: sectionCount })
      .map((_, i) => {
        const partId = 13 + i;
        const ans = speakingAndWritingAnswers.find(
          (a: any) => a.partId === partId
        );

        return ((ans?.overalScore ?? 0) / 12) * 100 * weight;
      })
      .reduce((sum, p) => sum + p, 0);
    return scaleToBand(weightedPercent);
  })();

  if (isLoaded && (!user || (user && user.publicMetadata.plan !== "premium"))) {
    route.push("exam-overview");
  }
  return (
    <div className=" mx-auto w-full flex flex-col bg-white  rounded-[8px]">
      <div className=" gap-[10px] text-[#212E42] px-[24px] flex items-center bg-[#FFEBD6] h-[56px] rounded-tl-[8px] rounded-tr-[8px]  text-[18px] font-bold">
        Answers & Score
        <div className="flex  screen1280:!hidden">
          <AskBeavoButton />
        </div>
      </div>

      <div className="px-[16px] screen744:!px-[24px] mt-[24px]">
        <Tabs defaultValue="listening" className="w-full pb-[100px] ">
          <TabsList className="screen744:!grid grid-cols-4 flex justify-start shrink-0 overflow-x-auto px-[8px] w-full gap-[0]">
            <TabsTrigger
              className="max-w-[160px]  screen744:!max-w-full shrink-0"
              value="listening"
            >
              Listening
            </TabsTrigger>
            <TabsTrigger
              className="max-w-[160px]  screen744:!max-w-full shrink-0"
              value="reading"
            >
              Reading
            </TabsTrigger>
            <TabsTrigger
              className="max-w-[160px]  screen744:!max-w-full shrink-0"
              value="writing"
            >
              Writing
            </TabsTrigger>
            <TabsTrigger
              className="max-w-[160px]  screen744:!max-w-full shrink-0"
              value="speaking"
            >
              Speaking
            </TabsTrigger>
          </TabsList>

          <TabsContent value="listening">
            <div className=" bg-white">
              <div className="flex justify-between bg-white items-center">
                <div className="flex items-center bg-white">
                  Overal Score:{" "}
                  <span
                    className={`opacity-80 font-black text-4xl ${
                      listeningAverage < 4
                        ? "text-red-500"
                        : listeningAverage > 10
                        ? "text-green-500"
                        : "text-[#F59E0B]"
                    }`}
                  >
                    {listeningAverage}
                  </span>
                  <span className="text-gray-400 font-light text">/12</span>
                </div>
              </div>
              <div className="mt-[10px] space-y-[16px]">
                {Array.from({ length: 6 }).map((_, index) => (
                  <ListeningResultView
                    key={index}
                    examPart={examParts.find((e) => e.partId == index + 1)}
                    answer={answers.find((a) => a.partId == index + 1)}
                  />
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="reading">
            <div className=" bg-white">
              <div className="flex justify-between bg-white items-center">
                <div className="flex items-center bg-white">
                  Overal Score:{" "}
                  <span
                    className={`opacity-80 font-black text-4xl ${
                      readingAverage < 4
                        ? "text-red-500"
                        : readingAverage > 10
                        ? "text-green-500"
                        : "text-[#F59E0B]"
                    }`}
                  >
                    {readingAverage}
                  </span>
                  <span className="text-gray-400 font-light text">/12</span>
                </div>
              </div>
              <div className="mt-[10px] space-y-[16px]">
                {Array.from({ length: 4 }).map((_, index) => (
                  <ReadingResultView
                    key={7 + index}
                    examPart={examParts.find((e) => e.partId == index + 7)}
                    answer={answers.find((a) => a.partId == index + 7)}
                  />
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="writing">
            <div className=" bg-white">
              <div className="flex justify-between bg-white items-center">
                <div className="flex items-center bg-white">
                  Overal Score:{" "}
                  <span
                    className={`opacity-80 font-black text-4xl ${
                      writingAverage < 4
                        ? "text-red-500"
                        : writingAverage > 10
                        ? "text-green-500"
                        : "text-[#F59E0B]"
                    }`}
                  >
                    {writingAverage}
                  </span>
                  <span className="text-gray-400 font-light text">/12</span>
                </div>
              </div>
              <div className="mt-[10px] space-y-[16px]">
                {Array.from({ length: 2 }).map((_, index) => (
                  <WritingResultView
                    key={11 + index}
                    examPart={examParts.find((e) => e.partId == index + 11)}
                  />
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="speaking">
            <div className=" bg-white">
              <div className="flex justify-between bg-white items-center">
                <div className="flex items-center bg-white">
                  Overal Score:{" "}
                  <span
                    className={`opacity-80 font-black text-4xl ${
                      speakingAverage < 4
                        ? "text-red-500"
                        : speakingAverage > 10
                        ? "text-green-500"
                        : "text-[#F59E0B]"
                    }`}
                  >
                    {speakingAverage}
                  </span>
                  <span className="text-gray-400 font-light text">/12</span>
                </div>
              </div>
              <div className="mt-[10px] space-y-[16px]">
                {Array.from({ length: 8 }).map((_, index) => (
                  <SpeakingResultView
                    key={13 + index}
                    examPart={examParts.find((e) => e.partId == index + 13)}
                  />
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ResultExamView;
