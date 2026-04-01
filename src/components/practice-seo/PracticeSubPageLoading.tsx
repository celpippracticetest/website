import { Box, CircularProgress, Skeleton } from "@mui/material";

/** Lightweight shell while practice sub-route data loads (keeps layout stable). */
export default function PracticeSubPageLoading() {
  return (
    <Box
      component="main"
      sx={{
        bgcolor: "#F2F6FF",
        minHeight: "100vh",
        p: 3,
        maxWidth: 1280,
        mx: "auto",
        width: 1,
      }}
    >
      <Skeleton variant="rounded" width="55%" height={28} sx={{ mb: 1 }} />
      <Skeleton variant="text" width="85%" />
      <Skeleton variant="text" width="70%" />
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress size={36} />
      </Box>
    </Box>
  );
}
