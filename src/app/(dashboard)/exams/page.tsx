import type { Metadata } from "next";
import { getHybridCurrentUser } from "@/lib/auth/web-session-server";

export const metadata: Metadata = {
  title: "CELPIP Exam Practice Hub | CELPIP Practice Test",
  description:
    "Explore CELPIP exam preparation resources, skill practice, and full mock exam pathways to improve your score with structured study.",
  alternates: {
    canonical: "https://celpippracticetest.com/exams",
  },
};

const DashboardApp = async () => {
  const hybridUser = await getHybridCurrentUser();
  const user = hybridUser?.user ?? null;

  return (
    <div className="flex flex-col h-screen w-full bg-slate-100">
      <main className="flex-1 overflow-y-auto p-4 md:p-8 h-full   lg:pt-30 md:pt-20 pt-30">
        {!user && (
          <div className="mx-auto max-w-5xl bg-white rounded-[16px] p-6 md:p-8">
            <h1 className="text-[28px] md:text-[36px] font-bold text-[#37465C]">
              CELPIP Exam Practice Hub
            </h1>
            <p className="mt-3 text-[16px] leading-[26px] text-[#526071]">
              Use this section to move from single-skill practice to complete CELPIP mock exams.
              Build consistency in all four skills, then test yourself under real timing conditions
              to estimate exam-day performance more accurately.
            </p>
            <p className="mt-3 text-[16px] leading-[26px] text-[#526071]">
              A practical plan is to rotate skill practice during the week and complete one full
              mock exam at the end of each study cycle. Review mistakes, adjust your strategy, and
              repeat until your target score range is stable.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default DashboardApp;
