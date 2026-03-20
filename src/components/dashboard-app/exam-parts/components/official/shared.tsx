import { Typography, type TypographyProps } from "@mui/material";
import type { ReactNode } from "react";

export const officialFontFamily =
  '"Fira Sans", "Trebuchet MS", "Helvetica Neue", Helvetica, Arial, sans-serif';

export const buildOfficialExamTitle = (
  baseName: string | undefined,
  fallbackLabel: string,
  sectionLabel: string
) => {
  const resolvedName = (baseName ?? "").trim() || fallbackLabel;

  return resolvedName.toLowerCase().includes(sectionLabel.toLowerCase())
    ? resolvedName
    : `${resolvedName} - ${sectionLabel}`;
};

export const officialStatusTextSx = {
  fontFamily: officialFontFamily,
  fontSize: "12px",
  lineHeight: "20px",
  fontWeight: 400,
  color: "#4F5E74",
  whiteSpace: "nowrap",
} as const;

export interface OfficialViewFrameProps {
  title: string;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  primaryActionDisabled?: boolean;
  onBack?: () => void;
  backDisabled?: boolean;
  statusSlot?: ReactNode;
}

interface OfficialStatusTextProps extends Omit<TypographyProps, "children"> {
  children: ReactNode;
}

export const OfficialStatusText = ({
  children,
  sx,
  ...typographyProps
}: OfficialStatusTextProps) => (
  <Typography
    component="div"
    sx={{
      ...officialStatusTextSx,
      ...(Array.isArray(sx) ? {} : sx),
    }}
    {...typographyProps}
  >
    {children}
  </Typography>
);
