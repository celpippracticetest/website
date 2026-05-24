import { Box, Skeleton } from "@mui/material";

/** Shell while /reading hub data loads — keeps layout stable for Speed Insights. */
export default function ReadingPageLoading() {
  return (
    <Box
      sx={{
        bgcolor: "#F2F6FF",
        minHeight: "100vh",
        px: 2,
        py: 4,
        maxWidth: 1200,
        mx: "auto",
        width: 1,
      }}
    >
      <Skeleton variant="rounded" width="70%" height={40} sx={{ mb: 3 }} />
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} variant="rounded" width={280} height={96} />
        ))}
      </Box>
    </Box>
  );
}
