import { Box, Skeleton, Typography } from "@mui/material";

/** Immediate shell for FCP while server data loads (exam list + optional progress). */
export default function ExamOverviewLoading() {
  return (
    <Box
      component="main"
      sx={{
        width: "100%",
        minHeight: "100vh",
        bgcolor: "#F2F6FF",
        py: { xs: 3, md: 4 },
        px: { xs: 2, md: 3 },
      }}
    >
      <Box sx={{ maxWidth: 1280, mx: "auto", width: 1 }}>
        <Typography
          component="h1"
          sx={{
            fontWeight: 800,
            color: "#37465C",
            fontSize: { xs: "1.75rem", md: "2rem" },
            lineHeight: 1.2,
            mb: 2,
          }}
        >
          CELPIP Mock Exams
        </Typography>
        <Typography sx={{ color: "#526071", fontSize: "1rem", mb: 3, maxWidth: 760 }}>
          Loading practice exams…
        </Typography>
        <Skeleton variant="rounded" height={112} sx={{ borderRadius: 3, mb: 2 }} />
        <Skeleton variant="rounded" height={96} sx={{ borderRadius: 2, mb: 1.5 }} />
        <Skeleton variant="rounded" height={96} sx={{ borderRadius: 2, mb: 1.5 }} />
        <Skeleton variant="rounded" height={96} sx={{ borderRadius: 2 }} />
      </Box>
    </Box>
  );
}
