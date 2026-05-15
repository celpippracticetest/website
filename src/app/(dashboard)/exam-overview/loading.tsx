import { Box, Skeleton, Typography } from "@mui/material";

const examOverviewPageBg =
  "linear-gradient(135deg, #FAFBFF 0%, #EEF2FF 50%, #F8FAFC 100%)";

/** Immediate shell for FCP while server data loads (exam list + optional progress). */
export default function ExamOverviewLoading() {
  return (
    <Box
      component="main"
      sx={{
        width: "100%",
        minHeight: "100vh",
        background: examOverviewPageBg,
        py: { xs: 3, md: 4 },
        px: { xs: 2, md: 3 },
      }}
    >
      <Box sx={{ maxWidth: 1280, mx: "auto", width: 1 }}>
        <Typography
          component="h1"
          sx={{
            fontWeight: 800,
            color: "#1B2B5A",
            fontSize: { xs: "1.75rem", md: "2rem" },
            lineHeight: 1.2,
            mb: 2,
          }}
        >
          CELPIP Mock Exams
        </Typography>
        <Typography sx={{ color: "#475569", fontSize: "1rem", mb: 3, maxWidth: 760 }}>
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
