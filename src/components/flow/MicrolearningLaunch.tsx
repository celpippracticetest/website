"use client";

import { useEffect, useMemo, useState } from "react";
import { Box, Button, Chip, LinearProgress, Paper, Stack, Typography } from "@mui/material";

type LaunchStep = {
  id: string;
  kind: "learning" | "practice" | "review";
  title: string;
  description: string;
  durationMinutes: number;
  actionHref?: string;
  ctaLabel: string;
};

export type LaunchFlow = {
  urgency: "high" | "medium" | "low";
  daysToExam: number | null;
  focusSkill: "listening" | "reading" | "writing" | "speaking";
  targetScore: number | null;
  subGoal: string | null;
  reasoning: string[];
  steps: LaunchStep[];
};

export type Profile = {
  subGoal: string | null;
  targetScore: number | null;
  focusSkill: string | null;
  testDate: string | null;
};

type MicrolearningLaunchProps = {
  flow: LaunchFlow;
  profile: Profile;
  firstAction: string;
  onStartNow: (url: string) => void;
  onSkip: () => void;
  autoStartSeconds?: number;
  disableAutoStart?: boolean;
};

const urgencyLabel: Record<LaunchFlow["urgency"], string> = {
  high: "High Urgency",
  medium: "Medium Urgency",
  low: "Low Urgency",
};

export default function MicrolearningLaunch({
  flow,
  profile,
  firstAction,
  onStartNow,
  onSkip,
  autoStartSeconds = 8,
  disableAutoStart = false,
}: MicrolearningLaunchProps) {
  const [secondsLeft, setSecondsLeft] = useState(autoStartSeconds);

  useEffect(() => {
    if (disableAutoStart) return;

    if (secondsLeft <= 0) {
      onStartNow(firstAction);
      return;
    }

    const timer = window.setTimeout(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [secondsLeft, onStartNow, firstAction, disableAutoStart]);

  const progressValue = useMemo(() => {
    const elapsed = autoStartSeconds - secondsLeft;
    return Math.min(100, (elapsed / autoStartSeconds) * 100);
  }, [autoStartSeconds, secondsLeft]);

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        bgcolor: "rgba(244, 247, 255, 0.97)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
        py: 4,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 920,
          borderRadius: 4,
          p: { xs: 2.5, sm: 4 },
          border: "1px solid #D8E2FF",
          background:
            "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(244,247,255,1) 100%)",
        }}
      >
        <Stack spacing={2.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h5" sx={{ fontWeight: 700, color: "#212E42" }}>
              Your Microlearning Flow Is Ready
            </Typography>
            <Chip
              label={urgencyLabel[flow.urgency]}
              sx={{
                bgcolor: flow.urgency === "high" ? "#FFE9E5" : "#EAF5FF",
                color: flow.urgency === "high" ? "#C2410C" : "#1D4ED8",
                fontWeight: 600,
              }}
            />
          </Stack>

          <Typography sx={{ color: "#526071", fontSize: 15 }}>
            Start with a focused, short sequence tailored to your goal and timeline.
          </Typography>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} flexWrap="wrap">
            {profile.focusSkill && <Chip label={`Focus: ${profile.focusSkill}`} />}
            {profile.targetScore && <Chip label={`Target CLB: ${profile.targetScore}`} />}
            {profile.testDate && <Chip label={`Exam: ${profile.testDate}`} />}
            {profile.subGoal && <Chip label={profile.subGoal} />}
          </Stack>

          {!disableAutoStart && (
            <Box>
              <Typography sx={{ fontSize: 13, color: "#76808F", mb: 1 }}>
                Auto-starting in {secondsLeft}s
              </Typography>
              <LinearProgress
                variant="determinate"
                value={progressValue}
                sx={{
                  height: 8,
                  borderRadius: 999,
                  bgcolor: "#E5EAF8",
                  "& .MuiLinearProgress-bar": {
                    borderRadius: 999,
                    bgcolor: "#316BFF",
                  },
                }}
              />
            </Box>
          )}

          <Stack spacing={1.25}>
            {flow.steps.map((step, index) => (
              <Paper
                key={step.id}
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 3,
                  border: "1px solid #E2E8F0",
                  bgcolor: "white",
                }}
              >
                <Stack spacing={0.7}>
                  <Typography sx={{ fontSize: 12, color: "#76808F", fontWeight: 600 }}>
                    Step {index + 1} • {step.durationMinutes} min
                  </Typography>
                  <Typography sx={{ fontWeight: 700, color: "#212E42" }}>{step.title}</Typography>
                  <Typography sx={{ color: "#526071", fontSize: 14 }}>{step.description}</Typography>
                </Stack>
              </Paper>
            ))}
          </Stack>

          <Stack spacing={0.5}>
            {flow.reasoning.map((reason, index) => (
              <Typography key={`${reason}-${index}`} sx={{ fontSize: 13, color: "#5B6470" }}>
                • {reason}
              </Typography>
            ))}
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} justifyContent="flex-end">
            <Button variant="text" onClick={onSkip} sx={{ color: "#76808F" }}>
              Skip for now
            </Button>
            <Button
              variant="contained"
              onClick={() => onStartNow(firstAction)}
              sx={{
                bgcolor: "#F27059",
                "&:hover": { bgcolor: "#E55A42" },
                px: 3,
              }}
            >
              Start Now
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}
