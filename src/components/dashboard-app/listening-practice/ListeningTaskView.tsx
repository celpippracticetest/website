"use client";

import { useEffect } from "react";
import { TPracticeDto, TPracticeNavItem } from "@/models/practice.model";
import { useSearchParams } from "next/navigation";
import { TTaskSchemaDto } from "@/models/tasks.model";
import { useRouter } from "nextjs-toploader/app";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import SvgCheckSquare from "@/components/icons/CheckSquare";
import SvgLock from "@/components/icons/Lock";
import SvgConfirmCheck from "@/components/icons/ConfirmCheck";
import { categoryToSkillRoute, practicePath } from "@/lib/practiceRoutes";

type PracticeListItem = TPracticeNavItem | Pick<TPracticeDto, "id" | "name" | "isFree" | "title">;

function practiceLabel(p: PracticeListItem): string {
  const title = "title" in p ? p.title?.trim() : undefined;
  return title || p.name?.trim() || "Practice";
}

function truncateLabel(label: string, maxWords: number): { text: string; showEllipsis: boolean } {
  const words = label.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) {
    return { text: label, showEllipsis: false };
  }
  return { text: words.slice(0, maxWords).join(" "), showEllipsis: true };
}

interface ListeningTaskViewProps {
  allPractices: PracticeListItem[];
  completedPractice: string[];
  task: TTaskSchemaDto;
  title: string;
  /** Path-based task picker (`/{skill}/{taskId}`); falls back to `?taskId=`. */
  selectedTaskId?: string | null;
  /** When true, page already rendered an SSR h1 (avoids duplicate headings). */
  hideHeader?: boolean;
}

const ListeningTaskView = ({
  allPractices,
  task,
  completedPractice,
  title,
  selectedTaskId: selectedTaskIdProp,
  hideHeader = false,
}: ListeningTaskViewProps) => {
  const router = useRouter();
  const { user, isLoaded } = useHybridWebUser();

  const searchParams = useSearchParams();
  const selectedTaskId = selectedTaskIdProp ?? searchParams.get("taskId");

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
              {title} - {(task.taskNumber ?? "").replace("Task #", "Part")}
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
            allPractices.map((p, index: number) => {
              const label = practiceLabel(p);
              const words = label.split(/\s+/).filter(Boolean);
              const mobileMax = words.includes("a") ? 4 : 3;
              const mobile = truncateLabel(label, mobileMax);
              const desktop = truncateLabel(label, 5);

              return (
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
                  {index + 1}. {mobile.text}
                  {words.length > 5 ? "..." : ""}
                </div>
                <div className="hidden grow text-sm font-normal leading-6 screen744:!flex">
                  {index + 1}. {desktop.text}
                  {words.length > 4 ? "..." : ""}
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
            );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default ListeningTaskView;
