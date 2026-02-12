import ExamOverview from "@/components/dashboard-app/examOverview";
import mongoClient from "@/lib/mongodb";
import { ExamRepository } from "@/repositories/exams.repo";
import { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";
import { Box } from "@/components/ui/Box";
import ExamFAQ, { FAQ_DATA } from "@/components/dashboard-app/ExamFAQ";

export async function generateMetadata(): Promise<Metadata> {
  const appBaseUrl = process.env.APP_BASE_URL || "";
  const isPreview = appBaseUrl.includes("vercel.app");
  return {
    title:
      "CELPIP Practice Tests – Full Mock Exams Online | CELPIP Practice Test",
    description:
      "Prepare for the CELPIP exam with realistic full-length practice tests in the official test format. Start a CELPIP mock exam and prepare with confidence.",
    alternates: {
      canonical: "https://celpippracticetest.com/exam-overview",
    },
    robots: {
      index: !isPreview,
      follow: !isPreview,
    },
  };
}

const ExamsPage = async () => {
  const exampRepo = new ExamRepository(mongoClient);
  const result = await exampRepo.getAllExam({ isReady: true }, 0, 1000);
  const user = await currentUser();
  const noUser = !user;

  return (
    <main
      className={`w-full pt-[24px] mx-auto max-w-[1280px] px-[16px] screen744:!px-0`}
    >
      {noUser ? (
        <Box className="w-full flex flex-col items-center justify-center text-center mb-8 gap-4 px-4">
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                mainEntity: FAQ_DATA.map((faq) => ({
                  "@type": "Question",
                  name: faq.question,
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: faq.answer,
                  },
                })),
              }),
            }}
          />
          <h1 className="text-[32px] pt-[20px] screen744:pt-0 leading-[40px] screen744:text-[48px] screen744:leading-[56px] font-bold text-[#37465C]">
            CELPIP Practice Tests – Full Mock Exams Online
          </h1>
          <h2 className="text-[18px] leading-[28px] screen744:text-[24px] screen744:leading-[32px] font-medium text-[#37465C] max-w-[800px]">
            Prepare for the CELPIP exam with realistic full-length practice tests in the official test format.
          </h2>
          <p className="text-[16px] leading-[24px] text-[#526071] max-w-[900px]">
            Practice for the CELPIP exam with full-length mock tests designed to match the real exam structure. Each practice test includes listening, reading, writing, and speaking sections with authentic timing and question types. Start a CELPIP mock exam and prepare with confidence.
          </p>
        </Box>
      ) : (
        <h1 className="text-2xl font-bold text-[#37465C] mb-4 text-center screen744:text-left">
          CELPIP Mock Exams
        </h1>
      )}

      <ExamOverview exams={result.items} />

      {noUser && (
        <Box className="w-full mt-10 mb-6 px-4 py-6 rounded-[16px] bg-white border border-[#E5EAF3]">
          <h2 className="text-[24px] leading-[32px] font-semibold text-[#37465C]">
            How to use CELPIP mock exams effectively
          </h2>
          <p className="mt-3 text-[16px] leading-[26px] text-[#526071]">
            Full-length CELPIP practice tests are best used as checkpoints, not only as final
            drills. Simulate real timing, complete all sections in one sitting, and review your
            weakest question types immediately after each exam.
          </p>
          <p className="mt-3 text-[16px] leading-[26px] text-[#526071]">
            Track score trends across multiple mock exams to identify whether your listening
            accuracy, reading speed, writing organization, and speaking fluency are improving.
            Consistent review between tests is what moves your score.
          </p>
        </Box>
      )}

      {noUser && <ExamFAQ />}
    </main>
  );
};

export default ExamsPage;
