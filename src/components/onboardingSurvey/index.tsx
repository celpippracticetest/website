"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { useUser } from "@clerk/nextjs";
import {
  Box,
  Button,
  Checkbox,
  TextField,
  Typography,
  Paper,
  LinearProgress,
  IconButton,
  FormControlLabel,
  Stack,
} from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import Add from "@mui/icons-material/Add";
import Remove from "@mui/icons-material/Remove";
import Lottie from "lottie-react";
import { useEffect, useState as useReactState } from "react";
import { useRouter } from "next/navigation";
import MicrolearningLaunch from "@/components/flow/MicrolearningLaunch";
import {
  PENDING_HOME_DIAGNOSTIC_KEY,
  mapExamDateIsoToSurveyTestDate,
  targetClbStringToSkillScore,
} from "@/lib/pendingHomeDiagnostic";

type FlowStep = {
  id: string;
  kind: "learning" | "practice" | "review";
  title: string;
  description: string;
  durationMinutes: number;
  actionHref?: string;
  ctaLabel: string;
};

type FlowPayload = {
  flow: {
    urgency: "high" | "medium" | "low";
    daysToExam: number | null;
    focusSkill: "listening" | "reading" | "writing" | "speaking";
    targetScore: number | null;
    subGoal: string | null;
    reasoning: string[];
    steps: FlowStep[];
  };
  firstAction: string;
  profile: {
    subGoal: string | null;
    targetScore: number | null;
    focusSkill: string | null;
    testDate: string | null;
  };
};

const PRIMARY_GOAL_OPTIONS = [
  "Canadian Permanent Residency (Express Entry)",
  "Canadian Citizenship",
  "Professional Licensing & Designations",
  "Employment & Education",
  "Australian Migration (DHA)",
  "Other (please specify)",
];

const PRIMARY_GOAL_SUB_OPTIONS: Record<string, string[]> = {
  "Canadian Permanent Residency (Express Entry)": [
    "Federal Skilled Worker Program (FSWP)",
    "Canadian Experience Class (CEC) - TEER 0 or 1",
    "Canadian Experience Class (CEC) - TEER 2 or 3",
    "Federal Skilled Trades Program (FSTP)",
    "Provincial Nominee Program (PNP)",
    "Other (please specify)",
  ],
  "Canadian Citizenship": [
    "Citizenship Application (Ages 18-54)",
    "Other (please specify)",
  ],
  "Professional Licensing & Designations": [
    "Real Estate License (BC - BCFSA)",
    "Pharmacist License (OCP / National)",
    "College of Physicians and Surgeons (CPSO)",
    "Nursing (Various Provincial Colleges)",
    "Immigration Consultant (CICC)",
    "Other (please specify)",
  ],
  "Employment & Education": [
    "Post-Graduation Work Permit (PGWP)",
    "Canadian Corporate Employers",
    "Other (please specify)",
  ],
  "Australian Migration (DHA)": [
    "Superior English (Highest Points)",
    "Proficient English",
    "Competent English (Minimum for PR)",
    "Temporary Graduate Visa (Subclass 485)",
    "Vocational English (Subclass 482)",
    "Other (please specify)",
  ],
};

const TEST_DATE_OPTIONS = [
  "In less than 2 weeks",
  "In 1 month",
  "In 2+ months",
  "I haven't booked it yet",
];

const FOCUS_SKILL_OPTIONS = [
  "Speaking",
  "Writing",
  "Listening",
  "Reading",
  "Exam strategy (time management, format)",
  "Other (please specify)",
];

// CLB score requirements based on sub-goal selection
const SUB_GOAL_CLB_REQUIREMENTS: Record<string, { clb: string; description: string; additionalInfo?: string }> = {
  "Federal Skilled Worker Program (FSWP)": {
    clb: "CLB 7 (minimum)",
    description: "You need a minimum of CLB 7 in all four skills (Listening, Reading, Writing, Speaking) to be eligible for Express Entry.",
    additionalInfo: "For competitive CRS scores, aim for CLB 9 or higher in all skills.",
  },
  "Canadian Experience Class (CEC) - TEER 0 or 1": {
    clb: "CLB 7 (minimum)",
    description: "For NOC TEER 0 or 1 positions, you need a minimum of CLB 7 in all four skills.",
    additionalInfo: "Higher scores (CLB 9+) significantly boost your CRS points.",
  },
  "Canadian Experience Class (CEC) - TEER 2 or 3": {
    clb: "CLB 5 (minimum)",
    description: "For NOC TEER 2 or 3 positions, you need a minimum of CLB 5 in all four skills.",
    additionalInfo: "Consider aiming for CLB 7+ to maximize your CRS score.",
  },
  "Federal Skilled Trades Program (FSTP)": {
    clb: "CLB 5 (Listening & Speaking), CLB 4 (Reading & Writing)",
    description: "For the Federal Skilled Trades Program, you need CLB 5 in Listening and Speaking, and CLB 4 in Reading and Writing.",
    additionalInfo: "Higher scores improve your Express Entry profile competitiveness.",
  },
  "Provincial Nominee Program (PNP)": {
    clb: "CLB 4-7 (varies by province)",
    description: "PNP requirements vary by province, typically ranging from CLB 4 to CLB 7.",
    additionalInfo: "Check your specific province's requirements for exact CLB levels needed.",
  },
  "Citizenship Application (Ages 18-54)": {
    clb: "CLB 4 (minimum)",
    description: "For Canadian citizenship, you need a minimum of CLB 4 in Listening and Speaking.",
    additionalInfo: "CELPIP General LS (Listening & Speaking only) is sufficient for citizenship applications.",
  },
  "Real Estate License (BC - BCFSA)": {
    clb: "CLB 7 (minimum)",
    description: "BCFSA requires a minimum of CLB 7 in all four skills for real estate licensing.",
    additionalInfo: "Ensure all skills meet the minimum requirement for successful licensing.",
  },
  "Pharmacist License (OCP / National)": {
    clb: "CLB 7-9 (varies by province)",
    description: "Pharmacy licensing requirements vary by province, typically CLB 7-9 in all four skills.",
    additionalInfo: "Check with your provincial pharmacy regulatory body for specific requirements.",
  },
  "College of Physicians and Surgeons (CPSO)": {
    clb: "CLB 7-9 (varies)",
    description: "Medical licensing requirements vary, typically CLB 7-9 in all four skills.",
    additionalInfo: "Contact CPSO or your provincial medical regulatory body for exact requirements.",
  },
  "Nursing (Various Provincial Colleges)": {
    clb: "CLB 7-9 (varies by province)",
    description: "Nursing licensing requirements vary by province, typically CLB 7-9 in all four skills.",
    additionalInfo: "Verify specific CLB requirements with your provincial nursing regulatory body.",
  },
  "Immigration Consultant (CICC)": {
    clb: "CLB 9 (minimum)",
    description: "To become a Regulated Canadian Immigration Consultant (RCIC), you need CLB 9 in all four skills.",
    additionalInfo: "This is one of the highest CLB requirements, so thorough preparation is essential.",
  },
  "Post-Graduation Work Permit (PGWP)": {
    clb: "CLB 7+ (recommended)",
    description: "While not always required, CLB 7+ demonstrates strong English proficiency for Canadian employers.",
    additionalInfo: "Higher CLB scores improve your job prospects and career opportunities.",
  },
  "Canadian Corporate Employers": {
    clb: "CLB 7-9 (varies by employer)",
    description: "Corporate employers typically look for CLB 7-9, depending on the role and industry.",
    additionalInfo: "Higher CLB scores open more career opportunities and advancement possibilities.",
  },
  "Superior English (Highest Points)": {
    clb: "CLB 8+ (all skills)",
    description: "For Australian migration, Superior English requires CLB 8 or higher in all four skills.",
    additionalInfo: "This gives you the maximum points (20 points) for English language proficiency.",
  },
  "Proficient English": {
    clb: "CLB 7 (all skills)",
    description: "Proficient English for Australian migration requires CLB 7 in all four skills.",
    additionalInfo: "This gives you 10 points towards your migration points total.",
  },
  "Competent English (Minimum for PR)": {
    clb: "CLB 6 (all skills)",
    description: "Competent English is the minimum requirement for Australian PR, requiring CLB 6 in all four skills.",
    additionalInfo: "This gives you 0 points but meets the minimum requirement for permanent residency.",
  },
  "Temporary Graduate Visa (Subclass 485)": {
    clb: "CLB 6 (minimum)",
    description: "For the Temporary Graduate Visa, you need a minimum of CLB 6 in all four skills.",
    additionalInfo: "Higher scores may be required depending on your field of study.",
  },
  "Vocational English (Subclass 482)": {
    clb: "CLB 5 (minimum)",
    description: "For the Temporary Skill Shortage Visa (Subclass 482), you need a minimum of CLB 5 in all four skills.",
    additionalInfo: "Some occupations may require higher CLB levels.",
  },
};

const theme = createTheme({
  palette: {
    primary: {
      main: "#F27059",
    },
    secondary: {
      main: "#212E42",
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: "24px",
          textTransform: "none",
          fontWeight: 400,
          height: "40px",
          fontSize: "14px",
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          padding: "8px",
        },
      },
    },
  },
});

export default function OnboardingSurvey({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [primaryGoal, setPrimaryGoal] = useState("");
  const [customPrimaryGoal, setCustomPrimaryGoal] = useState("");
  const [subGoal, setSubGoal] = useState("");
  const [customSubGoal, setCustomSubGoal] = useState("");
  const [testDate, setTestDate] = useState("");
  const [focusSkill, setFocusSkill] = useState("");
  const [customFocusSkill, setCustomFocusSkill] = useState("");
  const [targetScores, setTargetScores] = useState({
    listening: 7,
    reading: 7,
    writing: 7,
    speaking: 7,
  });
  const { user } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPersonalizing, setIsPersonalizing] = useState(false);
  const [construccionAnimation, setConstruccionAnimation] = useReactState<any>(null);
  const [flowPayload, setFlowPayload] = useState<FlowPayload | null>(null);

  useEffect(() => {
    // Load Lottie animation data
    fetch("/images/construccion.json")
      .then((res) => res.json())
      .then((data) => setConstruccionAnimation(data))
      .catch((err) => console.error("Failed to load Lottie animation:", err));
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PENDING_HOME_DIAGNOSTIC_KEY);
      if (!raw) return;
      localStorage.removeItem(PENDING_HOME_DIAGNOSTIC_KEY);
      const parsed = JSON.parse(raw) as { targetClb?: string; examDateIso?: string };
      const skill = targetClbStringToSkillScore(parsed.targetClb ?? "");
      if (skill !== null) {
        setTargetScores({
          listening: skill,
          reading: skill,
          writing: skill,
          speaking: skill,
        });
      }
      if (parsed.examDateIso) {
        const bucket = mapExamDateIsoToSurveyTestDate(parsed.examDateIso);
        if (bucket) setTestDate(bucket);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Get sub-options for the selected primary goal
  const getSubOptions = () => {
    if (primaryGoal === "Other (please specify)") {
      return [];
    }
    return PRIMARY_GOAL_SUB_OPTIONS[primaryGoal] || [];
  };

  // Check if current primary goal has sub-options
  const hasSubOptions = () => {
    return getSubOptions().length > 0;
  };

  const handleScoreChange = (skill: string, value: number) => {
    const newValue = Math.max(5, Math.min(12, value));
    setTargetScores(prev => ({
      ...prev,
      [skill]: newValue,
    }));
  };

  const handlePrimaryGoalSelect = (option: string) => {
    setPrimaryGoal(option);
    setSubGoal("");
    setCustomPrimaryGoal("");
    setCustomSubGoal("");

    if (option !== "Other (please specify)") {
      const selectedHasSubOptions = (PRIMARY_GOAL_SUB_OPTIONS[option] || []).length > 0;
      setStep(selectedHasSubOptions ? 2 : 3);
    }
  };

  const handleSubGoalSelect = (option: string) => {
    setSubGoal(option);
    if (option !== "Other (please specify)") {
      setCustomSubGoal("");
      setStep(3);
    }
  };

  const handleTestDateSelect = (option: string) => {
    setTestDate(option);
    setStep(4);
  };

  const handleNext = () => {
    if (step === 1 && primaryGoal) {
      // If primary goal has sub-options, go to step 2 (sub-options)
      // Otherwise, skip to step 3 (test date)
      if (hasSubOptions()) {
        setStep(2);
      } else {
        setStep(3);
      }
    } else if (step === 2 && subGoal) {
      // After sub-goal, go to test date
      setStep(3);
    } else if (step === 3 && testDate) {
      // After test date, go to focus skill
      setStep(4);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      if (step === 4 && !hasSubOptions()) {
        // If on step 4 (focus skill) and no sub-options, go back to step 1
        setStep(1);
      } else if (step === 3 && !hasSubOptions()) {
        // If on step 3 (test date) and no sub-options, go back to step 1
        setStep(1);
      } else {
        setStep(step - 1);
      }
    }
  };

  const progressValue = (step / 4) * 100;
  const handleFlowStart = (url: string) => {
    onComplete();
    const userPlan = (user?.publicMetadata as Record<string, unknown> | undefined)?.plan;
    const isFreeUser = !userPlan || userPlan === "free";
    if (isFreeUser) {
      router.push("/final-offer");
      return;
    }
    router.push(url || "/practice-overview");
  };

  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          display: "flex",
          px: { xs: 2, sm: 3, md: 10 },
          flexWrap: { xs: "wrap", md: "nowrap" },
          pb: { xs: "111px", md: 0 },
          width: "100%",
          overflow: "auto",
          gap: { xs: 3, md: 11.5 },
          justifyContent: "center",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexShrink: { sm: 0 },
            mt: { xs: 5, md: 0 },
            alignItems: "center",
            gap: { xs: 2.5, sm: 5, md: 2 },
            flexDirection: { xs: "column", sm: "row", md: "column" },
          }}
        >
          {step === 1 ? (
            <Image
              alt="plan sale modal"
              width={288}
              height={432}
              style={{
                flexShrink: 0,
                width: "54px",
                height: "81px",
                marginTop: "-10px",
              }}
              className="screen744:!shrink-0 screen1280:!mt-[-10px] screen744:!w-[121px] screen744:!h-[181px] screen1280:!w-[288px] screen1280:!h-[432px]"
              src="/images/question-after-sign-up-logo-step-one.png"
            />
          ) : (
            <Image
              alt="plan sale modal"
              width={324}
              height={290}
              style={{
                flexShrink: 0,
                width: "89px",
                height: "80px",
                marginTop: "126px",
              }}
              className="shrink-0 screen1280!mt-[126px] screen744:!w-[202px] screen744:!h-[180px] screen1280:!w-[324px] screen1280:!h-[290px]"
              src="/images/question-after-sign-up-logo-step-two.png"
            />
          )}

          <Typography
            variant="body1"
            sx={{
              maxWidth: "394px",
              fontSize: { xs: "18px", sm: "24px" },
              fontWeight: 500,
              width: "100%",
            }}
          >
            Help us personalize your experience and deliver the best preparation plan for you.
          </Typography>
        </Box>

        <Paper
          elevation={0}
          sx={{
            width: "100%",
            maxWidth: "900px",
            maxHeight: "fit-content",
            flexShrink: 1,
            border: "1px solid #D5D6D8",
            borderRadius: "12px",
            p: { xs: 2, sm: 5 },
            display: "flex",
            flexDirection: "column",
            overflow: "visible",
          }}
        >
          <Box sx={{ mt: 5, mb: 3 }}>
            <LinearProgress
              variant="determinate"
              value={progressValue}
              sx={{
                height: "4px",
                borderRadius: "10px",
                backgroundColor: "#E6E6E6",
                "& .MuiLinearProgress-bar": {
                  backgroundColor: "#F27059",
                  borderRadius: "10px",
                },
              }}
            />
          </Box>

          <Typography
            variant="body2"
            sx={{
              mt: { xs: 3, sm: 4 },
              mb: { xs: 3, sm: 4 },
              fontSize: "16px",
              color: "#37465C",
            }}
          >
            Help us improve your experience.
          </Typography>

          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontSize: "20px",
                  color: "#212E42",
                  fontWeight: 600,
                  mb: 3.5,
                }}
              >
                What is your primary goal for taking the CELPIP?
              </Typography>

              <Stack spacing={2} sx={{ mb: { xs: 3, sm: 4 } }}>
                {PRIMARY_GOAL_OPTIONS.map((option) => (
                  <Box
                    key={option}
                    onClick={() => handlePrimaryGoalSelect(option)}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      height: { xs: "48px", sm: "52px" },
                      px: { xs: 2, sm: 4 },
                      borderRadius: "40px",
                      transition: "all 0.3s",
                      cursor: "pointer",
                      fontSize: { xs: "12px", sm: "16px" },
                      width: "fit-content",
                      backgroundColor: primaryGoal === option ? "#F27059" : "white",
                      color: primaryGoal === option ? "white" : "#212E42",
                      border: "1px solid transparent",
                      "&:hover": {
                        backgroundColor: primaryGoal === option ? "#F27059" : "#F9FAFB",
                      },
                    }}
                  >
                    <Checkbox
                      checked={primaryGoal === option}
                      onChange={() => handlePrimaryGoalSelect(option)}
                      onClick={(e) => e.stopPropagation()}
                      sx={{
                        color: primaryGoal === option ? "white" : "#9CA3AF",
                        "&.Mui-checked": {
                          color: primaryGoal === option ? "white" : "#F27059",
                        },
                        pointerEvents: "none",
                      }}
                    />
                    <Typography
                      component="span"
                      sx={{
                        fontSize: "inherit",
                        fontWeight: 400,
                        userSelect: "none",
                      }}
                    >
                      {option}
                    </Typography>
                  </Box>
                ))}
              </Stack>

              {primaryGoal === "Other (please specify)" && (
                <TextField
                  fullWidth
                  id="customPrimaryGoal"
                  placeholder="Write your answer"
                  value={customPrimaryGoal}
                  onChange={(e) => setCustomPrimaryGoal(e.target.value)}
                  sx={{ mb: 3 }}
                  variant="outlined"
                />
              )}

              <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 3 }}>
                <Button
                  variant="contained"
                  disabled={!primaryGoal || (primaryGoal === "Other (please specify)" && !customPrimaryGoal.trim())}
                  onClick={handleNext}
                  sx={{
                    backgroundColor: "#F27059",
                    "&:hover": {
                      backgroundColor: "#E55A42",
                    },
                    "&.Mui-disabled": {
                      backgroundColor: "#D1D5DB",
                      color: "white",
                    },
                  }}
                >
                  Next Question
                </Button>
              </Box>
            </motion.div>
          )}

          {step === 2 && hasSubOptions() && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontSize: "20px",
                  color: "#212E42",
                  fontWeight: 600,
                  mb: 3.5,
                }}
              >
                Which program or pathway are you applying for?
              </Typography>

              <Stack spacing={2} sx={{ mb: { xs: 3, sm: 4 } }}>
                {getSubOptions().map((option) => (
                  <Box
                    key={option}
                    sx={{
                      display: "flex",
                      flexDirection: {
                        xs: option === "Other (please specify)" ? "column" : "row",
                        sm: "row",
                      },
                      gap: option === "Other (please specify)" ? { xs: 3, sm: 1 } : 0,
                      width: "100%",
                    }}
                  >
                    <Box
                      onClick={() => handleSubGoalSelect(option)}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        minHeight: { xs: "48px", sm: "52px" },
                        px: { xs: 2, sm: 4 },
                        borderRadius: "40px",
                        transition: "all 0.3s",
                        cursor: "pointer",
                        fontSize: { xs: "12px", sm: "16px" },
                        width: "100%",
                        maxWidth: "100%",
                        backgroundColor: subGoal === option ? "#F27059" : "white",
                        color: subGoal === option ? "white" : "#212E42",
                        border: "1px solid transparent",
                        "&:hover": {
                          backgroundColor: subGoal === option ? "#F27059" : "#F9FAFB",
                        },
                      }}
                    >
                      <Checkbox
                        checked={subGoal === option}
                        onChange={() => handleSubGoalSelect(option)}
                        onClick={(e) => e.stopPropagation()}
                        sx={{
                          color: subGoal === option ? "white" : "#9CA3AF",
                          "&.Mui-checked": {
                            color: subGoal === option ? "white" : "#F27059",
                          },
                          pointerEvents: "none",
                        }}
                      />
                      <Typography
                        component="span"
                        sx={{
                          fontSize: "inherit",
                          fontWeight: 400,
                          userSelect: "none",
                        }}
                      >
                        {option}
                      </Typography>
                    </Box>
                    {option === "Other (please specify)" && subGoal === option && (
                      <TextField
                        id="customSubGoal"
                        placeholder="Write your answer"
                        value={customSubGoal}
                        onChange={(e) => setCustomSubGoal(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        sx={{ width: { xs: "100%", sm: "300px" }, ml: { sm: 2 } }}
                        variant="outlined"
                      />
                    )}
                  </Box>
                ))}
              </Stack>

              <Box 
                sx={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center", 
                  gap: 3,
                  mb: 3,
                  flexWrap: { xs: "wrap", sm: "nowrap" },
                }}
              >
                <Button
                  variant="outlined"
                  onClick={handleBack}
                  sx={{
                    borderColor: "#76808F",
                    color: "#76808F",
                    maxWidth: "82px",
                    flexShrink: 0,
                    "&:hover": {
                      backgroundColor: "#3B82F6",
                      borderColor: "#3B82F6",
                      color: "white",
                    },
                  }}
                >
                  Back
                </Button>

                <Button
                  variant="contained"
                  disabled={!subGoal || (subGoal === "Other (please specify)" && !customSubGoal.trim())}
                  onClick={handleNext}
                  sx={{
                    backgroundColor: "#F27059",
                    flexShrink: 0,
                    "&:hover": {
                      backgroundColor: "#E55A42",
                    },
                    "&.Mui-disabled": {
                      backgroundColor: "#D1D5DB",
                      color: "white",
                    },
                  }}
                >
                  Next Question
                </Button>
              </Box>

              {/* Show CLB requirements and setup information when sub-goal is selected */}
              {subGoal && subGoal !== "Other (please specify)" && SUB_GOAL_CLB_REQUIREMENTS[subGoal] && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      mb: 3,
                      backgroundColor: "#F0F9FF",
                      border: "1px solid #BAE6FD",
                      borderRadius: "12px",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
                      <Box
                        sx={{
                          minWidth: "40px",
                          height: "40px",
                          borderRadius: "50%",
                          backgroundColor: "#F27059",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Typography
                          sx={{
                            color: "white",
                            fontWeight: 700,
                            fontSize: "18px",
                          }}
                        >
                          ✓
                        </Typography>
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography
                          variant="h6"
                          sx={{
                            fontSize: "18px",
                            fontWeight: 600,
                            color: "#212E42",
                            mb: 1.5,
                          }}
                        >
                          Your Required CLB Score: {SUB_GOAL_CLB_REQUIREMENTS[subGoal].clb}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            fontSize: "14px",
                            color: "#37465C",
                            mb: 1.5,
                            lineHeight: 1.6,
                          }}
                        >
                          {SUB_GOAL_CLB_REQUIREMENTS[subGoal].description}
                        </Typography>
                        {SUB_GOAL_CLB_REQUIREMENTS[subGoal].additionalInfo && (
                          <Typography
                            variant="body2"
                            sx={{
                              fontSize: "14px",
                              color: "#37465C",
                              mb: 2,
                              lineHeight: 1.6,
                              fontStyle: "italic",
                            }}
                          >
                            {SUB_GOAL_CLB_REQUIREMENTS[subGoal].additionalInfo}
                          </Typography>
                        )}
                        <Box
                          sx={{
                            mt: 2,
                            pt: 2,
                            borderTop: "1px solid #BAE6FD",
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              fontSize: "14px",
                              color: "#212E42",
                              fontWeight: 500,
                              mb: 1,
                            }}
                          >
                            🎯 Personalized Setup:
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              fontSize: "14px",
                              color: "#37465C",
                              lineHeight: 1.6,
                            }}
                          >
                            We've configured your practice environment based on your goal. Your study plan, practice tests, and learning materials are now tailored to help you achieve the CLB score you need for {subGoal}.
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Paper>
                </motion.div>
              )}
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontSize: "20px",
                  color: "#212E42",
                  fontWeight: 600,
                  mb: 3.5,
                }}
              >
                When is your official test date?
              </Typography>

              <Stack spacing={2} sx={{ mb: { xs: 3, sm: 4 } }}>
                {TEST_DATE_OPTIONS.map((option) => (
                  <Box
                    key={option}
                    onClick={() => handleTestDateSelect(option)}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      height: { xs: "48px", sm: "52px" },
                      px: { xs: 2, sm: 4 },
                      borderRadius: "40px",
                      transition: "all 0.3s",
                      cursor: "pointer",
                      fontSize: { xs: "12px", sm: "16px" },
                      width: "fit-content",
                      backgroundColor: testDate === option ? "#F27059" : "white",
                      color: testDate === option ? "white" : "#212E42",
                      border: "1px solid transparent",
                      "&:hover": {
                        backgroundColor: testDate === option ? "#F27059" : "#F9FAFB",
                      },
                    }}
                  >
                    <Checkbox
                      checked={testDate === option}
                      onChange={() => handleTestDateSelect(option)}
                      onClick={(e) => e.stopPropagation()}
                      sx={{
                        color: testDate === option ? "white" : "#9CA3AF",
                        "&.Mui-checked": {
                          color: testDate === option ? "white" : "#F27059",
                        },
                        pointerEvents: "none",
                      }}
                    />
                    <Typography
                      component="span"
                      sx={{
                        fontSize: "inherit",
                        fontWeight: 400,
                        userSelect: "none",
                      }}
                    >
                      {option}
                    </Typography>
                  </Box>
                ))}
              </Stack>

              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 3 }}>
                <Button
                  variant="outlined"
                  onClick={handleBack}
                  sx={{
                    borderColor: "#76808F",
                    color: "#76808F",
                    maxWidth: "82px",
                    "&:hover": {
                      backgroundColor: "#3B82F6",
                      borderColor: "#3B82F6",
                      color: "white",
                    },
                  }}
                >
                  Back
                </Button>

                <Button
                  variant="contained"
                  disabled={!testDate}
                  onClick={handleNext}
                  sx={{
                    backgroundColor: "#F27059",
                    "&:hover": {
                      backgroundColor: "#E55A42",
                    },
                    "&.Mui-disabled": {
                      backgroundColor: "#D1D5DB",
                      color: "white",
                    },
                  }}
                >
                  Next Question
                </Button>
              </Box>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontSize: "20px",
                  color: "#212E42",
                  fontWeight: 600,
                  mb: 3.5,
                }}
              >
                Which skill are you focused on improving first?
              </Typography>

              <Stack spacing={2} sx={{ mb: { xs: 3, sm: 4 } }}>
                {FOCUS_SKILL_OPTIONS.map((option, index) => (
                  <Box
                    key={option}
                    sx={{
                      display: "flex",
                      flexDirection: {
                        xs: index === 5 ? "column" : "row",
                        sm: "row",
                      },
                      gap: index === 5 ? { xs: 3, sm: 1 } : 0,
                    }}
                  >
                    <Box
                      onClick={() => setFocusSkill(option)}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        height: { xs: "48px", sm: "52px" },
                        px: { xs: 2, sm: 4 },
                        borderRadius: "40px",
                        transition: "all 0.3s",
                        cursor: "pointer",
                        fontSize: { xs: "12px", sm: "16px" },
                        width: "fit-content",
                        backgroundColor: focusSkill === option ? "#F27059" : "white",
                        color: focusSkill === option ? "white" : "#212E42",
                        border: "1px solid transparent",
                        "&:hover": {
                          backgroundColor: focusSkill === option ? "#F27059" : "#F9FAFB",
                        },
                      }}
                    >
                      <Checkbox
                        checked={focusSkill === option}
                        onChange={() => setFocusSkill(option)}
                        onClick={(e) => e.stopPropagation()}
                        sx={{
                          color: focusSkill === option ? "white" : "#9CA3AF",
                          "&.Mui-checked": {
                            color: focusSkill === option ? "white" : "#F27059",
                          },
                          pointerEvents: "none",
                        }}
                      />
                      <Typography
                        component="span"
                        sx={{
                          fontSize: "inherit",
                          fontWeight: 400,
                          userSelect: "none",
                        }}
                      >
                        {option}
                      </Typography>
                    </Box>
                    {option === "Other (please specify)" && focusSkill === option && (
                      <TextField
                        id="customFocusSkill"
                        placeholder="Write your answer"
                        value={customFocusSkill}
                        onChange={(e) => setCustomFocusSkill(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        sx={{ width: { xs: "100%", sm: "300px" }, ml: { sm: 2 } }}
                        variant="outlined"
                      />
                    )}
                  </Box>
                ))}
              </Stack>

              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 3 }}>
                <Button
                  variant="outlined"
                  onClick={handleBack}
                  sx={{
                    borderColor: "#76808F",
                    color: "#76808F",
                    maxWidth: "82px",
                    "&:hover": {
                      backgroundColor: "#3B82F6",
                      borderColor: "#3B82F6",
                      color: "white",
                    },
                  }}
                >
                  Back
                </Button>

                <Button
                  variant="contained"
                  disabled={isSubmitting || isPersonalizing || !focusSkill || (focusSkill === "Other (please specify)" && !customFocusSkill.trim())}
                  onClick={async () => {
                    try {
                      setIsPersonalizing(true);

                      // Keep the personalization feedback visible for a short moment.
                      await new Promise((resolve) => setTimeout(resolve, 6000));

                      setIsSubmitting(true);
                      const submitResponse = await fetch("/api/onboarding", {
                        method: "POST",
                        body: JSON.stringify({
                          action: "submit",
                          answers: {
                            primaryGoal: primaryGoal === "Other (please specify)" ? customPrimaryGoal : primaryGoal,
                            customPrimaryGoal: primaryGoal === "Other (please specify)" ? customPrimaryGoal : "",
                            subGoal: hasSubOptions() && subGoal ? (subGoal === "Other (please specify)" ? customSubGoal : subGoal) : "",
                            customSubGoal: hasSubOptions() && subGoal === "Other (please specify)" ? customSubGoal : "",
                            testDate,
                            focusSkill,
                            customFocusSkill: focusSkill === "Other (please specify)" ? customFocusSkill : "",
                            targetScores,
                          },
                        }),
                        headers: {
                          "Content-Type": "application/json",
                        },
                      });

                      if (!submitResponse.ok) {
                        throw new Error("Failed to submit onboarding");
                      }

                      const flowResponse = await fetch("/api/flow", { method: "GET" });
                      if (!flowResponse.ok) {
                        throw new Error("Failed to load microlearning flow");
                      }

                      const payload: FlowPayload = await flowResponse.json();
                      setFlowPayload(payload);
                      user?.reload();
                    } catch (error) {
                      console.error("Onboarding flow launch error:", error);
                      onComplete();
                      router.push("/practice-overview");
                    } finally {
                      setIsSubmitting(false);
                      setIsPersonalizing(false);
                    }
                  }}
                  sx={{
                    backgroundColor: "#F27059",
                    "&:hover": {
                      backgroundColor: "#E55A42",
                    },
                    "&.Mui-disabled": {
                      backgroundColor: "#D1D5DB",
                      color: "white",
                    },
                  }}
                >
                  {isPersonalizing ? "Personalizing for you..." : isSubmitting ? "Almost done..." : "Personalize My Dashboard"}
                </Button>
              </Box>
            </motion.div>
          )}

          {/* Personalizing Overlay */}
          {isPersonalizing && (
            <Box
              sx={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 9999,
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "24px",
                }}
              >
                {construccionAnimation && (
                  <Box
                    sx={{
                      width: { xs: "200px", sm: "300px" },
                      height: { xs: "200px", sm: "300px" },
                    }}
                  >
                    <Lottie
                      animationData={construccionAnimation}
                      loop={true}
                      autoplay={true}
                      style={{ width: "100%", height: "100%" }}
                    />
                  </Box>
                )}
                <Typography
                  variant="h5"
                  sx={{
                    fontSize: { xs: "20px", sm: "24px" },
                    fontWeight: 600,
                    color: "#212E42",
                    textAlign: "center",
                  }}
                >
                  Personalizing for you...
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: "14px",
                    color: "#76808F",
                    textAlign: "center",
                    maxWidth: "400px",
                  }}
                >
                  We're setting up your personalized dashboard based on your goals
                </Typography>
              </motion.div>
            </Box>
          )}

          {flowPayload?.flow && (
            <MicrolearningLaunch
              flow={flowPayload.flow}
              profile={flowPayload.profile}
              firstAction={flowPayload.firstAction || "/practice-overview"}
              onStartNow={handleFlowStart}
              onSkip={() => handleFlowStart("/practice-overview")}
            />
          )}
        </Paper>
      </Box>
    </ThemeProvider>
  );
}
