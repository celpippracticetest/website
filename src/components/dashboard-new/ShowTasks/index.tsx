"use client";

import { TTaskSchemaDto } from "@/models/tasks.model";
import { useRouter } from "next/navigation";
import React, { useEffect, useState, startTransition } from "react";
import { useSelectedTask } from "@/store/useSelectedTask.store";
import { useIsMobile } from "@/hooks/use-mobile";
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

export type ShowTasksTaskRow = {
  id: string;
  category: string;
  taskNumber: string;
  name: string;
};

type TaskSection = {
  title?: string;
  icon?: React.ReactNode;
  route?: string;
  tasks: ShowTasksTaskRow[];
};

const ShowTasks = ({ tasks }: { tasks: TaskSection[] }) => {
  const { selectedTask, setSelectedTask } = useSelectedTask();
  const router = useRouter();
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0]));

  const toggleSection = (index: number) => {
    startTransition(() => {
      setExpandedSections((prev) => {
        const next = new Set(prev);
        if (next.has(index)) {
          next.delete(index);
        } else {
          next.add(index);
        }
        return next;
      });
    });
  };

  useEffect(() => {
    if (!selectedTask) {
      return;
    }
    if (!isMobile) {
      fetchPractices(selectedTask);
    } else {
      setRedirectUrl(
        taskPickerPath(categoryToSkillRoute(selectedTask.category), selectedTask.id)
      );
    }
    return () => {
      setSelectedTask(null);
    };
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

      navigateToPracticeSessionFromCategory(
        router,
        task.category,
        data.items[0].id,
        task.id
      );
    } catch (error) {}
  };

  const getSectionStyles = (title: string = "") => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes("listening")) return { bgColor: "#F0FFFD", color: "#316BFF" };
    if (lowerTitle.includes("reading")) return { bgColor: "#FFF2F4", color: "#F27059" };
    if (lowerTitle.includes("writing")) return { bgColor: "#F0FFFD", color: "#0DAA94" };
    if (lowerTitle.includes("speaking")) return { bgColor: "#FFF8F0", color: "#EE4266" };
    return { bgColor: "#F9FAFB", color: "#4B5563" };
  };

  const taskCardSx = {
    position: "relative" as const,
    cursor: "pointer",
    borderRadius: 2.5,
    p: { xs: 2.5, xl: 3 },
    bgcolor: "background.paper",
    boxShadow: 1,
    border: "1px solid transparent",
    display: "flex",
    flexDirection: "column" as const,
    transition: "box-shadow 0.2s, border-color 0.2s",
    "&:hover": {
      boxShadow: 3,
      borderColor: "rgba(13, 170, 148, 0.2)",
    },
    "&:hover .show-tasks-select-arrow": {
      transform: "translateX(4px)",
    },
  };

  return (
    <Stack
      spacing={3}
      sx={{
        bgcolor: "#F4F7FF",
        pt: 2,
        maxWidth: 1200,
        width: 1,
      }}
    >
      {tasks.map((section, sectionIndex) => {
        const isExpanded = expandedSections.has(sectionIndex);
        const label =
          section.title ||
          (section.route
            ? section.route.charAt(0).toUpperCase() + section.route.slice(1)
            : "Practice");
        const styles = getSectionStyles(section.title || section.route || "");
        const hasHeader = Boolean(section.title || section.icon || section.route);

        return (
          <Paper
            key={sectionIndex}
            elevation={0}
            sx={{
              borderRadius: 2,
              border: "1px solid #E5E7EB",
              boxShadow: 1,
              overflow: "hidden",
            }}
          >
            {hasHeader && (
              <Box
                onClick={() => toggleSection(sectionIndex)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  px: { xs: 2, xl: 3 },
                  height: 60,
                  flexShrink: 0,
                  cursor: "pointer",
                  "&:hover": { bgcolor: "grey.50" },
                }}
              >
                <Stack direction="row" alignItems="center" spacing={2}>
                  {section.icon && (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        bgcolor: styles.bgColor,
                        color: styles.color,
                      }}
                    >
                      {section.icon}
                    </Box>
                  )}
                  <Typography
                    sx={{
                      fontSize: { xs: 18, xl: 22 },
                      color: "#212E42",
                      fontWeight: 600,
                    }}
                  >
                    {label}
                  </Typography>
                </Stack>
                <Box sx={{ color: "#37465C" }}>
                  {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </Box>
              </Box>
            )}

            <Collapse in={isExpanded}>
              <Box
                sx={{
                  borderTop: hasHeader ? "1px solid #E5E7EB" : "none",
                }}
              >
                <Box
                  sx={{
                    ...(hasHeader ? { bgcolor: styles.bgColor } : {}),
                    p: { xs: 2, xl: 3 },
                  }}
                >
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
                    {section.tasks.map((task, taskIndex) => (
                      <Paper
                        key={`${sectionIndex}-${taskIndex}`}
                        elevation={0}
                        onClick={() => {
                          if (!task.id) return;
                          setSelectedTask(task as TTaskSchemaDto);
                        }}
                        sx={taskCardSx}
                      >
                        {selectedTask?.id === task.id && (
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
                            fontSize: 12,
                            fontWeight: 500,
                            bgcolor: "#F1F5F9",
                            color: "#64748B",
                          }}
                        />
                        <Typography
                          sx={{
                            color: "#212E42",
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
                            color: "#316BFF",
                            fontWeight: 600,
                            fontSize: { xs: 14, xl: 16 },
                          }}
                        >
                          <span>Select</span>
                          <ArrowForwardIcon
                            className="show-tasks-select-arrow"
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
  );
};

export default ShowTasks;
