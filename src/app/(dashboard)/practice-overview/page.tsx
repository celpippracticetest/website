"use client";

import PracticeOverview from "@/components/dashboard-app/PracticeOverview";
import PendingDiagnosticBanner from "@/components/dashboard-app/PendingDiagnosticBanner";
import { useEffect, useState } from "react";
import { TTaskSchemaDto } from "@/models/tasks.model";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import { Box, Skeleton, Stack, Typography } from "@mui/material";

const practiceOverviewPageBg =
  "linear-gradient(135deg, #FAFBFF 0%, #EEF2FF 50%, #F8FAFC 100%)";
const practiceOverviewNavy = "#1B2B5A";
const practiceOverviewMuted = "#475569";

interface TasksList {
  speaking: TTaskSchemaDto[];
  listening: TTaskSchemaDto[];
  writing: TTaskSchemaDto[];
  reading: TTaskSchemaDto[];
}

const PracticeSkeletonLoader = () => (
  <Stack spacing={3} sx={{ width: 1, maxWidth: 1200, alignSelf: "flex-end", px: 2, pt: 2, pb: 3 }}>
    <Skeleton
      variant="rounded"
      height={48}
      width={256}
      sx={{ bgcolor: "rgba(15, 23, 42, 0.08)" }}
    />
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" },
        gap: 2,
      }}
    >
      {[...Array(6)].map((_, i) => (
        <Stack
          key={i}
          spacing={1.5}
          sx={{
            bgcolor: "rgba(255, 255, 255, 0.85)",
            p: 3,
            borderRadius: 3,
            border: "1px solid rgba(27, 43, 90, 0.10)",
            boxShadow: "0 12px 36px rgba(15, 23, 42, 0.06)",
          }}
        >
          <Skeleton variant="rounded" height={24} width="75%" />
          <Skeleton variant="rounded" height={16} />
          <Skeleton variant="rounded" height={16} width="83%" />
          <Skeleton variant="rounded" height={40} width={128} sx={{ mt: 1 }} />
        </Stack>
      ))}
    </Box>
  </Stack>
);

const DashboardApp = () => {
  const { isSignedIn } = useHybridWebUser();
  const [tasks, setTasks] = useState<TasksList>({
    speaking: [],
    listening: [],
    writing: [],
    reading: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await fetch("/api/tasks?type=practice&limit=100");
        if (response.ok) {
          const data = await response.json();
          const tasksList = data.items.reduce(
            (current: TasksList, taskItem: TTaskSchemaDto) => {
              current[taskItem.category].push(taskItem);
              return current;
            },
            { speaking: [], listening: [], writing: [], reading: [] }
          );
          setTasks(tasksList);
        }
      } catch (error) {
        console.error("Error fetching tasks:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTasks();
  }, []);

  const bodySx = {
    color: practiceOverviewMuted,
    fontSize: { xs: 15, sm: 16 },
    lineHeight: 1.625,
    mt: 2,
  };

  return (
    <Box
      component="main"
      sx={{
        display: "flex",
        flexDirection: "column",
        width: 1,
        alignItems: "flex-end",
        mb: "120px",
        background: practiceOverviewPageBg,
        minHeight: "100%",
      }}
    >
      <Typography
        component="h1"
        sx={{
          position: "absolute",
          width: "1px",
          height: "1px",
          p: 0,
          m: -1,
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        CELPIP Practice Test — Skill Overview & Sample Tasks
      </Typography>
      <PendingDiagnosticBanner />
      {isLoading ? <PracticeSkeletonLoader /> : <PracticeOverview tasks={tasks} />}
      {!isSignedIn && (
        <Box
          component="section"
          sx={{ width: 1, maxWidth: 1200, mx: "auto", px: 2, pt: 3, pb: 2 }}
        >
          <Typography
            component="h2"
            sx={{
              fontWeight: 800,
              color: practiceOverviewNavy,
              fontSize: { xs: 28, sm: 34 },
              letterSpacing: "-0.02em",
            }}
          >
            CELPIP Practice Test — By Skill
          </Typography>
          <Typography component="p" sx={{ ...bodySx, mt: 1.5, fontSize: 16, lineHeight: 1.625 }}>
            Choose focused CELPIP practice by skill and train with realistic task formats for
            Listening, Reading, Writing, and Speaking. This page helps you plan daily study, pick the
            next task quickly, and build confidence before full mock exams.
          </Typography>
          <Typography component="p" sx={bodySx}>
            The most effective preparation combines deliberate practice and repetition. Start with
            your weakest skill, complete one timed task, and review every incorrect answer or weak
            response. Then move to a second skill to improve stamina and concentration across
            multiple sections, similar to the real CELPIP exam experience.
          </Typography>
          <Typography component="p" sx={bodySx}>
            Use short cycles: practice, review, correct, and repeat. In Listening and Reading, track
            question types you miss most often. In Writing and Speaking, focus on structure,
            grammar control, and idea development. Small targeted improvements in each cycle are
            more reliable than random high-volume practice.
          </Typography>
          <Typography component="p" sx={bodySx}>
            If your exam date is close, prioritize consistency over intensity. Daily focused sessions
            of 45 to 90 minutes usually outperform occasional long sessions. Keep notes on recurring
            mistakes, revisit them weekly, and measure progress by accuracy, timing, and confidence
            under test-like conditions.
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default DashboardApp;
