import { Box, Button, type BoxProps, Typography } from "@mui/material";
import React from "react";

interface OfficialExamFrameProps {
  title: string;
  children: React.ReactNode;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  primaryActionDisabled?: boolean;
  onBack?: () => void;
  backDisabled?: boolean;
  statusSlot?: React.ReactNode;
  contentSx?: BoxProps["sx"];
}

const chromeBackground =
  "linear-gradient(180deg, #ECEFF3 0%, #D6DBE2 100%)";
const officialFontFamily =
  '"Fira Sans", "Trebuchet MS", "Helvetica Neue", Helvetica, Arial, sans-serif';

const actionButtonSx = {
  minWidth: "60px",
  height: "24px",
  px: 1.2,
  py: 0,
  borderRadius: "2px",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
  fontSize: "0.68rem",
  lineHeight: 1,
  fontWeight: 800,
  fontFamily: officialFontFamily,
  color: "#FFFFFF",
  background: "linear-gradient(180deg, #3F87F4 0%, #245FC7 100%)",
  border: "1px solid #1E4FA7",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3)",
  minHeight: "24px",
  "& .MuiButton-icon": {
    display: "none",
  },
  "&:hover": {
    background: "linear-gradient(180deg, #337BE7 0%, #1E57BD 100%)",
  },
  "&.Mui-disabled": {
    color: "#F3F6FF",
    background: "#8FAFDF",
    borderColor: "#7E9DCF",
  },
} as const;

const footerButtonSx = {
  minWidth: "60px",
  height: "24px",
  px: 1.2,
  py: 0,
  borderRadius: "2px",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
  fontSize: "0.68rem",
  lineHeight: 1,
  fontWeight: 800,
  fontFamily: officialFontFamily,
  color: "#FFFFFF",
  background: "linear-gradient(180deg, #3F87F4 0%, #245FC7 100%)",
  border: "1px solid #1E4FA7",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3)",
  minHeight: "24px",
  "& .MuiButton-icon": {
    display: "none",
  },
  "&:hover": {
    background: "linear-gradient(180deg, #337BE7 0%, #1E57BD 100%)",
  },
  "&.Mui-disabled": {
    color: "#F3F6FF",
    background: "#8FAFDF",
    borderColor: "#7E9DCF",
  },
} as const;

const OfficialExamFrame = ({
  title,
  children,
  primaryActionLabel,
  onPrimaryAction,
  primaryActionDisabled = false,
  onBack,
  backDisabled = false,
  statusSlot,
  contentSx,
}: OfficialExamFrameProps) => {
  return (
    <Box
      data-no-word-menu="true"
      sx={{
        width: "100%",
        overflow: "hidden",
        border: "1px solid #B7BEC8",
        borderRadius: "2px",
        backgroundColor: "#FFFFFF",
        boxShadow: "0 8px 20px rgba(40, 55, 79, 0.06)",
        fontFamily: officialFontFamily,
        "& *": {
          fontFamily: officialFontFamily,
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          px: { xs: 1.5, md: 1.75 },
          py: 0.9,
          minHeight: "38px",
          borderBottom: "1px solid #C4CAD2",
          background: chromeBackground,
        }}
      >
        <Typography
          component="p"
          sx={{
            fontSize: "14px",
            lineHeight: "18px",
            fontWeight: 700,
            fontFamily: officialFontFamily,
            color: "#425468",
          }}
        >
          {title}
        </Typography>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.25,
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          {statusSlot}
          {primaryActionLabel && onPrimaryAction ? (
            <Button
              onClick={onPrimaryAction}
              disabled={primaryActionDisabled}
              sx={actionButtonSx}
            >
              {primaryActionLabel}
            </Button>
          ) : null}
        </Box>
      </Box>

      <Box
        sx={{
          minHeight: { xs: 420, md: 600 },
          backgroundColor: "#FFFFFF",
          ...contentSx,
        }}
      >
        {children}
      </Box>

      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          px: { xs: 1.5, md: 1.75 },
          py: 0.9,
          minHeight: "38px",
          borderTop: "1px solid #C4CAD2",
          background: chromeBackground,
        }}
      >
        {onBack ? (
          <Button
            onClick={onBack}
            disabled={backDisabled}
            sx={footerButtonSx}
          >
            Back
          </Button>
        ) : null}
      </Box>
    </Box>
  );
};

export default OfficialExamFrame;
