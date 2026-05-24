"use client";

import { useEffect } from "react";
import { TPracticeDto } from "@/models/practice.model";
import { useSearchParams } from "next/navigation";
import { TTaskSchemaDto } from "@/models/tasks.model";
import { useRouter } from "nextjs-toploader/app";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import SvgCheckSquare from "@/components/icons/CheckSquare";
import SvgLock from "@/components/icons/Lock";
import SvgConfirmCheck from "@/components/icons/ConfirmCheck";
import { categoryToSkillRoute, practicePath } from "@/lib/practiceRoutes";

interface ListeningTaskViewProps {
  allPractices: TPracticeDto[];
  completedPractice: string[];
  task: TTaskSchemaDto;
  title: string;
  /** When true, page already rendered an SSR h1 (avoids duplicate headings). */
  hideHeader?: boolean;
}

const ListeningTaskView = ({
  allPractices,
  task,
  completedPractice,
  title,
  hideHeader = false,
}: ListeningTaskViewProps) => {
  const router = useRouter();
  const { user, isLoaded } = useHybridWebUser();

  const searchParams = useSearchParams();
  const selectedTaskId = searchParams.get("taskId");

  useEffect(() => {
    if (!selectedTaskId) {
      router.push("/practice-overview");
    }
  }, [selectedTaskId, router]);

  const showPlanLoading =
    isLoaded && user && user.publicMetadata?.plan === undefined;

  return (
    <div className="animate-fadeIn space-y-6 md:space-y-8">
      <div className="mx-auto w-full max-w-xl">
        {!hideHeader && (
          <div className="flex flex-col px-6 pt-6">
            <p className="text-sm font-normal text-[#76808F]">
              {title} - {task.taskNumber.replace("Task #", "Part")}
            </p>
            <h2 className="pt-2 text-base font-semibold leading-5 tracking-wide text-[#212E42]">
              {task.name}
            </h2>
          </div>
        )}
        <div className="flex flex-wrap justify-start gap-2 px-6 pt-6">
          {showPlanLoading ? (
            <div className="w-full py-6 text-center text-sm text-[#76808F]">
              Loading…
            </div>
          ) : (
            allPractices.map((p: TPracticeDto, index: number) => (
              <a
                key={p.id || index}
                className="relative flex h-12 w-full cursor-pointer items-center justify-start gap-1 rounded-xl bg-white p-3 shadow-[0px_4px_10px_0px_#0000000F]"
                href={practicePath(
                  categoryToSkillRoute(task.category),
                  p.id,
                  task.id
                )}
              >
                {completedPractice.includes(p.id) ? (
                  <SvgConfirmCheck />
                ) : (
                  <SvgCheckSquare />
                )}

                <div className="flex grow text-sm font-normal leading-6 screen744:!hidden">
                  {index + 1}.{" "}
                  {p.title
                    .split(" ")
                    .slice(0, p.title.split(" ").includes("a") ? 4 : 3)
                    .join(" ")}
                  {p.title.split(" ").length > 5 ? "..." : ""}
                </div>
                <div className="hidden grow text-sm font-normal leading-6 screen744:!flex">
                  {index + 1}. {p.title.split(" ").slice(0, 5).join(" ")}
                  {p.title.split(" ").length > 4 ? "..." : ""}
                </div>
                {isLoaded &&
                  ((user &&
                    user.publicMetadata.plan &&
                    user.publicMetadata.plan === "free") ||
                    !user) &&
                  (p.isFree ? (
                    <div className="flex shrink-0 items-center justify-center rounded-3xl bg-[#F0FFFD] px-4 py-2 text-xs">
                      <span className="text-xs font-medium text-[#0DAA94]">
                        Free
                      </span>
                    </div>
                  ) : (
                    <SvgLock className="shrink-0" />
                  ))}
              </a>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ListeningTaskView;
