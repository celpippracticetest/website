"use client";

import { Box } from "@/components/ui/Box";
import { FormEvent, useMemo, useState } from "react";
import { trackEngagement } from "@/lib/gtm";

type SubmitResponse = {
  request?: {
    trackingCode: string;
    status: string;
    createdAt: string;
  };
  error?: string;
};

type TrackResponse = {
  request?: {
    trackingCode: string;
    status: string;
    fullName: string;
    email: string;
    reason: string;
    details: string;
    rejectionReason?: string;
    rejectionMessage?: string;
    createdAt: string;
    updatedAt: string;
  };
  error?: string;
};

const REASON_OPTIONS = [
  { value: "accidental_purchase", label: "Accidental purchase" },
  { value: "technical_issue", label: "Technical issue" },
  { value: "billing_issue", label: "Billing issue" },
  { value: "wrong_plan", label: "Wrong plan purchased" },
  { value: "other", label: "Other" },
] as const;

const REJECTION_REASON_LABELS: Record<string, string> = {
  outside_refund_window: "Outside refund window",
  used_service_after_purchase: "Service already used",
  duplicate_request: "Duplicate request",
  insufficient_details: "Insufficient details",
  other: "Other",
};

const initialForm = {
  fullName: "",
  email: "",
  reason: "accidental_purchase",
  details: "",
};

type RefundRequestPortalProps = {
  initialFullName?: string;
  initialEmail?: string;
};

export default function RefundRequestPortal({
  initialFullName = "",
  initialEmail = "",
}: RefundRequestPortalProps) {
  const userFullName = initialFullName.trim();
  const userEmail = initialEmail.trim();
  const isFullNameLocked = userFullName.length > 0;
  const isEmailLocked = userEmail.length > 0;

  const [form, setForm] = useState(initialForm);
  const effectiveFullName = (isFullNameLocked ? userFullName : form.fullName).trim();
  const effectiveEmail = (isEmailLocked ? userEmail : form.email).trim();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submittedTrackingCode, setSubmittedTrackingCode] = useState("");
  const [submittedStatus, setSubmittedStatus] = useState("");

  const [trackingCodeInput, setTrackingCodeInput] = useState("");
  const [isTracking, setIsTracking] = useState(false);
  const [trackingError, setTrackingError] = useState("");
  const [trackedRequest, setTrackedRequest] = useState<TrackResponse["request"] | null>(
    null
  );

  const canSubmit = useMemo(() => {
    return (
      effectiveFullName.length >= 2 &&
      effectiveEmail.length > 3 &&
      form.details.trim().length >= 10
    );
  }, [effectiveEmail, effectiveFullName, form.details]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError("");
    setSubmittedTrackingCode("");
    setSubmittedStatus("");

    try {
      const res = await fetch("/api/refund-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          fullName: effectiveFullName,
          email: effectiveEmail,
        }),
      });

      const data = (await res.json()) as SubmitResponse;
      if (!res.ok || !data.request) {
        setSubmitError(data.error || "Failed to submit refund request.");
        return;
      }

      setSubmittedTrackingCode(data.request.trackingCode);
      setSubmittedStatus(data.request.status);
      trackEngagement.refundRequestSubmitted(form.reason, data.request.trackingCode);
      setForm(initialForm);
    } catch (error) {
      setSubmitError("Failed to submit refund request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onTrack = async (event: FormEvent) => {
    event.preventDefault();
    if (!trackingCodeInput.trim() || isTracking) return;

    setIsTracking(true);
    setTrackingError("");
    setTrackedRequest(null);

    try {
      const searchedTrackingCode = trackingCodeInput.trim();
      trackEngagement.refundRequestTrackingSearched(searchedTrackingCode);
      const params = new URLSearchParams({
        trackingCode: searchedTrackingCode,
      });
      const res = await fetch(`/api/refund-requests?${params.toString()}`);
      const data = (await res.json()) as TrackResponse;

      if (!res.ok || !data.request) {
        setTrackingError(data.error || "Request not found.");
        return;
      }

      setTrackedRequest(data.request);
      trackEngagement.refundRequestStatusViewed(
        data.request.status,
        data.request.rejectionReason
      );
    } catch (error) {
      setTrackingError("Failed to fetch tracking details. Please try again.");
    } finally {
      setIsTracking(false);
    }
  };

  return (
    <Box className="w-full px-[16px] pb-[32px]">
      <Box className="mx-auto w-full max-w-[980px] rounded-[24px] border border-[#E3EAFB] bg-white p-[20px] screen744:p-[28px]!">
        <h1 className="text-[28px] font-bold leading-[36px] text-[#212E42] screen744:text-[34px]! screen744:leading-[44px]!">
          Refund Requests
        </h1>
        <p className="mt-[10px] text-[16px] leading-[26px] text-[#526071]">
          Submit a new request or track an existing one.
        </p>

        <Box className="mt-[28px] flex w-full flex-col gap-[28px]">
          <Box className="rounded-[18px] border border-[#E3EAFB] bg-[#F8FAFF] p-[16px] screen744:p-[20px]!">
            <h2 className="text-[20px] font-semibold text-[#212E42]">
              Submit a refund request
            </h2>
            <p className="mt-[6px] text-[14px] text-[#657386]">
              Create a new ticket for review.
            </p>

            <form onSubmit={onSubmit} className="mt-[16px] flex flex-col gap-[12px]">
              <input
                type="text"
                value={isFullNameLocked ? userFullName : form.fullName}
                onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                placeholder="Full name"
                className="h-[44px] rounded-[12px] border border-[#D7DFEE] bg-white px-[14px] text-[14px] text-[#1F2A3D] outline-none focus:border-[#316BFF]"
                disabled={isFullNameLocked}
                required
              />
              <input
                type="email"
                value={isEmailLocked ? userEmail : form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="Email address"
                className="h-[44px] rounded-[12px] border border-[#D7DFEE] bg-white px-[14px] text-[14px] text-[#1F2A3D] outline-none focus:border-[#316BFF]"
                disabled={isEmailLocked}
                required
              />
              <select
                value={form.reason}
                onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
                className="h-[44px] rounded-[12px] border border-[#D7DFEE] bg-white px-[14px] text-[14px] text-[#1F2A3D] outline-none focus:border-[#316BFF]"
              >
                {REASON_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <textarea
                value={form.details}
                onChange={(e) => setForm((prev) => ({ ...prev, details: e.target.value }))}
                placeholder="Short Explanation (min 10 chars, max 300 chars)"
                className="min-h-[140px] rounded-[12px] border border-[#D7DFEE] bg-white px-[14px] py-[10px] text-[14px] text-[#1F2A3D] outline-none focus:border-[#316BFF]"
                required
              />

              {submitError && (
                <p className="text-[13px] font-medium text-[#D14343]">{submitError}</p>
              )}
              {submittedTrackingCode && (
                <Box className="rounded-[12px] border border-[#C7F0D2] bg-[#F1FFF5] p-[12px]">
                  <p className="text-[14px] text-[#1E4D2B]">
                    Submitted successfully. Tracking code:{" "}
                    <span className="font-semibold">{submittedTrackingCode}</span>
                  </p>
                  <p className="mt-[4px] text-[13px] text-[#2F6B40]">
                    Current status: {submittedStatus}
                  </p>
                </Box>
              )}

              <button
                type="submit"
                disabled={!canSubmit || isSubmitting}
                className="mt-[4px] inline-flex h-[44px] items-center justify-center rounded-[12px] bg-[#316BFF] px-[16px] text-[14px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "Submitting..." : "Submit Refund Request"}
              </button>
            </form>
          </Box>

          <Box className="rounded-[18px] border border-[#E3EAFB] bg-[#F8FAFF] p-[16px] screen744:p-[20px]!">
            <h2 className="text-[20px] font-semibold text-[#212E42]">
              Track an existing request
            </h2>
            <p className="mt-[6px] text-[14px] text-[#657386]">
              View status and latest details.
            </p>

            <form onSubmit={onTrack} className="mt-[16px] flex flex-col gap-[12px]">
              <input
                type="text"
                value={trackingCodeInput}
                onChange={(e) => setTrackingCodeInput(e.target.value)}
                placeholder="Enter tracking code (e.g. RF-XXXX-XXXXXX)"
                className="h-[44px] rounded-[12px] border border-[#D7DFEE] bg-white px-[14px] text-[14px] text-[#1F2A3D] outline-none focus:border-[#316BFF]"
                required
              />
              <button
                type="submit"
                disabled={!trackingCodeInput.trim() || isTracking}
                className="inline-flex h-[44px] items-center justify-center rounded-[12px] border border-[#316BFF] bg-white px-[16px] text-[14px] font-semibold text-[#316BFF] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isTracking ? "Checking..." : "Track Request"}
              </button>
            </form>

            {trackingError && (
              <p className="mt-[12px] text-[13px] font-medium text-[#D14343]">
                {trackingError}
              </p>
            )}

            {trackedRequest && (
              <Box className="mt-[14px] rounded-[12px] border border-[#D7DFEE] bg-white p-[14px]">
                <p className="text-[14px] text-[#1F2A3D]">
                  Tracking code:{" "}
                  <span className="font-semibold">{trackedRequest.trackingCode}</span>
                </p>
                <p className="mt-[4px] text-[14px] text-[#1F2A3D]">
                  Status: <span className="font-semibold">{trackedRequest.status}</span>
                </p>
                {trackedRequest.status === "rejected" ? (
                  <Box className="mt-[8px] rounded-[10px] border border-[#FECACA] bg-[#FEF2F2] p-[10px]">
                    <p className="text-[13px] font-semibold text-[#991B1B]">
                      Rejection reason:{" "}
                      {trackedRequest.rejectionReason
                        ? REJECTION_REASON_LABELS[trackedRequest.rejectionReason] ||
                          trackedRequest.rejectionReason
                        : "Not provided"}
                    </p>
                    {trackedRequest.rejectionMessage ? (
                      <p className="mt-[4px] text-[13px] text-[#991B1B]">
                        {trackedRequest.rejectionMessage}
                      </p>
                    ) : null}
                  </Box>
                ) : null}
                <p className="mt-[4px] text-[13px] text-[#5E6C7D]">
                  Last updated: {new Date(trackedRequest.updatedAt).toLocaleString()}
                </p>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
