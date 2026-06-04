"use client";

import { TExamSchemaDto } from "@/models/exam.model";
import { useSelectedExam } from "@/store/useSelectedExam.store";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import { useRouter } from "nextjs-toploader/app";
import { useMemo, useState } from "react";
import LoginModal from "@/components/modal/LoginModal";
import PremiumPlanModalClassic from "@/components/ui-variants/classic/landing/PremiumPlanModalClassic";
import { Box } from "@/components/ui/Box";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import {
  hasMockExamAccess,
  normalizeMockExamIdForAccess,
  normalizePlan,
} from "@/lib/subscriptionAccess";

const examSections = [
  { label: "Complete Test", partId: 1 },
  { label: "Listening", partId: 1, section: "listening" },
  { label: "Reading", partId: 7, section: "reading" },
  { label: "Writing", partId: 11, section: "writing" },
  { label: "Speaking", partId: 13, section: "speaking" },
] as const;

export type ExamOverviewClassicProps = {
  exams: TExamSchemaDto[];
  showUserProgress: boolean;
  rscUserAccessSnapshot?: { purchasedMockExamIds?: unknown };
};

export default function ExamOverviewClassic({
  exams,
  showUserProgress,
  rscUserAccessSnapshot,
}: ExamOverviewClassicProps) {
  const router = useRouter();
  const { user, isLoaded, isSignedIn } = useHybridWebUser();
  const noUser = isLoaded ? !isSignedIn : false;
  const plan = user?.publicMetadata?.plan as string | undefined;
  const purchaseDate = user?.publicMetadata?.purchaseDate as string | undefined;
  const fromClient = user?.publicMetadata?.purchasedMockExamIds;
  const purchasedMockExamIds =
    fromClient !== undefined && fromClient !== null
      ? fromClient
      : rscUserAccessSnapshot?.purchasedMockExamIds;

  const signedInFreeUser =
    isLoaded && isSignedIn && (!plan || normalizePlan(plan) === "free");

  const firstReadyExamId = useMemo(() => {
    if (exams.length === 0) return null;
    let best = exams[0];
    for (let i = 1; i < exams.length; i++) {
      const e = exams[i];
      const bo = best.order ?? 0;
      const eo = e.order ?? 0;
      if (eo < bo) {
        best = e;
      } else if (eo === bo) {
        const bid = normalizeMockExamIdForAccess(best.id) ?? String(best.id);
        const eid = normalizeMockExamIdForAccess(e.id) ?? String(e.id);
        if (eid.localeCompare(bid, undefined, { sensitivity: "base" }) < 0) {
          best = e;
        }
      }
    }
    return best.id;
  }, [exams]);

  const effectiveSignedIn = !isLoaded
    ? Boolean(rscUserAccessSnapshot && showUserProgress)
    : isSignedIn;

  const mockExamUnlocked = (exam: TExamSchemaDto) =>
    Boolean(
      effectiveSignedIn &&
        hasMockExamAccess(
          plan,
          purchaseDate,
          exam.id,
          firstReadyExamId,
          purchasedMockExamIds,
        ),
    );

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  const { setSelectedExam } = useSelectedExam();

  const navigateToExamPart = (
    exam: TExamSchemaDto,
    partId: number,
    section?: string,
  ) => {
    setSelectedExam(exam.name);
    const attemptId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const query = section
      ? `?section=${section}&attemptId=${attemptId}`
      : `?attemptId=${attemptId}`;
    router.push(`/exams/exam_${exam.id}/part${partId}${query}`);
  };

  const handleStart = (
    exam: TExamSchemaDto,
    partId: number,
    section?: string,
  ) => {
    if (!isLoaded) return;

    if (noUser) {
      setShowLoginModal(true);
      return;
    }

    if (!mockExamUnlocked(exam)) {
      if (signedInFreeUser) {
        setPricingModalOpen(true);
        return;
      }
      router.push("/pricing");
      return;
    }

    navigateToExamPart(exam, partId, section);
  };

  return (
    <>
      {noUser && showLoginModal ? (
        <LoginModal setShowLoginModal={setShowLoginModal} />
      ) : null}
      <PremiumPlanModalClassic
        open={pricingModalOpen}
        onOpenChange={setPricingModalOpen}
      />

      <div className="flex w-full flex-col gap-4">
        <div className="flex w-full flex-wrap gap-[16px] pb-[10px]">
          {exams.map((exam, i) => (
            <Box
              key={`${exam.id}-${i}`}
              className="flex h-[124px] min-w-[calc(50%-8px)] max-w-full grow basis-0 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[12px] bg-white screen744:min-w-[calc(25%-12px)] screen744:max-w-[calc(25%-12px)] hover:shadow-md transition-shadow"
            >
              <div className="flex w-full flex-col items-center justify-center gap-[16px] px-2">
                <p className="w-full text-center font-medium text-[#37465C]">
                  {exam.name}
                </p>
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <div className="flex h-[40px] w-[112px] cursor-pointer items-center justify-center rounded-[24px] bg-[#F3F2F2] text-[14px] text-[#76808F] transition-colors hover:!bg-[#4A7DFF] hover:!text-white">
                        Start <ChevronDown className="ml-1 h-4 w-4" />
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="w-48 bg-white">
                      {examSections.map((skill) => (
                        <DropdownMenuItem
                          key={skill.label}
                          onClick={() =>
                            handleStart(exam, skill.partId, skill.section)
                          }
                          className="cursor-pointer"
                        >
                          {skill.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </Box>
          ))}
        </div>
      </div>
    </>
  );
}
