"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Box, CircularProgress, Stack, Typography } from "@mui/material";
import MicrolearningLaunch, {
  LaunchFlow,
  Profile,
} from "@/components/flow/MicrolearningLaunch";

type FlowPayload = {
  flow: LaunchFlow | null;
  firstAction: string;
  profile: Profile;
};

export default function FlowPage() {
  const router = useRouter();
  const [payload, setPayload] = useState<FlowPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadFlow = async () => {
      try {
        const response = await fetch("/api/flow", { method: "GET" });
        if (!response.ok) {
          throw new Error("Could not load flow");
        }
        const data: FlowPayload = await response.json();
        if (!data?.flow) {
          throw new Error("Flow data is not available");
        }
        setPayload(data);
      } catch (err) {
        setError("We could not generate your flow right now.");
      } finally {
        setIsLoading(false);
      }
    };

    loadFlow();
  }, []);

  if (isLoading) {
    return (
      <Box
        sx={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: 2,
        }}
      >
        <Stack spacing={2} alignItems="center">
          <CircularProgress />
          <Typography sx={{ color: "#526071" }}>
            Building your microlearning flow...
          </Typography>
        </Stack>
      </Box>
    );
  }

  if (error || !payload?.flow) {
    return (
      <Box
        sx={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: 2,
        }}
      >
        <Stack spacing={1.5} alignItems="center">
          <Typography variant="h6" sx={{ color: "#212E42" }}>
            Flow unavailable
          </Typography>
          <Typography sx={{ color: "#526071", textAlign: "center", maxWidth: 520 }}>
            {error || "Please try again in a moment."}
          </Typography>
          <Typography
            role="button"
            onClick={() => router.push("/practice-overview")}
            sx={{
              color: "#316BFF",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Go to Practice Overview
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <>
      <h1 className="sr-only">Personalized CELPIP Microlearning Flow</h1>
      <MicrolearningLaunch
        flow={payload.flow}
        profile={payload.profile}
        firstAction={payload.firstAction || "/practice-overview"}
        disableAutoStart
        onStartNow={(url) => router.push(url || "/practice-overview")}
        onSkip={() => router.push("/practice-overview")}
      />
    </>
  );
}
