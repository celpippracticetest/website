"use client";

import { useId, useState } from "react";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import {
  Box,
  IconButton,
  Popover,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import type { MockExamViewMode } from "./useExamViewMode";

const INFO_POPOVER_ID = "exam-layout-mode-info-popover";

export interface ExamLayoutToggleProps {
  viewMode: MockExamViewMode;
  setViewMode: (mode: MockExamViewMode) => void;
  /** Slightly tighter padding for dense toolbars */
  density?: "comfortable" | "compact";
  /** Extra id for aria-labelledby if needed */
  labelledBy?: string;
}

/**
 * Practice Mode ↔ Exam Mode segmented control. Single source of truth for mock exam layout styling.
 */
const ExamLayoutToggle = ({
  viewMode,
  setViewMode,
  density = "comfortable",
  labelledBy,
}: ExamLayoutToggleProps) => {
  const [infoAnchor, setInfoAnchor] = useState<HTMLElement | null>(null);
  const infoOpen = Boolean(infoAnchor);
  const descriptionId = useId();

  const isCompact = density === "compact";
  const fontSize = isCompact ? "0.72rem" : "0.8125rem";
  const buttonPx = isCompact ? 1.1 : 1.35;
  const buttonPy = isCompact ? 0.45 : 0.6;

  const handleModeChange = (
    _event: React.MouseEvent<HTMLElement>,
    next: MockExamViewMode | null
  ) => {
    if (next !== null) {
      setViewMode(next);
    }
  };

  return (
    <Box
      component="div"
      role="group"
      aria-labelledby={labelledBy}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.75,
        flexWrap: "wrap",
      }}
    >
      <ToggleButtonGroup
        exclusive
        value={viewMode}
        onChange={handleModeChange}
        aria-label="Choose practice or exam screen layout"
        sx={{
          p: 0.4,
          borderRadius: "14px",
          border: "1px solid #D5DDE8",
          backgroundColor: "#EEF3FB",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.85)",
          gap: 0.35,
          "& .MuiToggleButtonGroup-grouped": {
            border: 0,
            borderRadius: "11px !important",
            margin: 0,
            "&:not(:first-of-type)": { borderRadius: "11px !important" },
          },
        }}
      >
        <ToggleButton
          value="classic"
          sx={{
            px: buttonPx,
            py: buttonPy,
            textTransform: "none",
            fontWeight: 700,
            fontSize,
            lineHeight: 1.25,
            color: "#5A6B80",
            border: "none",
            backgroundColor: "transparent",
            "&.Mui-selected": {
              color: "#FFFFFF",
              backgroundColor: "#316BFF",
              boxShadow: "0 2px 8px rgba(49, 107, 255, 0.35)",
              "&:hover": {
                backgroundColor: "#2756d4",
              },
            },
            "&:hover": {
              backgroundColor: "rgba(49, 107, 255, 0.08)",
            },
            "&.Mui-selected:hover": {
              backgroundColor: "#2756d4",
            },
          }}
        >
          Practice Mode
        </ToggleButton>
        <ToggleButton
          value="official"
          sx={{
            px: buttonPx,
            py: buttonPy,
            textTransform: "none",
            fontWeight: 700,
            fontSize,
            lineHeight: 1.25,
            color: "#5A6B80",
            border: "none",
            backgroundColor: "transparent",
            "&.Mui-selected": {
              color: "#FFFFFF",
              backgroundColor: "#1E3A5F",
              boxShadow: "0 2px 8px rgba(30, 58, 95, 0.28)",
              "&:hover": {
                backgroundColor: "#162d4a",
              },
            },
            "&:hover": {
              backgroundColor: "rgba(30, 58, 95, 0.08)",
            },
            "&.Mui-selected:hover": {
              backgroundColor: "#162d4a",
            },
          }}
        >
          Exam Mode
        </ToggleButton>
      </ToggleButtonGroup>

      <IconButton
        type="button"
        size="small"
        onClick={(e) => setInfoAnchor(e.currentTarget)}
        aria-label="What are Practice Mode and Exam Mode?"
        aria-expanded={infoOpen}
        aria-controls={INFO_POPOVER_ID}
        aria-describedby={descriptionId}
        sx={{
          color: "#6B7888",
          border: "1px solid #D5DDE8",
          backgroundColor: "#FFFFFF",
          width: isCompact ? 34 : 38,
          height: isCompact ? 34 : 38,
          "&:hover": {
            backgroundColor: "#F7F9FC",
            borderColor: "#BFCDE2",
            color: "#316BFF",
          },
        }}
      >
        <InfoOutlinedIcon sx={{ fontSize: isCompact ? 18 : 20 }} />
      </IconButton>

      <Popover
        id={INFO_POPOVER_ID}
        open={infoOpen}
        anchorEl={infoAnchor}
        onClose={() => setInfoAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            elevation: 8,
            sx: {
              mt: 1,
              maxWidth: 340,
              borderRadius: "16px",
              border: "1px solid #E2EAF6",
              boxShadow: "0 16px 48px rgba(20, 29, 45, 0.14)",
              p: 2,
            },
          },
        }}
      >
        <Box id={descriptionId}>
          <Typography
            component="h3"
            sx={{
              fontSize: "0.8125rem",
              fontWeight: 800,
              color: "#1E3A5F",
              mb: 1.25,
            }}
          >
            Screen layout modes
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2.25, "& li": { mb: 1.1 } }}>
            <Typography
              component="li"
              sx={{ fontSize: "0.8125rem", lineHeight: 1.55, color: "#526071" }}
            >
              <Box component="span" sx={{ fontWeight: 700, color: "#37465C" }}>
                Practice Mode
              </Box>{" "}
              — our familiar workspace: easier navigation and a layout tuned for learning and
              review.
            </Typography>
            <Typography
              component="li"
              sx={{ fontSize: "0.8125rem", lineHeight: 1.55, color: "#526071" }}
            >
              <Box component="span" sx={{ fontWeight: 700, color: "#1E3A5F" }}>
                Exam Mode
              </Box>{" "}
              — mirrors test-day presentation so you can get comfortable with the real CELPIP
              interface before you sit the exam.
            </Typography>
          </Box>
          <Typography
            component="p"
            sx={{
              fontSize: "0.75rem",
              lineHeight: 1.5,
              color: "#6B7888",
              m: 0,
              mt: 0.5,
            }}
          >
            You can switch anytime; your answers and progress stay in place.
          </Typography>
        </Box>
      </Popover>
    </Box>
  );
};

export default ExamLayoutToggle;
