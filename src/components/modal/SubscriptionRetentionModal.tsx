import React, { useEffect, useMemo, useState } from "react";
import SvgCloseCircle from "@/components/icons/CloseCircle";
import SvgCheckCircle from "@/components/icons/CheckCircle";
import SvgCopy from "@/components/icons/Copy";
import { pushToDataLayer } from "@/lib/gtm";
import { useForm, useWatch } from "react-hook-form";
import {
  Box,
  Button,
  FormControlLabel,
  Radio,
  RadioGroup,
  Rating,
  TextField,
  Typography,
  styled,
} from "@mui/material";
import { IconContainerProps } from "@mui/material/Rating";
import SentimentVeryDissatisfiedIcon from "@mui/icons-material/SentimentVeryDissatisfied";
import SentimentDissatisfiedIcon from "@mui/icons-material/SentimentDissatisfied";
import SentimentSatisfiedIcon from "@mui/icons-material/SentimentSatisfied";
import SentimentSatisfiedAltIcon from "@mui/icons-material/SentimentSatisfiedAltOutlined";
import SentimentVerySatisfiedIcon from "@mui/icons-material/SentimentVerySatisfied";

interface SubscriptionRetentionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmCancellation: (flowId: string | null) => void;
  loading: boolean;
}

type Step = "survey" | "offer" | "confirm";
type Reason =
  | "expensive"
  | "not_using"
  | "technical"
  | "passed"
  | "alternative"
  | "other";

interface CancellationFormValues {
  reason?: Reason;
  otherReason: string;
  alternativeService: string;
  scores: {
    listening: string;
    reading: string;
    writing: string;
    speaking: string;
  };
  serviceFeedback: string;
  cancellationRating: number | null;
  cancellationReview: string;
}

const defaultFormValues: CancellationFormValues = {
  reason: undefined,
  otherReason: "",
  alternativeService: "",
  scores: {
    listening: "",
    reading: "",
    writing: "",
    speaking: "",
  },
  serviceFeedback: "",
  cancellationRating: null,
  cancellationReview: "",
};

const StyledRating = styled(Rating)(({ theme }) => ({
  "& .MuiRating-iconEmpty .MuiSvgIcon-root": {
    color: theme.palette.action.disabled,
  },
}));

const customRatingIcons: Record<
  number,
  { icon: React.ReactElement; label: string }
> = {
  1: {
    icon: <SentimentVeryDissatisfiedIcon color="error" />,
    label: "Very Dissatisfied",
  },
  2: {
    icon: <SentimentDissatisfiedIcon color="error" />,
    label: "Dissatisfied",
  },
  3: {
    icon: <SentimentSatisfiedIcon color="warning" />,
    label: "Neutral",
  },
  4: {
    icon: <SentimentSatisfiedAltIcon color="success" />,
    label: "Satisfied",
  },
  5: {
    icon: <SentimentVerySatisfiedIcon color="success" />,
    label: "Very Satisfied",
  },
};

function RatingIconContainer(props: IconContainerProps) {
  const { value, ...other } = props;
  return <span {...other}>{customRatingIcons[value]?.icon}</span>;
}

const SubscriptionRetentionModal = ({
  isOpen,
  onClose,
  onConfirmCancellation,
  loading,
}: SubscriptionRetentionModalProps) => {
  const [step, setStep] = useState<Step>("survey");
  const [copied, setCopied] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const [flowId, setFlowId] = useState<string | null>(null);
  const { register, control, setValue, getValues, reset } =
    useForm<CancellationFormValues>({
      defaultValues: defaultFormValues,
    });

  const reason = useWatch({ control, name: "reason" });
  const scores = useWatch({ control, name: "scores" });
  const finalRating = useWatch({ control, name: "cancellationRating" });
  const finalReview = useWatch({ control, name: "cancellationReview" }) || "";

  const allScoresValid = useMemo(() => {
    if (!scores) return false;
    return Object.values(scores).every((value) => {
      if (value === "") return false;
      const score = Number(value);
      return Number.isFinite(score) && score >= 1 && score <= 12;
    });
  }, [scores]);

  const finalFeedbackValid =
    finalRating !== null && finalRating >= 1 && Boolean(finalReview.trim());

  const trackCancellationEvent = (
    eventName: string,
    extra?: {
      reason?: Reason | null;
      step?: Step;
      metadata?: Record<string, unknown>;
      flowId?: string | null;
    }
  ) => {
    const payload = {
      eventName,
      reason: extra?.reason ?? reason ?? null,
      step: extra?.step ?? step,
      metadata: extra?.metadata,
    };

    pushToDataLayer({
      event: "subscription_retention_event",
      retention_event_name: payload.eventName,
      cancellation_reason: payload.reason ?? undefined,
      cancellation_step: payload.step ?? undefined,
      metadata: payload.metadata,
    });

    fetch("/api/users/cancellation-flow-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        flowId: extra?.flowId ?? flowId,
      }),
    }).catch((error) => {
      console.error("Failed to save cancellation flow event", error);
    });
  };

  useEffect(() => {
    if (!isOpen) return;

    setStep("survey");
    setCopied(false);
    setIsPausing(false);
    reset(defaultFormValues);

    const newFlowId = crypto.randomUUID();
    setFlowId(newFlowId);
    trackCancellationEvent("flow_opened", { step: "survey", flowId: newFlowId });
  }, [isOpen, reset]);

  const handlePauseSubscription = async () => {
    try {
      setIsPausing(true);
      const response = await fetch("/api/users/pause-subscription", {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to pause subscription");
      }

      // We might want to show a toast or message here
      // For now, let's just close the modal as "Success"
      trackCancellationEvent("pause_subscription_success", {
        metadata: { pauseMonths: 3 },
      });
      onClose();
      // Optionally reload the page to reflect changes if needed
      window.location.reload();
    } catch (error) {
      console.error(error);
      trackCancellationEvent("pause_subscription_failed");
      // Handle error (maybe set an error state to show in modal)
    } finally {
      setIsPausing(false);
    }
  };


  if (!isOpen) return null;

  const submitSurvey = async () => {
    try {
      const values = getValues();

      // Don't await this, let it run in background
      fetch("/api/users/save-cancellation-survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flowId,
          reason: values.reason ?? null,
          otherReason: values.reason === "other" ? values.otherReason : undefined,
          alternativeService:
            values.reason === "alternative" ? values.alternativeService : undefined,
          scores: values.reason === "passed" ? values.scores : undefined,
          serviceFeedback:
            values.reason === "passed" ? values.serviceFeedback : undefined,
          cancellationRating: values.cancellationRating,
          cancellationReview: values.cancellationReview.trim(),
        }),
      });
    } catch (error) {
      console.error("Failed to submit survey", error);
    }
  };

  const handleReasonSelect = (r: Reason) => {
    setValue("reason", r, { shouldDirty: true, shouldTouch: true });
    trackCancellationEvent("reason_selected", { reason: r });
  };

  const handleSurveyNext = () => {
    if (!reason) return;
    trackCancellationEvent("survey_next_clicked");
    setStep("offer");
  };

  const renderSurvey = () => (
    <Box className="flex flex-col gap-4">
      <Box className="text-center">
        <Typography sx={{ color: "#212E42", fontSize: 20, fontWeight: 600, mb: 1 }}>
          We're sorry to see you go
        </Typography>
        <Typography sx={{ color: "#76808F", fontSize: 14 }}>
          Help us improve by telling us why you're leaving.
        </Typography>
      </Box>

      <Box className="flex flex-col gap-3 mt-2">
        <RadioGroup value={reason ?? ""} name="cancellation-reason">
        {[
          { id: "passed", label: "I passed my test!" },
          { id: "expensive", label: "It's too expensive" },
          { id: "not_using", label: "I don't use it enough" },
          { id: "technical", label: "Technical issues" },
          { id: "alternative", label: "Found a better alternative" },
          { id: "other", label: "Other" },
        ].map((option) => (
          <Box
            key={option.id}
            sx={{
              border: "1px solid",
              borderColor: reason === option.id ? "#4A7DFF" : "#e5e7eb",
              bgcolor: reason === option.id ? "#F2F6FF" : "#fff",
              borderRadius: "10px",
              px: 1,
              py: 0.5,
            }}
          >
            <FormControlLabel
              value={option.id}
              control={<Radio size="small" sx={{ color: "#4A7DFF" }} />}
              label={option.label}
              onChange={() => handleReasonSelect(option.id as Reason)}
              sx={{
                m: 0,
                width: "100%",
                "& .MuiFormControlLabel-label": {
                  color: "#212E42",
                  fontSize: 14,
                  fontWeight: 500,
                },
              }}
            />
          </Box>
        ))}
        </RadioGroup>

        {reason === "alternative" && (
          <TextField
            size="small"
            placeholder="Which service did you find?"
            {...register("alternativeService")}
          />
        )}

        {reason === "other" && (
          <TextField
            multiline
            minRows={3}
            placeholder="Please tell us more..."
            {...register("otherReason")}
          />
        )}
      </Box>

      <Box className="flex gap-3 mt-4">
        <Button
          onClick={() => {
            trackCancellationEvent("keep_subscription_clicked", {
              step: "survey",
            });
            onClose();
          }}
          variant="contained"
          fullWidth
          sx={{
            flex: 1,
            borderRadius: "9999px",
            backgroundColor: "#0DAA94",
            textTransform: "none",
            fontWeight: 500,
            fontSize: 14,
            "&:hover": { backgroundColor: "#0B8D7B" },
          }}
        >
          Keep Subscription
        </Button>
        <Button
          onClick={handleSurveyNext}
          disabled={!reason}
          variant="text"
          fullWidth
          sx={{
            flex: 1,
            borderRadius: "9999px",
            color: "#76808F",
            textTransform: "none",
            fontWeight: 500,
            fontSize: 14,
          }}
        >
          Next
        </Button>
      </Box>
    </Box>
  );

  const renderOffer = () => {
    let title = "Wait! Don't lose your progress";
    let content = <p className="text-[#76808F]">Are you sure you want to cancel? You'll lose access to all premium features.</p>;
    let primaryButtonText = "Keep Subscription";
    let primaryDisabled = false;
    let primaryAction = () => {
      trackCancellationEvent("keep_subscription_clicked", { step: "offer" });
      onClose();
    };
    let secondaryButtonText = "Continue to Cancel";
    let secondaryAction = () => {
        trackCancellationEvent("continue_to_cancel_clicked");
        setStep("confirm");
    };

    if (reason === "expensive") {
        title = "Special Offer: 20% Off";
        content = (
            <div className="flex flex-col items-center gap-4">
                <p className="text-[#76808F] text-center">
                    We'd love for you to stay! Here is a 20% discount for your next month.
                </p>
                <div className="bg-[#FFEBD6] px-6 py-3 rounded-xl border border-[#FFD8B4] flex items-center gap-4 w-full justify-between">
                    <span className="text-[#F27059] font-bold text-lg tracking-wider">STAY20</span>
                    <Button
                        variant="text"
                        onClick={() => {
                            navigator.clipboard.writeText("STAY20");
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                        }}
                        sx={{
                          textTransform: "none",
                          minWidth: "auto",
                          color: "#37465C",
                          fontSize: 14,
                          fontWeight: 500,
                        }}
                        startIcon={<SvgCopy />}
                    >
                        {copied ? "Copied!" : "Copy Code"}
                    </Button>
                </div>
                <p className="text-xs text-gray-500">Apply this code in your account settings.</p>
            </div>
        );
        primaryButtonText = "Use Discount & Stay";
        // For "Expensive", "Keep Subscription" implies they take the offer.
        primaryAction = () => {
          trackCancellationEvent("kept_with_discount");
          onClose();
        };
    } else if (reason === "passed") {
      title = "Congratulations!";
      content = (
        <div className="text-center">
          <div className="flex justify-center mb-4 text-[#0DAA94]">
            <SvgCheckCircle />
          </div>
          <p className="text-[#212E42] font-semibold mb-2">
            Share your success with us!
          </p>
          <p className="text-[#76808F] text-[14px] mb-4">
            Enter your scores and any feedback about our service.
          </p>

          <div className="flex flex-wrap gap-3 mb-4">
            {(["listening", "reading", "writing", "speaking"] as const).map((skill) => (
              <div key={skill} className="flex flex-col text-left w-[calc(50%-6px)] min-w-[140px]">
                <label className="text-[12px] text-[#76808F] mb-1">
                  {skill.charAt(0).toUpperCase() + skill.slice(1)}
                </label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  step={1}
                  inputMode="numeric"
                  placeholder="1-12"
                  className="border border-gray-200 rounded-lg p-2 text-[14px] focus:outline-none focus:border-[#4A7DFF]"
                  {...register(`scores.${skill}`)}
                />
              </div>
            ))}
          </div>

          <div className="text-left">
            <label className="text-[12px] text-[#76808F] mb-1">
              Feedback about our service
            </label>
            <TextField
              fullWidth
              multiline
              minRows={3}
              placeholder="How was your experience?"
              {...register("serviceFeedback")}
            />
          </div>

          {!allScoresValid && (
            <p className="text-xs text-[#EE4266] text-left mt-3">
              Please enter all 4 scores (1-12) to continue.
            </p>
          )}
        </div>
      );
      primaryButtonText = "Submit & Continue";
      primaryDisabled = !allScoresValid;
      primaryAction = () => {
        if (!allScoresValid) return;
        setStep("confirm");
      };
      secondaryButtonText = "Skip";
    } else if (reason === "technical") {
        title = "Let us fix it for you";
        content = (
            <div className="text-center">
                <p className="text-[#76808F] mb-4">
                    We're sorry you're facing issues. Our support team can help resolve them quickly.
                </p>
            </div>
        );
        primaryButtonText = "Contact Support";
        primaryAction = () => {
             trackCancellationEvent("contact_support_selected");
             window.location.href = "mailto:support@celpippracticetest.com";
             onClose();
        };
    } else if (reason === "not_using") {
        title = "Pause instead of Cancel?";
        content = (
            <div className="text-center">
                <p className="text-[#76808F]">
                    You can pause your subscription for up to 3 months and keep your progress and data safe.
                </p>
            </div>
        );
        primaryButtonText = isPausing ? "Pausing..." : "Pause Subscription";
        primaryAction = handlePauseSubscription;
        // If they don't want to pause, they continue to cancel
        secondaryButtonText = "No thanks, Cancel";
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="text-center">
                <h2 className="text-[#212E42] text-[20px] font-semibold mb-2">{title}</h2>
                {content}
            </div>

            <div className="flex flex-col gap-3 mt-4">
                <Button
                    onClick={primaryAction}
                    disabled={primaryDisabled}
                    variant="contained"
                    fullWidth
                    sx={{
                      borderRadius: "9999px",
                      backgroundColor: "#0DAA94",
                      textTransform: "none",
                      fontWeight: 500,
                      fontSize: 15,
                      py: 1.2,
                      "&:hover": { backgroundColor: "#0B8D7B" },
                    }}
                >
                    {primaryButtonText}
                </Button>
                <Button
                    onClick={secondaryAction}
                    variant="text"
                    fullWidth
                    sx={{
                      color: "#76808F",
                      textTransform: "none",
                      fontWeight: 500,
                      fontSize: 14,
                      textDecoration: "underline",
                      textUnderlineOffset: "4px",
                    }}
                >
                    {secondaryButtonText}
                </Button>
            </div>
        </div>
    );
  };

  const renderConfirm = () => (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <div className="flex justify-center mb-4 text-[#EE4266]">
            <SvgCloseCircle /> 
        </div>
        <h2 className="text-[#212E42] text-[20px] font-semibold mb-2">Final Confirmation</h2>
        <p className="text-[#76808F] text-[14px]">
            You are about to cancel your subscription. You will lose access to premium features at the end of your billing cycle.
        </p>
      </div>

      <div className="border border-gray-200 rounded-xl text-center p-4 flex flex-col gap-3">
        <p className="text-[13px] text-[#212E42] font-medium">
          Before you cancel, please rate your experience.{" "}
          <span className="text-[#EE4266]">*</span>
        </p>
        <StyledRating
          name="cancellation-experience-rating"
          value={finalRating}
          max={5}
          onChange={(_, newValue) => {
            setValue("cancellationRating", newValue, {
              shouldDirty: true,
              shouldTouch: true,
            });
          }}
          IconContainerComponent={RatingIconContainer}
          getLabelText={(value: number) =>
            customRatingIcons[value]?.label ?? "No Rating"
          }
          highlightSelectedOnly
        />
        {finalRating !== null && (
          <Typography sx={{ color: "#76808F", fontSize: 12 }}>
            {customRatingIcons[finalRating]?.label}
          </Typography>
        )}

        <div className="flex flex-col gap-1 text-left">
          <label className="text-[13px] text-[#212E42] font-medium">
            Feedback <span className="text-[#EE4266]">*</span>
          </label>
          <TextField
            fullWidth
            multiline
            minRows={3}
            placeholder="Please share your feedback before canceling..."
            {...register("cancellationReview")}
          />
        </div>
        {!finalFeedbackValid && (
          <p className="text-xs text-[#EE4266] text-left">
            Rating and feedback are required to continue.
          </p>
        )}
      </div>

      <div className="flex gap-3 mt-6">
        <Button
          onClick={() => {
            trackCancellationEvent("kept_on_final_confirmation", {
              step: "confirm",
            });
            onClose();
          }}
          variant="contained"
          fullWidth
          sx={{
            flex: 1,
            borderRadius: "9999px",
            backgroundColor: "#0DAA94",
            textTransform: "none",
            fontWeight: 500,
            fontSize: 14,
            "&:hover": { backgroundColor: "#0B8D7B" },
          }}
        >
          Keep It
        </Button>
        <Button
          onClick={() => {
            if (!finalFeedbackValid) return;
            trackCancellationEvent("confirm_cancel_clicked", { step: "confirm" });
            submitSurvey();
            onConfirmCancellation(flowId);
          }}
          disabled={loading || !finalFeedbackValid}
          variant="outlined"
          fullWidth
          sx={{
            flex: 1,
            borderRadius: "9999px",
            borderColor: "#EE4266",
            color: "#EE4266",
            textTransform: "none",
            fontWeight: 500,
            fontSize: 14,
          }}
        >
          {loading ? "Processing..." : "Confirm Cancel"}
        </Button>
      </div>
    </div>
  );

  return (
    <div 
      className="fixed inset-0 bg-[#17161680] flex justify-center items-center z-9999 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          trackCancellationEvent("modal_dismissed", { step });
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-[24px] w-full max-w-[480px] p-6 relative animate-in fade-in zoom-in duration-200">
        <button
            onClick={() => {
              trackCancellationEvent("modal_closed_with_x", { step });
              onClose();
            }}
            className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 transition-colors"
        >
            ✕
        </button>
        
        {step === "survey" && renderSurvey()}
        {step === "offer" && renderOffer()}
        {step === "confirm" && renderConfirm()}
      </div>
    </div>
  );
};

export default SubscriptionRetentionModal;
