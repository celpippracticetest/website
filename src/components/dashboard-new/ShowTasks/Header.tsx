"use client";

import { Box } from "@mui/material";
import type { ReactNode } from "react";

const ShowTaskHeader = ({ children }: { children: ReactNode }) => {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: 1,
        px: 2,
        py: 4,
        minHeight: "100vh",
        m: { lg: 0 },
      }}
    >
      {children}
    </Box>
  );
};

export default ShowTaskHeader;
