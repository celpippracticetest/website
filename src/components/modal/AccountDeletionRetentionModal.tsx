"use client";

import React, { useEffect, useState } from "react";
import SvgCloseCircle from "@/components/icons/CloseCircle";
import { pushToDataLayer } from "@/lib/gtm";
import { useForm, useWatch } from "react-hook-form";
import { buildSupportMailto } from "@/lib/contact/support-email";
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

interface AccountDeletionRetentionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: (flowId: string | null) => void;
  loading: boolean;
}

type Step = "survey" | "offer" | "confirm";
type Reason = "privacy" | "not_using" | "technical" | "alternative" | "other";

interface AccountDeletionFormValues {
  reason?: Reason;
  otherReason: string;
  alternativeService: string;
  deletionRating: number | null;
  deletionFeedback: string;
}

const defaultValues: AccountDeletionFormValues = {
  reason: undefined,
  otherReason: "",
  alternativeService: "",
  deletionRating: null,
  deletionFeedback: "",
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

const AccountDeletionRetentionModal: React.FC<AccountDeletionRetentionModalProps> = ({
  isOpen,
  onClose,
  onConfirmDelete,
  loading,
}) => {
  const [step, setStep] = useState<Step>("survey");
  const [flowId, setFlowId] = useState<string | null>(null);
  const { register, control, setValue, getValues, reset } =
    useForm<AccountDeletionFormValues>({
      defaultValues,
    });

  const reason = useWatch({ control, name: "reason" });
  const deletionRating = useWatch({ control, name: "deletionRating" });
  const deletionFeedback = useWatch({ control, name: "deletionFeedback" }) || "";
  const finalFeedbackValid =
    deletionRating !== null && deletionRating >= 1 && Boolean(deletionFeedback.trim());

  const trackEvent = (
    eventName: string,
    extra?: { reason?: Reason | null; step?: Step; flowId?: string | null }
  ) => {
    const payload = {
      eventName,
      reason: extra?.reason ?? reason ?? null,
      step: extra?.step ?? step,
      flowId: extra?.flowId ?? flowId,
    };

    pushToDataLayer({
      event: "account_deletion_retention_event",
      retention_event_name: payload.eventName,
      deletion_reason: payload.reason ?? undefined,
      deletion_step: payload.step,
    });

    fetch("/api/users/account-deletion-flow-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch((error) => {
      console.error("Failed to save account deletion flow event", error);
    });
  };

  useEffect(() => {
    if (!isOpen) return;

    setStep("survey");
    reset(defaultValues);
    const newFlowId = crypto.randomUUID();
    setFlowId(newFlowId);
    trackEvent("flow_opened", { step: "survey", flowId: newFlowId });
  }, [isOpen, reset]);

  if (!isOpen) return null;

  const submitSurvey = async () => {
    const values = getValues();
    try {
      fetch("/api/users/save-account-deletion-survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flowId,
          reason: values.reason ?? null,
          otherReason: values.reason === "other" ? values.otherReason : undefined,
          alternativeService:
            values.reason === "alternative" ? values.alternativeService : undefined,
          deletionRating: values.deletionRating,
          deletionFeedback: values.deletionFeedback.trim(),
        }),
      });
    } catch (error) {
      console.error("Failed to submit account deletion survey", error);
    }
  };

  const renderSurvey = () => (
    <Box className="flex flex-col gap-4">
      <Box className="text-center">
        <Typography sx={{ color: "#212E42", fontSize: 20, fontWeight: 600, mb: 1 }}>
          We're sorry to see you go
        </Typography>
        <Typography sx={{ color: "#76808F", fontSize: 14 }}>
          Help us improve by telling us why you want to delete your account.
        </Typography>
      </Box>

      <Box className="flex flex-col gap-3 mt-2">
        <RadioGroup value={reason ?? ""} name="deletion-reason">
          {[
            { id: "privacy", label: "Privacy concerns" },
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
                onChange={() => {
                  setValue("reason", option.id as Reason, {
                    shouldDirty: true,
                    shouldTouch: true,
                  });
                  trackEvent("reason_selected", { reason: option.id as Reason });
                }}
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
            trackEvent("keep_account_clicked", { step: "survey" });
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
          Keep Account
        </Button>
        <Button
          onClick={() => {
            if (!reason) return;
            trackEvent("survey_next_clicked", { step: "survey" });
            setStep("offer");
          }}
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
    let title = "Before you delete your account";
    let content = (
      <Typography sx={{ color: "#76808F", fontSize: 14 }}>
        Deleting your account is permanent and removes access to your progress.
      </Typography>
    );
    let primaryLabel = "Keep Account";
    let primaryAction = () => {
      trackEvent("keep_account_clicked", { step: "offer" });
      onClose();
    };
    let secondaryLabel = "Continue to Delete";
    let secondaryAction = () => {
      trackEvent("continue_to_delete_clicked", { step: "offer" });
      setStep("confirm");
    };

    if (reason === "technical") {
      title = "Let us fix this for you";
      content = (
        <Typography sx={{ color: "#76808F", fontSize: 14 }}>
          Our support team can often solve account issues quickly and help you keep
          your progress.
        </Typography>
      );
      primaryLabel = "Contact Support";
      primaryAction = () => {
        trackEvent("contact_support_selected", { step: "offer" });
        window.location.href = buildSupportMailto();
      };
    } else if (reason === "privacy") {
      title = "Your data matters";
      content = (
        <Typography sx={{ color: "#76808F", fontSize: 14 }}>
          If privacy is your concern, contact us and we can help with data removal
          options without losing your account.
        </Typography>
      );
      primaryLabel = "Contact Support";
      primaryAction = () => {
        trackEvent("privacy_support_selected", { step: "offer" });
        window.location.href = buildSupportMailto();
      };
    }

    return (
      <Box className="flex flex-col gap-4">
        <Box className="text-center">
          <Typography sx={{ color: "#212E42", fontSize: 20, fontWeight: 600, mb: 1 }}>
            {title}
          </Typography>
          {content}
        </Box>

        <Box className="flex flex-col gap-3 mt-4">
          <Button
            onClick={primaryAction}
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
            {primaryLabel}
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
            {secondaryLabel}
          </Button>
        </Box>
      </Box>
    );
  };

  const renderConfirm = () => (
    <Box className="flex flex-col gap-4">
      <Box className="text-center">
        <Box className="flex justify-center mb-4 text-[#EE4266]">
          <SvgCloseCircle />
        </Box>
        <Typography sx={{ color: "#212E42", fontSize: 20, fontWeight: 600, mb: 1 }}>
          Final Confirmation
        </Typography>
        <Typography sx={{ color: "#76808F", fontSize: 14 }}>
          You are about to permanently delete your account and all related data.
        </Typography>
      </Box>

      <Box className="border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
        <p className="text-[13px] text-[#212E42] font-medium">
          Before you delete, please rate your experience.{" "}
          <span className="text-[#EE4266]">*</span>
        </p>
        <StyledRating
          name="account-deletion-rating"
          value={deletionRating}
          max={5}
          onChange={(_, newValue) =>
            setValue("deletionRating", newValue, {
              shouldDirty: true,
              shouldTouch: true,
            })
          }
          IconContainerComponent={RatingIconContainer}
          getLabelText={(value: number) =>
            customRatingIcons[value]?.label ?? "No Rating"
          }
          highlightSelectedOnly
        />
        {deletionRating !== null && (
          <Typography sx={{ color: "#76808F", fontSize: 12 }}>
            {customRatingIcons[deletionRating]?.label}
          </Typography>
        )}

        <Box className="flex flex-col gap-1 text-left">
          <label className="text-[13px] text-[#212E42] font-medium">
            Feedback <span className="text-[#EE4266]">*</span>
          </label>
          <TextField
            fullWidth
            multiline
            minRows={3}
            placeholder="Please share your feedback before deleting your account..."
            {...register("deletionFeedback")}
          />
        </Box>

        {!finalFeedbackValid && (
          <p className="text-xs text-[#EE4266] text-left">
            Rating and feedback are required to continue.
          </p>
        )}
      </Box>

      <Box className="flex gap-3 mt-6">
        <Button
          onClick={() => {
            trackEvent("kept_on_final_confirmation", { step: "confirm" });
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
          Keep Account
        </Button>
        <Button
          onClick={() => {
            if (!finalFeedbackValid) return;
            trackEvent("confirm_delete_clicked", { step: "confirm" });
            submitSurvey();
            onConfirmDelete(flowId);
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
          {loading ? "Processing..." : "Confirm Delete"}
        </Button>
      </Box>
    </Box>
  );

  return (
    <div
      className="fixed inset-0 bg-[#17161680] flex justify-center items-center z-[9999] p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          trackEvent("modal_dismissed", { step });
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-[24px] w-full max-w-[480px] p-6 relative animate-in fade-in zoom-in duration-200">
        <button
          onClick={() => {
            trackEvent("modal_closed_with_x", { step });
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

export default AccountDeletionRetentionModal;
