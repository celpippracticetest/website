"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SupportEmailLink from "@/components/contact/SupportEmailLink";

export default function AccountSharingNoticeClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get("code");
  const allowAddDevice = searchParams.get("allowAddDevice") === "1";
  const currentPlan = searchParams.get("currentPlan") || "plus";
  const message =
    searchParams.get("message") ||
    "We detected access behavior that is not allowed for this plan.";
  const needsExtraDevices = Number.parseInt(searchParams.get("needsExtraDevices") || "1", 10);

  const [loading, setLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canAddDevice = code === "DEVICE_LIMIT_EXCEEDED" && allowAddDevice;
  const canRevokeFromProfile = code === "DEVICE_LIMIT_EXCEEDED";
  const seatsToAdd = useMemo(() => {
    if (!Number.isFinite(needsExtraDevices) || needsExtraDevices < 1) return 1;
    return Math.min(10, needsExtraDevices);
  }, [needsExtraDevices]);

  async function handleAddDevice() {
    setLoading(true);
    setErrorMessage(null);
    setResultMessage(null);
    try {
      const res = await fetch("/api/account/devices/add-seat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seats: seatsToAdd }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || "Failed to add device.");
      }
      setResultMessage(
        data.message ||
          `Added ${seatsToAdd} extra device on your ${currentPlan} plan. Redirecting...`,
      );
      setTimeout(() => {
        router.replace("/practice-overview");
        router.refresh();
      }, 900);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not add extra device.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16 text-center">
      <div className="max-w-lg">
        <h1 className="text-2xl font-semibold text-gray-900">Subscription access limited</h1>
        <p className="mt-4 text-base leading-relaxed text-gray-600">{message}</p>
        {canAddDevice && (
          <p className="mt-3 text-sm text-gray-500">
            Add {seatsToAdd} extra {seatsToAdd === 1 ? "device" : "devices"} on your{" "}
            {currentPlan} subscription to continue immediately.
          </p>
        )}
        {canRevokeFromProfile && (
          <p className="mt-3 text-sm text-gray-500">
            You can also revoke old devices from your Profile page under Active Sessions.
          </p>
        )}

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          {canAddDevice ? (
            <button
              type="button"
              disabled={loading}
              onClick={() => void handleAddDevice()}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Processing payment..." : "Add device and pay"}
            </button>
          ) : (
            <SupportEmailLink className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
              Contact support
            </SupportEmailLink>
          )}
          {canRevokeFromProfile && (
            <a
              href="/profile"
              className="rounded-lg border border-blue-600 px-5 py-2.5 text-sm font-medium text-blue-600 hover:bg-blue-50"
            >
              Revoke devices in Profile
            </a>
          )}
          <a href="/" className="text-sm font-medium text-blue-600 hover:underline">
            Back to home
          </a>
        </div>
        {resultMessage && <p className="mt-4 text-sm text-green-600">{resultMessage}</p>}
        {errorMessage && <p className="mt-4 text-sm text-red-600">{errorMessage}</p>}
      </div>
    </div>
  );
}
