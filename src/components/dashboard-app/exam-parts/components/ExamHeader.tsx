import { PRACTICE_PARTS } from "@/constants";
import SvgChevronDownExam from "@/components/icons/ChevronDownExam";
import AskBeavoButton from "@/components/AskBeavo/AskBeavoButton";
import { useRouter, useSearchParams } from "next/navigation";
import React, { forwardRef } from "react";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
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

const sectionPalettes: Record<string, { color: string; backgroundColor: string; borderColor: string }> = {
    listening: {
        color: "#316BFF",
        backgroundColor: "#D1DEFF",
        borderColor: "#B8CBFF",
    },
    reading: {
        color: "#F27059",
        backgroundColor: "#FFE2E8",
        borderColor: "#FFD0D9",
    },
    writing: {
        color: "#0DAA94",
        backgroundColor: "#F0FFFD",
        borderColor: "#C7F2EC",
    },
    speaking: {
        color: "#EE4266",
        backgroundColor: "#FFEBD6",
        borderColor: "#FFD5AF",
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

        return (
            <>
                <Box
                    sx={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 1300,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        px: { xs: 2, md: 3 },
                        py: 3,
                        backgroundColor: "rgba(20, 29, 45, 0.36)",
                        backdropFilter: "blur(8px)",
                        opacity: menuShowModal ? 1 : 0,
                        pointerEvents: menuShowModal ? "auto" : "none",
                        transition: "opacity 0.25s ease",
                    }}
                >
                    <Paper
                        ref={ref}
                        elevation={0}
                        sx={{
                            width: "100%",
                            maxWidth: "1120px",
                            maxHeight: "90vh",
                            overflowY: "auto",
                            p: { xs: 2.5, md: 3 },
                            borderRadius: "28px",
                            border: "1px solid #E2EAF6",
                            boxShadow: "0 28px 80px rgba(20, 29, 45, 0.18)",
                            transform: menuShowModal ? "scale(1) translateY(0)" : "scale(0.97) translateY(8px)",
                            transition: "transform 0.25s ease",
                        }}
                    >
                        <Typography
                            component="h2"
                            sx={{
                                mb: 2.5,
                                fontSize: { xs: "1.2rem", md: "1.35rem" },
                                fontWeight: 800,
                                color: "#37465C",
                            }}
                        >
                            Choose an exam part
                        </Typography>
                        <Box
                            sx={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 2,
                            }}
                        >
                            {practiceSections.map((sectionItem) => (
                                <Box
                                    key={sectionItem.title}
                                    sx={{
                                        width: {
                                            xs: "100%",
                                            md: "calc(50% - 8px)",
                                            xl: "calc(25% - 12px)",
                                        },
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 1.5,
                                    }}
                                >
                                    <Box
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: 1,
                                            minHeight: "64px",
                                            borderRadius: "18px",
                                            color: sectionPalettes[sectionItem.route]?.color ?? "#37465C",
                                            backgroundColor:
                                                sectionPalettes[sectionItem.route]?.backgroundColor ?? "#F7F9FC",
                                            border: `1px solid ${sectionPalettes[sectionItem.route]?.borderColor ?? "#E2EAF6"
                                                }`,
                                        }}
                                    >
                                        {sectionItem.icon}
                                        <Typography
                                            component="span"
                                            sx={{
                                                fontSize: "1rem",
                                                fontWeight: 700,
                                                color: "#37465C",
                                            }}
                                        >
                                            {sectionItem.title}
                                        </Typography>
                                    </Box>
                                    <Box
                                        sx={{
                                            display: "flex",
                                            flexWrap: "wrap",
                                            gap: 1.5,
                                        }}
                                    >
                                        {getPartsForSection(sectionItem.route).map((p) => {
                                            const isActive = partId === p.index;
                                            const palette = sectionPalettes[sectionItem.route];

                                            return (
                                                <Box
                                                    key={p.index}
                                                    component="button"
                                                    type="button"
                                                    onClick={() => {
                                                        const params = new URLSearchParams();
                                                        if (browserAttemptId) params.set("attemptId", browserAttemptId);
                                                        if (currentSection) params.set("section", currentSection);
                                                        const queryString = params.toString() ? `?${params.toString()}` : "";

                                                        setShowModal(false);
                                                        router.push(
                                                            `/exams/exam_${examId}/part${p.index.toString()}${queryString}`
                                                        );
                                                    }}
                                                    sx={{
                                                        width: {
                                                            xs: "100%",
                                                            sm: "calc(50% - 6px)",
                                                            xl: "100%",
                                                        },
                                                        minHeight: "64px",
                                                        px: 1.75,
                                                        py: 1.5,
                                                        borderRadius: "18px",
                                                        border: `1px solid ${isActive ? palette?.borderColor ?? "#BFD1FF" : "#E2EAF6"
                                                            }`,
                                                        backgroundColor: isActive
                                                            ? alpha(palette?.color ?? "#316BFF", 0.08)
                                                            : "#FFFFFF",
                                                        color: "#37465C",
                                                        textAlign: "left",
                                                        cursor: "pointer",
                                                        appearance: "none",
                                                        transition:
                                                            "transform 0.2s ease, border-color 0.2s ease, background-color 0.2s ease",
                                                        "&:hover": {
                                                            transform: "translateY(-1px)",
                                                            borderColor: palette?.borderColor ?? "#BFD1FF",
                                                            backgroundColor: alpha(palette?.color ?? "#316BFF", 0.06),
                                                        },
                                                        "&:focus-visible": {
                                                            outline: "none",
                                                            boxShadow: `0 0 0 3px ${alpha(palette?.color ?? "#316BFF", 0.18)}`,
                                                        },
                                                    }}
                                                >
                                                    <Typography
                                                        component="span"
                                                        sx={{
                                                            display: "block",
                                                            fontSize: "0.95rem",
                                                            lineHeight: 1.5,
                                                            fontWeight: isActive ? 700 : 600,
                                                            color: "#37465C",
                                                        }}
                                                    >
                                                        {p.title}
                                                    </Typography>
                                                </Box>
                                            );
                                        })}
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    </Paper>
                </Box>
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
                        !hideLayoutToggle && (
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
                        )
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
                                        fontWeight: 700,
                                        color: "#37465C",
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
                                    {!hideLayoutToggle && (
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
                                    )}
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
                                                color: "#37465C",
                                                borderColor: "#D5DDE8",
                                                backgroundColor: "#FFFFFF",
                                                "&:hover": {
                                                    borderColor: "#BFCDE2",
                                                    backgroundColor: "#F7F9FC",
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
                            <Button
                                id="mock-exam-tour-part-picker"
                                onClick={() => setShowModal(true)}
                                variant="outlined"
                                endIcon={<SvgChevronDownExam />}
                                sx={{
                                    width: { xs: "100%", lg: "auto" },
                                    maxWidth: "460px",
                                    minHeight: "56px",
                                    justifyContent: "space-between",
                                    px: 2,
                                    borderRadius: "18px",
                                    borderColor: "#D5DDE8",
                                    backgroundColor: "#FFFFFF",
                                    color: "#37465C",
                                    textTransform: "none",
                                    alignSelf: { xs: "stretch", lg: "auto" },
                                    "&:hover": {
                                        borderColor: "#BFCDE2",
                                        backgroundColor: "#F7F9FC",
                                    },
                                }}
                            >
                                <Box
                                    sx={{
                                        display: "flex",
                                        flexWrap: "wrap",
                                        alignItems: "baseline",
                                        gap: 0.75,
                                        textAlign: "left",
                                    }}
                                >
                                    <Typography component="span" sx={{ fontSize: "1rem", color: "#526071" }}>
                                        {examPractice} Part {partId}:
                                    </Typography>
                                    <Typography component="span" sx={{ fontSize: "1rem", fontWeight: 800 }}>
                                        {PRACTICE_PARTS[partId - 1]}
                                    </Typography>
                                </Box>
                            </Button>
                        </Box>
                    )}
                </Box>
            </>
        );
    }
);

ExamHeader.displayName = "ExamHeader";

export default ExamHeader;
