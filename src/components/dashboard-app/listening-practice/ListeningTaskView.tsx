"use client";

import { useEffect, useState } from "react";
import { TPracticeDto } from "@/models/practice.model";
import { useSearchParams } from "next/navigation";
import { TTaskSchemaDto } from "@/models/tasks.model";
import { useRouter } from "nextjs-toploader/app";
import { useUser } from "@clerk/nextjs";
import SvgCheckSquare from "@/components/icons/CheckSquare";
import SvgLock from "@/components/icons/Lock";
import SvgCheckCircle from "@/components/icons/CheckCircle";
import SvgConfirmCheck from "@/components/icons/ConfirmCheck";

interface ListeningTaskViewProps {
  allPractices: TPracticeDto[];
  completedPractice: string[];
  task: TTaskSchemaDto;
  title: string;
}

const ListeningTaskView = ({
  allPractices,
  task,
  completedPractice,
  title,
}: ListeningTaskViewProps) => {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [hasMounted, setHasMounted] = useState(false);

  const searchParams = useSearchParams();
  const selectedTaskId = searchParams.get("taskId");

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!selectedTaskId) {
      router.push("/practice-overview");
    }
  }, [selectedTaskId, router]);

  if (
    !hasMounted ||
    !isLoaded ||
    (user && user.publicMetadata?.plan === undefined)
  ) {
    return <div className="text-center py-10 text-gray-500">Loading...</div>;
  }
  return (
    <div className="animate-fadeIn space-y-6 md:space-y-8">
      <div className="max-w-xl mx-auto w-full ">
        <div className="flex flex-col pt-[24px] px-[24px]">
          <p className="font-normal text-[#76808F] text-[14px] ">
            {title} - {task.taskNumber.replace("Task #", "Part")}
          </p>
          <h1 className="text-[16px] leading-[20px] text-[#212E42] font-semibold tracking-wide pt-[8px]">
            {task.name}
          </h1>
        </div>
        <div className="flex flex-wrap gap-[8px] justify-start pt-[24px] px-[24px]">
          {allPractices.map((p: TPracticeDto, index: number) => (
            <a
              key={p.id || index}
              className="flex w-full gap-[4px] bg-white h-[48px] items-center justify-start p-[12px] shadow-[0px_4px_10px_0px_#0000000F] rounded-[12px] cursor-pointer relative"
              href={`/${task.category.toLowerCase()}?selectedPracticeId=${
                p.id
              }&taskId=${task.id}`}
            >
              {completedPractice.includes(p.id) ? (
                <SvgConfirmCheck />
              ) : (
                <SvgCheckSquare />
              )}

              <div className="flex screen744:!hidden text-[14px] font-normal  leading-[24px] grow">
                {index + 1}.{" "}
                {p.title
                  .split(" ")
                  .slice(0, p.title.split(" ").includes("a") ? 4 : 3)
                  .join(" ")}
                {p.title.split(" ").length > 5 ? "..." : ""}
              </div>
              <div className="hidden screen744:!flex text-[14px] font-normal  leading-[24px] grow">
                {index + 1}. {p.title.split(" ").slice(0, 5).join(" ")}
                {p.title.split(" ").length > 4 ? "..." : ""}
              </div>
              {((user &&
                user.publicMetadata.plan &&
                user.publicMetadata.plan === "free") ||
                !user) &&
                (p.isFree ? (
                  <div className="flex shrink-0 bg-[#F0FFFD] rounded-[24px] text-[12px] justify-center items-center px-[16px] py-[8px]">
                    <span className="text-[12px] font-medium text-[#0DAA94]">
                      Free
                    </span>
                  </div>
                ) : (
                  <SvgLock className="shrink-0" />
                ))}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ListeningTaskView;
