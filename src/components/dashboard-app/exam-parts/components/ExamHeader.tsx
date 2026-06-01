import { PRACTICE_PARTS } from "@/constants";
import SvgChevronDownExam from "@/components/icons/ChevronDownExam";
import AskBeavoButton from "@/components/AskBeavo/AskBeavoButton";
import { useRouter, useSearchParams } from "next/navigation";
import React, { forwardRef } from "react";
import Close from "@mui/icons-material/Close";
import { Box, Button, Stack, Typography } from "@mui/material";
import { cn } from "@/lib/utils";
import type { MockExamViewMode } from "./useExamViewMode";
import ExamLayoutToggle from "./ExamLayoutToggle";
import { MOCK_EXAM_GUIDE_REPLAY_EVENT } from "./mockExamGuideTourConstants";
import { sanitizeMockExamAttemptIdParam } from "@/lib/mockExamAttemptId";

interface PracticeSectionItem {
    title: string;
    route: string;
    icon: React.ReactNode;
    color?: string;
    bgColor?: string;
}

const sectionBorderClass: Record<string, string> = {
    listening: "border-primary1/20",
    reading: "border-secondary2/25",
    writing: "border-success/25",
    speaking: "border-error1/20",
};

const sectionPartStyles: Record<
    string,
    { active: string; hover: string; ring: string }
> = {
    listening: {
        active: "border-primary1/40 bg-primary6",
        hover: "hover:border-primary1/30 hover:bg-primary6",
        ring: "focus-visible:ring-primary1/25",
    },
    reading: {
        active: "border-secondary2/40 bg-error5/80",
        hover: "hover:border-secondary2/30 hover:bg-error5/60",
        ring: "focus-visible:ring-secondary2/25",
    },
    writing: {
        active: "border-success/40 bg-success5",
        hover: "hover:border-success/30 hover:bg-success5",
        ring: "focus-visible:ring-success/25",
    },
    speaking: {
        active: "border-error1/35 bg-secondary5",
        hover: "hover:border-error1/25 hover:bg-secondary5",
        ring: "focus-visible:ring-error1/20",
    },
};

interface ExamHeaderProps {
    setShowModal: (show: boolean) => void;
    examId: string | undefined;
    partId: number;
    examName: string | undefined;
    practiceSections: PracticeSectionItem[];
    getPartsForSection: (route: string) => { title: string; index: number }[];
    menuShowModal: boolean;
    examPractice: string;
    examNumber: number | undefined;
    viewMode: MockExamViewMode;
    setViewMode: (mode: MockExamViewMode) => void;
    /** When true, layout toggle is rendered elsewhere (e.g. mock exam sticky toolbar). */
    hideLayoutToggle?: boolean;
}

const ExamHeader = forwardRef<HTMLDivElement, ExamHeaderProps>(
    (
        {
            setShowModal,
            examId,
            partId,
            examName,
            practiceSections,
            getPartsForSection,
            menuShowModal,
            examPractice,
            examNumber,
            viewMode,
            setViewMode,
            hideLayoutToggle = false,
        },
        ref
    ) => {
        const router = useRouter();
        const searchParams = useSearchParams();
        const browserAttemptId = sanitizeMockExamAttemptIdParam(
            searchParams.get("attemptId")
        );
        const currentSection = searchParams.get("section");
        const examLabel = examNumber ?? (examName ?? "").match(/\d+/)?.[0] ?? "";
        const resultsHref = (() => {
            const base = `/exams/exam_${examId}/results?partNumber=part${partId}`;
            if (!browserAttemptId) return base;
            return `${base}&attemptId=${encodeURIComponent(browserAttemptId)}`;
        })();
        const isOfficial = viewMode === "official";

        const openGuideTour = () => {
            if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent(MOCK_EXAM_GUIDE_REPLAY_EVENT));
            }
        };

        const navigateToPart = (nextPartId: number) => {
            const params = new URLSearchParams();
            if (browserAttemptId) params.set("attemptId", browserAttemptId);
            if (currentSection) params.set("section", currentSection);
            const queryString = params.toString() ? `?${params.toString()}` : "";

            setShowModal(false);
            router.push(`/exams/exam_${examId}/part${nextPartId.toString()}${queryString}`);
        };

        const layoutToggleRow = !hideLayoutToggle ? (
            <Box
                id="mock-exam-tour-mode-highlight"
                sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}
            >
                <ExamLayoutToggle viewMode={viewMode} setViewMode={setViewMode} />
                <Button
                    type="button"
                    variant="text"
                    onClick={openGuideTour}
                    sx={{
                        textTransform: "none",
                        fontSize: "0.8125rem",
                        fontWeight: 600,
                        color: "#316BFF",
                        minWidth: "auto",
                        px: 0.75,
                    }}
                >
                    Quick tour
                </Button>
            </Box>
        ) : null;

        return (
            <>
                {menuShowModal && (
                    <div
                        className="fixed inset-0 z-[1300] flex items-center justify-center px-4 py-6 screen744:px-6"
                        role="presentation"
                    >
                        <button
                            type="button"
                            aria-label="Close exam part picker"
                            className="fixed inset-0 bg-text1/40 backdrop-blur-sm"
                            onClick={() => setShowModal(false)}
                        />

                        <div
                            ref={ref}
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="exam-part-picker-title"
                            className="relative flex max-h-[90vh] w-full max-w-[1120px] flex-col overflow-hidden rounded-3xl border border-outline/80 bg-white shadow-[0_28px_80px_rgba(20,29,45,0.18)] animate-in fade-in zoom-in-95 duration-300"
                        >
                            <div className="border-b border-outline/70 bg-[linear-gradient(180deg,#FFFFFF_0%,#F4F7FF_100%)] px-5 py-4 screen744:px-6">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h2
                                            id="exam-part-picker-title"
                                            className="font-body text-xl font-extrabold tracking-tight text-text1 screen744:text-2xl"
                                        >
                                            Choose an exam part
                                        </h2>
                                        <p className="mt-1 text-sm text-text3">
                                            Jump to any section. Your answers and progress stay in place.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        aria-label="Close"
                                        onClick={() => setShowModal(false)}
                                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-outline bg-white text-text2 transition-colors hover:border-primary1/30 hover:bg-primary6 hover:text-text1"
                                    >
                                        <Close sx={{ fontSize: 20 }} />
                                    </button>
                                </div>
                            </div>

                            <div className="overflow-y-auto px-5 py-5 screen744:px-6 screen744:py-6">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 screen1280:grid-cols-4">
                                    {practiceSections.map((sectionItem) => {
                                        const partStyles =
                                            sectionPartStyles[sectionItem.route] ??
                                            sectionPartStyles.listening;
                                        const borderClass =
                                            sectionBorderClass[sectionItem.route] ??
                                            "border-outline/70";

                                        return (
                                            <div
                                                key={sectionItem.title}
                                                className="flex flex-col gap-3"
                                            >
                                                <div
                                                    className={cn(
                                                        "flex min-h-16 items-center justify-center gap-2 rounded-2xl border px-3 py-3",
                                                        sectionItem.bgColor ?? "bg-primary6",
                                                        sectionItem.color ?? "text-text1",
                                                        borderClass
                                                    )}
                                                >
                                                    {sectionItem.icon}
                                                    <span className="font-body text-base font-bold text-text1">
                                                        {sectionItem.title}
                                                    </span>
                                                </div>

                                                <div className="flex flex-col gap-2">
                                                    {getPartsForSection(sectionItem.route).map(
                                                        (p) => {
                                                            const isActive = partId === p.index;

                                                            return (
                                                                <button
                                                                    key={p.index}
                                                                    type="button"
                                                                    onClick={() =>
                                                                        navigateToPart(p.index)
                                                                    }
                                                                    className={cn(
                                                                        "min-h-[52px] rounded-2xl border px-4 py-3 text-left font-body text-[15px] leading-snug transition-all duration-200",
                                                                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                                                                        isActive
                                                                            ? cn(
                                                                                  "font-bold text-text1 shadow-sm",
                                                                                  partStyles.active,
                                                                                  partStyles.ring
                                                                              )
                                                                            : cn(
                                                                                  "border-outline/80 bg-white font-semibold text-text2",
                                                                                  partStyles.hover,
                                                                                  partStyles.ring,
                                                                                  "hover:-translate-y-px hover:shadow-sm"
                                                                              )
                                                                    )}
                                                                >
                                                                    {p.title}
                                                                </button>
                                                            );
                                                        }
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <Box
                    sx={{
                        display: "flex",
                        flexDirection: isOfficial
                            ? "row"
                            : { xs: "column", lg: "row" },
                        alignItems: isOfficial ? "center" : { lg: "center" },
                        justifyContent: isOfficial ? "flex-end" : "space-between",
                        gap: 2.5,
                        mb: 3,
                    }}
                >
                    {isOfficial ? (
                        layoutToggleRow
                    ) : (
                        <Box
                            id="mock-exam-tour-parts-scores-highlight"
                            sx={{
                                display: "flex",
                                flexDirection: { xs: "column", lg: "row" },
                                alignItems: { xs: "stretch", lg: "center" },
                                justifyContent: "space-between",
                                gap: 2.5,
                                width: "100%",
                                flex: { lg: 1 },
                                minWidth: 0,
                            }}
                        >
                            <Stack
                                direction={{ xs: "column", sm: "row" }}
                                spacing={1.5}
                                useFlexGap
                                flexWrap="wrap"
                                alignItems={{ sm: "center" }}
                            >
                                <Typography
                                    component="span"
                                    sx={{
                                        fontSize: "1rem",
                                        fontWeight: 800,
                                        color: "#212E42",
                                        letterSpacing: "-0.02em",
                                    }}
                                >
                                    Exam {examLabel}
                                </Typography>
                                <Box
                                    sx={{
                                        display: "flex",
                                        gap: 1.25,
                                        flexWrap: "wrap",
                                        alignItems: "center",
                                    }}
                                >
                                    {layoutToggleRow}
                                    <Box
                                        id="mock-exam-tour-results-highlight"
                                        sx={{ display: "inline-flex", alignItems: "center" }}
                                    >
                                        <Button
                                            id="mock-exam-tour-results-link"
                                            component="a"
                                            href={resultsHref}
                                            variant="outlined"
                                            sx={{
                                                minHeight: "44px",
                                                px: 2,
                                                borderRadius: "999px",
                                                textTransform: "none",
                                                fontSize: "0.95rem",
                                                fontWeight: 700,
                                                color: "#212E42",
                                                borderColor: "#D5D6D8",
                                                backgroundColor: "#FFFFFF",
                                                "&:hover": {
                                                    borderColor: "#316BFF",
                                                    backgroundColor: "#F2F6FF",
                                                },
                                            }}
                                        >
                                            View Answers &amp; Score
                                        </Button>
                                    </Box>
                                    <AskBeavoButton
                                        className="screen744:block hidden screen744:!right-6 screen744:!left-auto screen744:!translate-x-0 screen744:!fixed screen744:!bottom-6 screen1280:!left-1/2 screen1280:!right-auto screen1280:!-translate-x-1/2"
                                    />
                                </Box>
                            </Stack>

                            <button
                                id="mock-exam-tour-part-picker"
                                type="button"
                                onClick={() => setShowModal(true)}
                                className="flex w-full min-h-14 max-w-full items-center justify-between gap-3 self-stretch rounded-2xl border border-outline bg-white px-4 text-left transition-all duration-200 hover:-translate-y-px hover:border-primary1/30 hover:bg-primary6 hover:shadow-sm lg:w-auto lg:max-w-[460px] lg:self-auto"
                            >
                                <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                                    <span className="font-body text-base text-text3">
                                        {examPractice} Part {partId}:
                                    </span>
                                    <span className="font-body text-base font-extrabold text-text1">
                                        {PRACTICE_PARTS[partId - 1]}
                                    </span>
                                </span>
                                <SvgChevronDownExam />
                            </button>
                        </Box>
                    )}
                </Box>
            </>
        );
    }
);

ExamHeader.displayName = "ExamHeader";

export default ExamHeader;
