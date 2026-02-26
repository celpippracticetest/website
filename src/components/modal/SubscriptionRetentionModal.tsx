import React, { useEffect, useState } from "react";
import SvgCloseCircle from "@/components/icons/CloseCircle";
import SvgCheckCircle from "@/components/icons/CheckCircle";
import SvgCopy from "@/components/icons/Copy";
import { pushToDataLayer } from "@/lib/gtm";

interface SubscriptionRetentionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmCancellation: () => void;
  loading: boolean;
}

type Step = "survey" | "offer" | "confirm";
type Reason = "expensive" | "not_using" | "technical" | "passed" | "alternative" | "other" | null;

const SubscriptionRetentionModal = ({
  isOpen,
  onClose,
  onConfirmCancellation,
  loading
}: SubscriptionRetentionModalProps) => {
  const [scores, setScores] = useState({
    listening: "",
    reading: "",
    writing: "",
    speaking: "",
    });
  const [serviceFeedback, setServiceFeedback] = useState("");
  const [step, setStep] = useState<Step>("survey");
  const [reason, setReason] = useState<Reason>(null);
  const [otherReason, setOtherReason] = useState("");
  const [alternativeService, setAlternativeService] = useState("");
  const [copied, setCopied] = useState(false);
  const [isPausing, setIsPausing] = useState(false);

  const trackCancellationEvent = (
    eventName: string,
    extra?: { reason?: Reason; step?: Step; metadata?: Record<string, unknown> }
  ) => {
    const payload = {
      eventName,
      reason: extra?.reason ?? reason,
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
      body: JSON.stringify(payload),
    }).catch((error) => {
      console.error("Failed to save cancellation flow event", error);
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    trackCancellationEvent("flow_opened", { step: "survey" });
  }, [isOpen]);

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
      // Don't await this, let it run in background
      fetch("/api/users/save-cancellation-survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason,
          otherReason: reason === "other" ? otherReason : undefined,
          alternativeService: reason === "alternative" ? alternativeService : undefined,
          scores: reason === "passed" ? scores : undefined,
          serviceFeedback: reason === "passed" ? serviceFeedback : undefined,
        }),
      });
    } catch (error) {
      console.error("Failed to submit survey", error);
    }
  };

  const handleReasonSelect = (r: Reason) => {
    setReason(r);
    trackCancellationEvent("reason_selected", { reason: r });
  };

  const handleSurveyNext = () => {
    if (!reason) return;
    trackCancellationEvent("survey_next_clicked");
    setStep("offer");
  };

  const handleOfferAction = () => {
    // Determine action based on reason
    if (reason === "expensive") {
      // Logic to apply discount or copy code
      navigator.clipboard.writeText("STAY20").then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
      // Maybe we don't close, just show it's copied. 
      // But typically we want them to stay. 
      // If they take the offer, we close the modal.
      // But they need to go apply it.
      // Let's assume they copy and we close.
      setTimeout(onClose, 2500);
    } else if (reason === "technical") {
        // Open support email
        window.location.href = "mailto:support@celpippracticetest.com";
        onClose();
    } else if (reason === "passed") {
        // They really want to cancel
        setStep("confirm");
    } else {
        // Default behavior for others -> go to confirm
        setStep("confirm");
    }
  };

  const renderSurvey = () => (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <h2 className="text-[#212E42] text-[20px] font-semibold mb-2">We're sorry to see you go</h2>
        <p className="text-[#76808F] text-[14px]">Help us improve by telling us why you're leaving.</p>
      </div>
      
      <div className="flex flex-col gap-3 mt-2">
        {[
          { id: "passed", label: "I passed my test!" },
          { id: "expensive", label: "It's too expensive" },
          { id: "not_using", label: "I don't use it enough" },
          { id: "technical", label: "Technical issues" },
          { id: "alternative", label: "Found a better alternative" },
          { id: "other", label: "Other" },
        ].map((option) => (
          <label 
            key={option.id}
            className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
              reason === option.id 
                ? "border-[#4A7DFF] bg-[#F2F6FF]" 
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <input
              type="radio"
              name="cancellation-reason"
              className="w-4 h-4 text-[#4A7DFF] focus:ring-[#4A7DFF]"
              checked={reason === option.id}
              onChange={() => handleReasonSelect(option.id as Reason)}
            />
            <span className="ml-3 text-[#212E42] text-[14px] font-medium">{option.label}</span>
          </label>
        ))}
        
        {reason === "alternative" && (
            <input
                type="text"
                className="w-full border border-gray-200 rounded-lg p-3 text-[14px] mt-2 focus:outline-none focus:border-[#4A7DFF]"
                placeholder="Which service did you find?"
                value={alternativeService}
                onChange={(e) => setAlternativeService(e.target.value)}
            />
        )}
        
        {reason === "other" && (
            <textarea
                className="w-full border border-gray-200 rounded-lg p-3 text-[14px] mt-2 focus:outline-none focus:border-[#4A7DFF]"
                placeholder="Please tell us more..."
                rows={3}
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
            />
        )}
      </div>

      <div className="flex gap-3 mt-4">
        <button
          onClick={() => {
            trackCancellationEvent("keep_subscription_clicked", {
              step: "survey",
            });
            onClose();
          }}
          className="flex-1 py-2.5 rounded-full bg-[#0DAA94] text-white font-medium text-[14px] hover:bg-[#0DAA94]/80 transition-colors shadow-lg shadow-teal-100"
        >
          Keep Subscription
        </button>
        <button
          onClick={handleSurveyNext}
          disabled={!reason}
          className="flex-1 py-2.5 rounded-full text-[#76808F] font-medium text-[14px] hover:text-[#555] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );

  const renderOffer = () => {
    let title = "Wait! Don't lose your progress";
    let content = <p className="text-[#76808F]">Are you sure you want to cancel? You'll lose access to all premium features.</p>;
    let primaryButtonText = "Keep Subscription";
    let primaryAction = () => {
      trackCancellationEvent("keep_subscription_clicked", { step: "offer" });
      onClose();
    };
    let secondaryButtonText = "Continue to Cancel";
    let secondaryAction = () => {
        trackCancellationEvent("continue_to_cancel_clicked");
        submitSurvey();
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
                    <button 
                        onClick={() => {
                            navigator.clipboard.writeText("STAY20");
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                        }}
                        className="flex items-center gap-2 text-[#37465C] text-sm font-medium hover:text-[#212E42]"
                    >
                        <SvgCopy /> {copied ? "Copied!" : "Copy Code"}
                    </button>
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

          <div className="grid grid-cols-2 gap-3 mb-4">
            {["Listening", "Reading", "Writing", "Speaking"].map((skill) => (
              <div key={skill} className="flex flex-col text-left">
                <label className="text-[12px] text-[#76808F] mb-1">
                  {skill}
                </label>
                <input
                  type="text"
                  placeholder="1-12"
                  className="border border-gray-200 rounded-lg p-2 text-[14px] focus:outline-none focus:border-[#4A7DFF]"
                  value={scores[skill.toLowerCase() as keyof typeof scores]}
                  onChange={(e) =>
                    setScores({
                      ...scores,
                      [skill.toLowerCase()]: e.target.value,
                    })
                  }
                />
              </div>
            ))}
          </div>

          <div className="text-left">
            <label className="text-[12px] text-[#76808F] mb-1">
              Feedback about our service
            </label>
            <textarea
              className="w-full border border-gray-200 rounded-lg p-3 text-[14px] focus:outline-none focus:border-[#4A7DFF]"
              placeholder="How was your experience?"
              rows={3}
              value={serviceFeedback}
              onChange={(e) => setServiceFeedback(e.target.value)}
            />
          </div>
        </div>
      );
      primaryButtonText = "Submit & Continue";
      primaryAction = () => {
        submitSurvey();
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
                <button
                    onClick={primaryAction}
                    className="w-full py-3 rounded-full bg-[#0DAA94] text-white font-medium text-[15px] hover:bg-[#0DAA94]/80 transition-colors shadow-lg shadow-teal-100"
                >
                    {primaryButtonText}
                </button>
                <button
                    onClick={secondaryAction}
                    className="w-full py-2 text-[#76808F] font-medium text-[14px] hover:text-[#555] transition-colors underline decoration-gray-300 underline-offset-4"
                >
                    {secondaryButtonText}
                </button>
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

      <div className="flex gap-3 mt-6">
        <button
          onClick={() => {
            trackCancellationEvent("kept_on_final_confirmation", {
              step: "confirm",
            });
            onClose();
          }}
          className="flex-1 py-2.5 rounded-full bg-[#0DAA94] text-white font-medium text-[14px] hover:bg-[#0DAA94]/80 transition-colors shadow-lg shadow-teal-100"
        >
          Keep It
        </button>
        <button
          onClick={() => {
            trackCancellationEvent("confirm_cancel_clicked", { step: "confirm" });
            onConfirmCancellation();
          }}
          disabled={loading}
          className="flex-1 py-2.5 rounded-full text-[#EE4266] border border-[#EE4266] font-medium text-[14px] hover:bg-red-50 transition-colors disabled:opacity-70"
        >
          {loading ? "Processing..." : "Confirm Cancel"}
        </button>
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
