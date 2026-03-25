"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Paper,
  Popover,
  Typography,
} from "@mui/material";
import {
  MOCK_EXAM_GUIDE_REPLAY_EVENT,
  MOCK_EXAM_GUIDE_TOUR_PERMANENT_KEY,
  MOCK_EXAM_GUIDE_TOUR_SESSION_KEY,
} from "./mockExamGuideTourConstants";

type TourStep = {
  title: string;
  body: string;
  placement: "dialog" | "popover";
  anchorId?: string;
  /** Cut a hole in the dim overlay so this region stays sharp (no full-screen blur over it). */
  spotlightGroupId?: string;
};

const STEPS: TourStep[] = [
  {
    title: "Welcome to your mock exam",
    placement: "dialog",
    body:
      "This is a full CELPIP-style mock. Your answers and progress for this run are saved with your attempt (the attemptId in the address bar). Work through each part in order, or use the tools in the next steps when you want to move faster or review.",
  },
  {
    title: "Practice Mode vs Exam Mode",
    placement: "popover",
    anchorId: "mock-exam-tour-layout-toggle",
    spotlightGroupId: "mock-exam-tour-mode-highlight",
    body:
      "Practice Mode keeps a study-friendly layout: part picker, scores, and navigation that make it easier to learn. Exam Mode tightens the screen so it feels closer to test day. You can switch any time—your answers and progress stay put.",
  },
  {
    title: "Parts menu",
    placement: "popover",
    anchorId: "mock-exam-tour-part-picker",
    spotlightGroupId: "mock-exam-tour-part-picker",
    body:
      "In Practice Mode, open this menu to jump to any Listening, Reading, Writing, or Speaking part. Your attempt stays the same as you move between parts. If you do not see this menu, switch back to Practice Mode using the toggle above.",
  },
  {
    title: "View Answers & Score",
    placement: "popover",
    anchorId: "mock-exam-tour-results-link",
    spotlightGroupId: "mock-exam-tour-results-highlight",
    body:
      "Tap View Answers & Score anytime in Practice Mode to open your results for this attempt: correct answers, explanations, and section scores for parts you have completed. You can return to the exam and keep working afterward.",
  },
  {
    title: "You are all set",
    placement: "dialog",
    body:
      "Use Quick tour next to the mode switch anytime for this walkthrough. The (i) button beside Practice Mode / Exam Mode summarizes both modes. View Answers & Score stays available in Practice Mode when you want to review results.",
  },
];

function readAnchorViewportPoint(anchorId: string): { top: number; left: number } | null {
  if (typeof document === "undefined") return null;
  const el = document.getElementById(anchorId);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;
  return {
    top: rect.bottom + 12,
    left: rect.left + rect.width / 2,
  };
}

type SpotlightRect = { left: number; top: number; width: number; height: number };

function readSpotlightRect(spotlightGroupId: string, pad: number): SpotlightRect | null {
  if (typeof document === "undefined") return null;
  const el = document.getElementById(spotlightGroupId);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return {
    left: r.left - pad,
    top: r.top - pad,
    width: r.width + pad * 2,
    height: r.height + pad * 2,
  };
}

/** Dim everything except `rect` so the highlighted control stays sharp and clickable. */
function TourSpotlightBackdrop({ rect }: { rect: SpotlightRect }) {
  const { left, top, width, height } = rect;
  const dim = "rgba(20, 29, 45, 0.45)";
  const panel = {
    position: "fixed" as const,
    zIndex: 1390,
    backgroundColor: dim,
    pointerEvents: "auto" as const,
  };

  return (
    <>
      <Box aria-hidden sx={{ ...panel, left: 0, top: 0, width: "100vw", height: Math.max(0, top) }} />
      <Box
        aria-hidden
        sx={{
          ...panel,
          left: 0,
          top: top + height,
          width: "100vw",
          bottom: 0,
        }}
      />
      <Box
        aria-hidden
        sx={{
          ...panel,
          left: 0,
          top,
          width: Math.max(0, left),
          height,
        }}
      />
      <Box
        aria-hidden
        sx={{
          ...panel,
          left: left + width,
          top,
          right: 0,
          height,
        }}
      />
    </>
  );
}

export default function MockExamGuideTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [anchorPoint, setAnchorPoint] = useState<{ top: number; left: number } | null>(null);
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);

  const stepDef = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const updateAnchor = useCallback(() => {
    if (!open || stepDef.placement !== "popover" || !stepDef.anchorId) {
      setAnchorPoint(null);
      return;
    }
    setAnchorPoint(readAnchorViewportPoint(stepDef.anchorId));
  }, [open, stepDef.anchorId, stepDef.placement]);

  const updateSpotlight = useCallback(() => {
    if (!open || !stepDef.spotlightGroupId) {
      setSpotlightRect(null);
      return;
    }
    setSpotlightRect(readSpotlightRect(stepDef.spotlightGroupId, 10));
  }, [open, stepDef.spotlightGroupId]);

  useLayoutEffect(() => {
    updateAnchor();
    updateSpotlight();
  }, [updateAnchor, updateSpotlight]);

  useEffect(() => {
    if (!open) return;
    const onChange = () => {
      updateAnchor();
      updateSpotlight();
    };
    window.addEventListener("resize", onChange);
    window.addEventListener("scroll", onChange, true);
    return () => {
      window.removeEventListener("resize", onChange);
      window.removeEventListener("scroll", onChange, true);
    };
  }, [open, updateAnchor, updateSpotlight]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const permanent = window.localStorage.getItem(MOCK_EXAM_GUIDE_TOUR_PERMANENT_KEY) === "1";
    const sessionDone = window.sessionStorage.getItem(MOCK_EXAM_GUIDE_TOUR_SESSION_KEY) === "1";
    if (permanent || sessionDone) return;

    const t = window.setTimeout(() => {
      setOpen(true);
      setStep(0);
    }, 700);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onReplay = () => {
      setStep(0);
      setDontShowAgain(false);
      setOpen(true);
    };
    window.addEventListener(MOCK_EXAM_GUIDE_REPLAY_EVENT, onReplay);
    return () => window.removeEventListener(MOCK_EXAM_GUIDE_REPLAY_EVENT, onReplay);
  }, []);

  const markSessionSeen = () => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(MOCK_EXAM_GUIDE_TOUR_SESSION_KEY, "1");
  };

  const closeTour = (opts?: { permanent?: boolean }) => {
    setOpen(false);
    markSessionSeen();
    if (opts?.permanent && typeof window !== "undefined") {
      window.localStorage.setItem(MOCK_EXAM_GUIDE_TOUR_PERMANENT_KEY, "1");
    }
  };

  const handleSkip = () => {
    closeTour();
  };

  const handleNext = () => {
    if (isLast) {
      closeTour({ permanent: dontShowAgain });
      return;
    }
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    setStep((s) => Math.max(0, s - 1));
  };

  const showPopover =
    open &&
    stepDef.placement === "popover" &&
    anchorPoint !== null &&
    stepDef.anchorId;

  const showDialog =
    open &&
    (stepDef.placement === "dialog" ||
      (stepDef.placement === "popover" && !anchorPoint));

  const stepBody =
    stepDef.placement === "popover" && !anchorPoint
      ? `${stepDef.body} (Tip: switch to Practice Mode if you do not see this control yet.)`
      : stepDef.body;

  const useSpotlightCutout =
    Boolean(showPopover && stepDef.spotlightGroupId && spotlightRect);

  return (
    <>
      {showPopover && useSpotlightCutout && spotlightRect && (
        <TourSpotlightBackdrop rect={spotlightRect} />
      )}
      {showPopover && !useSpotlightCutout && (
        <Box
          role="presentation"
          onClick={(e) => e.stopPropagation()}
          sx={{
            position: "fixed",
            inset: 0,
            zIndex: 1390,
            backgroundColor: "rgba(20, 29, 45, 0.42)",
            backdropFilter: "blur(2px)",
          }}
        />
      )}

      <Popover
        open={Boolean(showPopover)}
        onClose={() => {}}
        anchorReference="anchorPosition"
        anchorPosition={
          anchorPoint
            ? { top: anchorPoint.top, left: anchorPoint.left }
            : { top: 0, left: 0 }
        }
        transformOrigin={{ vertical: "top", horizontal: "center" }}
        disableScrollLock
        slotProps={{
          root: { sx: { zIndex: 1400 } },
          paper: {
            elevation: 12,
            sx: {
              maxWidth: 380,
              p: 2.25,
              borderRadius: "18px",
              border: "1px solid #E2EAF6",
              boxShadow: "0 20px 56px rgba(20, 29, 45, 0.2)",
            },
          },
        }}
      >
        <TourStepContent
          title={stepDef.title}
          body={stepBody}
          stepIndex={step}
          isLast={isLast}
          dontShowAgain={dontShowAgain}
          onDontShowChange={setDontShowAgain}
          onBack={handleBack}
          onNext={handleNext}
          onSkip={handleSkip}
          showDontShowCheckbox={isLast}
        />
      </Popover>

      <Dialog
        open={Boolean(showDialog)}
        onClose={(_, reason) => {
          if (reason === "backdropClick") return;
          handleSkip();
        }}
        disableScrollLock={false}
        slotProps={{
          paper: {
            sx: {
              borderRadius: "22px",
              maxWidth: 440,
              border: "1px solid #E2EAF6",
              boxShadow: "0 24px 64px rgba(20, 29, 45, 0.16)",
            },
          },
          backdrop: { sx: { backgroundColor: "rgba(20, 29, 45, 0.42)" } },
        }}
        sx={{ zIndex: 1400 }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: "#1E3A5F", pr: 2, pt: 2.5, pb: 1 }}>
          {stepDef.title}
        </DialogTitle>
        <DialogContent sx={{ pt: 0, pb: 1 }}>
          <Typography sx={{ color: "#526071", lineHeight: 1.6, fontSize: "0.95rem" }}>
            {stepBody}
          </Typography>
          {isLast && (
            <FormControlLabel
              sx={{ mt: 2, alignItems: "flex-start", ml: 0 }}
              control={
                <Checkbox
                  checked={dontShowAgain}
                  onChange={(_, c) => setDontShowAgain(c)}
                  sx={{ pt: 0.25 }}
                />
              }
              label={
                <Typography sx={{ fontSize: "0.875rem", color: "#526071" }}>
                  Don&apos;t show this tour automatically again
                </Typography>
              }
            />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 0, gap: 1, flexWrap: "wrap" }}>
          <Button color="inherit" onClick={handleSkip} sx={{ textTransform: "none", mr: "auto" }}>
            Skip tour
          </Button>
          {step > 0 && (
            <Button variant="outlined" onClick={handleBack} sx={{ textTransform: "none" }}>
              Back
            </Button>
          )}
          <Button variant="contained" onClick={handleNext} sx={{ textTransform: "none" }}>
            {isLast ? "Done" : "Next"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function TourStepContent(props: {
  title: string;
  body: string;
  stepIndex: number;
  isLast: boolean;
  dontShowAgain: boolean;
  onDontShowChange: (v: boolean) => void;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
  showDontShowCheckbox: boolean;
}) {
  const {
    title,
    body,
    stepIndex,
    isLast,
    dontShowAgain,
    onDontShowChange,
    onBack,
    onNext,
    onSkip,
    showDontShowCheckbox,
  } = props;

  return (
    <Paper elevation={0} sx={{ backgroundColor: "transparent", boxShadow: "none" }}>
      <Typography
        component="h2"
        sx={{ fontWeight: 800, color: "#1E3A5F", fontSize: "1rem", mb: 1.25 }}
      >
        {title}
      </Typography>
      <Typography sx={{ color: "#526071", lineHeight: 1.6, fontSize: "0.9rem", mb: 2 }}>
        {body}
      </Typography>
      {showDontShowCheckbox && (
        <FormControlLabel
          sx={{ mb: 1.5, alignItems: "flex-start", ml: 0 }}
          control={
            <Checkbox
              checked={dontShowAgain}
              onChange={(_, c) => onDontShowChange(c)}
              size="small"
              sx={{ pt: 0.25 }}
            />
          }
          label={
            <Typography sx={{ fontSize: "0.8125rem", color: "#526071" }}>
              Don&apos;t show this tour automatically again
            </Typography>
          }
        />
      )}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
        <Button size="small" color="inherit" onClick={onSkip} sx={{ textTransform: "none", mr: "auto" }}>
          Skip tour
        </Button>
        {stepIndex > 0 && (
          <Button size="small" variant="outlined" onClick={onBack} sx={{ textTransform: "none" }}>
            Back
          </Button>
        )}
        <Button size="small" variant="contained" onClick={onNext} sx={{ textTransform: "none" }}>
          {isLast ? "Done" : "Next"}
        </Button>
      </Box>
    </Paper>
  );
}
