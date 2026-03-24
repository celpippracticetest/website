import { Box, type BoxProps } from "@mui/material";
import type { ReactNode } from "react";

interface OfficialSplitPaneProps {
  left: ReactNode;
  right: ReactNode;
  leftWidth?: BoxProps["sx"];
  leftPaneSx?: BoxProps["sx"];
  rightPaneSx?: BoxProps["sx"];
  sx?: BoxProps["sx"];
  rowFrom?: "md" | "lg";
}

const OfficialSplitPane = ({
  left,
  right,
  leftWidth,
  leftPaneSx,
  rightPaneSx,
  sx,
  rowFrom = "lg",
}: OfficialSplitPaneProps) => {
  const rowFlexDirection =
    rowFrom === "md"
      ? { xs: "column", md: "row" }
      : { xs: "column", lg: "row" };
  const rowBorderRight =
    rowFrom === "md"
      ? { md: "1px solid #D7DCE3" }
      : { lg: "1px solid #D7DCE3" };
  const rowBorderBottom =
    rowFrom === "md"
      ? { xs: "1px solid #D7DCE3", md: "none" }
      : { xs: "1px solid #D7DCE3", lg: "none" };
  const defaultLeftWidth =
    rowFrom === "md"
      ? { xs: "100%", md: "46%" }
      : { xs: "100%", lg: "46%" };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: rowFlexDirection,
        minHeight: { xs: 520, md: 640 },
        ...sx,
      }}
    >
      <Box
        sx={{
          width: defaultLeftWidth,
          borderRight: rowBorderRight,
          borderBottom: rowBorderBottom,
          backgroundColor: "#FFFFFF",
          p: { xs: 2.5, md: 3 },
          ...(typeof leftWidth === "object" ? leftWidth : {}),
          ...(typeof leftPaneSx === "object" ? leftPaneSx : {}),
        }}
      >
        {left}
      </Box>
      <Box
        sx={{
          flex: 1,
          p: { xs: 2.5, md: 3 },
          backgroundColor: "#FFFFFF",
          ...(typeof rightPaneSx === "object" ? rightPaneSx : {}),
        }}
      >
        {right}
      </Box>
    </Box>
  );
};

export default OfficialSplitPane;
