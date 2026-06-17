"use client";

import { useIsMobile } from "@/hooks/use-mobile";
import { TTaskSchemaDto } from "@/models/tasks.model";
import useStore from "@/store";
import { useRouter } from "next/navigation";
import { useEffect, useState, startTransition } from "react";
import { useEngagementTracking, usePracticeTracking } from "@/hooks/useTracking";
import { scheduleIdleTask } from "@/lib/scheduleIdle";
import SvgListeningPart from "../icons/ListeningPart";
import SvgReadingPart from "../icons/ReadingPart";
import SvgWritingPart from "../icons/WritingPart";
import SvgSpeakingPart from "../icons/SpeakingPart";
import {
  Box,
  Chip,
  CircularProgress,
  Collapse,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { categoryToSkillRoute, taskPickerPath } from "@/lib/practiceRoutes";
import { navigateToPracticeSessionFromCategory } from "@/lib/navigateToPracticeSession";

const practiceNavy = "#1B2B5A";
const practiceMuted = "#475569";

interface PracticeSection {
  title: string;
  iconColor: string;
  iconBg: string;
  icon: React.ReactNode;
  tasks: TTaskSchemaDto[];
  route: string;
}

const PracticeOverview = ({
  tasks,
}: {
  tasks: {
    speaking: TTaskSchemaDto[];
    listening: TTaskSchemaDto[];
    writing: TTaskSchemaDto[];
    reading: TTaskSchemaDto[];
  };
}) => {
  const router = useRouter();
  const [selectedTask, setSelectedTask] = useState<TTaskSchemaDto | null>(null);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const setTaskInStore = useStore((state) => state.setTasks);
  const isMobile = useIsMobile();
  const { started } = usePracticeTracking();
  const { faqClick } = useEngagementTracking();

  useEffect(() => {
    setTaskInStore(tasks);
  }, [setTaskInStore, tasks]);

  useEffect(() => {
    if (!selectedTask) {
      return;
    }
    if (!isMobile) {
      fetchPractices(selectedTask);
    } else {
      started(selectedTask?.id || "unknown", selectedTask?.category || "unknown");
      setRedirectUrl(
        taskPickerPath(categoryToSkillRoute(selectedTask.category), selectedTask.id)
      );
    }
  }, [selectedTask]);
  useEffect(() => {
    if (redirectUrl) {
      router.push(redirectUrl);
    }
  }, [redirectUrl]);
  const fetchPractices = async (task: TTaskSchemaDto | null) => {
    try {
      if (!task) {
        return;
      }

      const response = await fetch(
        `/api/practices?type=${task.category}&page=0&limit=1&taskId=${task.id}`
      );
      if (!response.ok) {
        throw new Error("Network response was not ok.");
      }
      const data = await response.json();
      if (!data || data.items.length === 0) {
        return;
      }

      started(data.items[0].id, task.category);

      navigateToPracticeSessionFromCategory(
        router,
        task.category,
        data.items[0].id,
        task.id
      );
    } catch (error) {}
  };

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (title: string) => {
    startTransition(() => {
      setExpandedSections((prev) => {
        const next = new Set(prev);
        if (next.has(title)) {
          next.delete(title);
        } else {
          next.add(title);
        }
        return next;
      });
    });
    scheduleIdleTask(() => faqClick(title, "practice_overview_accordion"));
  };

  const practiceSections: PracticeSection[] = [
    {
      title: "Listening",
      iconColor: "#0DAA94",
      iconBg: "#E6F6F4",
      icon: <SvgListeningPart />,
      route: "listening",
      tasks:
        tasks["listening"]?.sort((a, b) => {
          return (
            parseInt(a.taskNumber.replace(/\D/g, "")) -
            parseInt(b.taskNumber.replace(/\D/g, ""))
          );
        }) ?? [],
    },
    {
      title: "Reading",
      iconColor: "#EE4266",
      iconBg: "#FEECEF",
      icon: <SvgReadingPart />,
      route: "reading",
      tasks:
        tasks["reading"]?.sort((a, b) => {
          return (
            parseInt(a.taskNumber.replace(/\D/g, "")) -
            parseInt(b.taskNumber.replace(/\D/g, ""))
          );
        }) ?? [],
    },
    {
      title: "Writing",
      iconColor: "#F27059",
      iconBg: "#FFF1EE",
      icon: <SvgWritingPart />,
      route: "writing",
      tasks:
        tasks["writing"]?.sort((a, b) => {
          return (
            parseInt(a.taskNumber.replace(/\D/g, "")) -
            parseInt(b.taskNumber.replace(/\D/g, ""))
          );
        }) ?? [],
    },
    {
      title: "Speaking",
      iconColor: "#7C3AED",
      iconBg: "#F1E9FE",
      icon: <SvgSpeakingPart />,
      route: "speaking",
      tasks:
        tasks["speaking"]?.sort((a, b) => {
          return (
            parseInt(a.taskNumber.replace(/\D/g, "")) -
            parseInt(b.taskNumber.replace(/\D/g, ""))
          );
        }) ?? [],
    },
  ];

  const taskCardSx = {
    position: "relative" as const,
    cursor: "pointer",
    borderRadius: 3,
    p: 2.5,
    bgcolor: "#FFFFFF",
    boxShadow: "0 12px 36px rgba(15, 23, 42, 0.06)",
    border: "1px solid rgba(27, 43, 90, 0.10)",
    transition: "box-shadow 0.2s, border-color 0.2s",
    "&:hover": {
      boxShadow: "0 20px 48px rgba(15, 23, 42, 0.10)",
      borderColor: "rgba(37, 99, 235, 0.28)",
    },
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        width: 1,
        px: { xs: 2, xl: 5 },
        bgcolor: "transparent",
        pt: { xs: 2, xl: 3 },
        pb: { xs: 9, xl: 12 },
        gap: 3,
      }}
    >
      <Typography
        sx={{
          fontSize: 18,
          color: practiceNavy,
          fontWeight: 700,
          display: "block",
          "@media (min-width: 1280px)": { display: "none" },
        }}
      >
        Practices
      </Typography>

      <Box
        sx={{
          display: "none",
          "@media (min-width: 1280px)": {
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 4,
          },
        }}
      >
          {practiceSections.map((section) => (
            <Stack key={section.title} spacing={4}>
              <Stack alignItems="center" spacing={1}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 72,
                    height: 72,
                    borderRadius: "50%",
                    bgcolor: section.iconBg,
                    color: section.iconColor,
                    "& svg": { transform: "scale(1.5)" },
                  }}
                >
                  {section.icon}
                </Box>
                <Typography sx={{ fontSize: 20, fontWeight: 800, color: practiceNavy }}>
                  {section.title}
                </Typography>
              </Stack>

              <Stack spacing={2}>
                {section.tasks.map((task, index) => (
                  <Paper
                    key={`${section.title}-${index}`}
                    elevation={0}
                    onClick={() => {
                      if (!task?.id) return;
                      setSelectedTask(task);
                    }}
                    sx={{ ...taskCardSx, borderRadius: 3 }}
                  >
                    {selectedTask?.id === task?.id && (
                      <Box
                        sx={{
                          position: "absolute",
                          inset: 0,
                          bgcolor: "rgba(255,255,255,0.8)",
                          borderRadius: 3,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          zIndex: 1,
                        }}
                      >
                        <CircularProgress size={24} />
                      </Box>
                    )}
                    <Chip
                      label={`Task ${index + 1}`}
                      size="small"
                      sx={{
                        mb: 1.5,
                        height: 22,
                        fontSize: 11,
                        fontWeight: 700,
                        bgcolor: "#F1F5F9",
                        color: "#64748B",
                      }}
                    />
                    <Typography
                      sx={{
                        color: practiceNavy,
                        fontWeight: 700,
                        fontSize: 18,
                        lineHeight: 1.35,
                      }}
                    >
                      {task.name}
                    </Typography>
                  </Paper>
                ))}
              </Stack>
            </Stack>
          ))}
      </Box>

      <Stack
        spacing={1.5}
        sx={{
          display: "flex",
          "@media (min-width: 1280px)": { display: "none" },
        }}
      >
          {practiceSections.map((section) => {
            const isExpanded = expandedSections.has(section.title);
            return (
              <Paper
                key={section.title}
                elevation={0}
                sx={{
                  borderRadius: 3,
                  border: "1px solid rgba(27, 43, 90, 0.10)",
                  boxShadow: "0 12px 36px rgba(15, 23, 42, 0.06)",
                  overflow: "hidden",
                  bgcolor: "#FFFFFF",
                }}
              >
                <Box
                  onClick={() => toggleSection(section.title)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    p: 2,
                    cursor: "pointer",
                    "&:hover": { bgcolor: "rgba(248, 250, 252, 0.95)" },
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: { xs: 40, xl: 48 },
                        height: { xs: 40, xl: 48 },
                        borderRadius: "50%",
                        bgcolor: section.iconBg,
                        color: section.iconColor,
                      }}
                    >
                      {section.icon}
                    </Box>
                    <Typography
                      sx={{
                        fontSize: { xs: 18, xl: 22 },
                        color: practiceNavy,
                        fontWeight: 700,
                      }}
                    >
                      {section.title}
                    </Typography>
                  </Stack>
                  <Box sx={{ color: practiceMuted }}>
                    {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </Box>
                </Box>

                <Collapse in={isExpanded}>
                  <Box sx={{ borderTop: "1px solid rgba(27, 43, 90, 0.08)" }}>
                    <Box sx={{ bgcolor: section.iconBg, p: { xs: 2, xl: 3 } }}>
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: {
                            xs: "1fr",
                            sm: "repeat(2, 1fr)",
                          },
                          gap: { xs: 2, sm: 3 },
                        }}
                      >
                        {section.tasks.map((task, index) => (
                          <Paper
                            key={`${section.title}-${index}`}
                            elevation={0}
                            onClick={() => {
                              if (!task?.id) return;
                              setSelectedTask(task);
                            }}
                            sx={{
                              ...taskCardSx,
                              p: { xs: 2.5, xl: 3 },
                              borderRadius: 2.5,
                              display: "flex",
                              flexDirection: "column",
                              "&:hover .practice-overview-select-arrow": {
                                transform: "translateX(4px)",
                              },
                            }}
                          >
                            {selectedTask?.id === task?.id && (
                              <Box
                                sx={{
                                  position: "absolute",
                                  inset: 0,
                                  bgcolor: "rgba(255,255,255,0.8)",
                                  borderRadius: 2.5,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  zIndex: 1,
                                }}
                              >
                                <CircularProgress size={24} />
                              </Box>
                            )}
                            <Chip
                              label={task.taskNumber}
                              size="small"
                              sx={{
                                mb: 2,
                                alignSelf: "flex-start",
                                bgcolor: "#F1F5F9",
                                color: "#64748B",
                                fontWeight: 500,
                                fontSize: 12,
                              }}
                            />
                            <Typography
                              sx={{
                                color: practiceNavy,
                                fontWeight: 700,
                                fontSize: { xs: 18, xl: 22 },
                                lineHeight: 1.25,
                                mb: 3,
                              }}
                            >
                              {task.name}
                            </Typography>
                            <Stack
                              direction="row"
                              alignItems="center"
                              spacing={1}
                              sx={{
                                mt: "auto",
                                color: "#2563EB",
                                fontWeight: 600,
                                fontSize: { xs: 14, xl: 16 },
                              }}
                            >
                              <span>Select</span>
                              <ArrowForwardIcon
                                className="practice-overview-select-arrow"
                                sx={{ fontSize: 18, transition: "transform 0.2s" }}
                              />
                            </Stack>
                          </Paper>
                        ))}
                      </Box>
                    </Box>
                  </Box>
                </Collapse>
              </Paper>
            );
          })}
      </Stack>
    </Box>
  );
};

export default PracticeOverview;
