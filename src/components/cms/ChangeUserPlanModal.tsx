"use client";

import { useEffect, useState } from "react";
import { CreditCard, X } from "lucide-react";

type PlanOption = {
  id: string;
  title: string;
  planTitle: string;
  price: string;
  stripePriceId: string | null;
  isActive: boolean;
};

type LastPayment =
  | {
      available: true;
      amountDisplay: string;
      paidAtIso: string;
    }
  | { available: false; message: string };

type PlanContext = {
  userId: string;
  email: string | null;
  hasActiveSubscription: boolean;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  lastPayment: LastPayment;
  plans: PlanOption[];
};

type Props = {
  userId: string;
  userLabel?: string;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export default function ChangeUserPlanModal({
  userId,
  userLabel,
  open,
  onClose,
  onSuccess,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [context, setContext] = useState<PlanContext | null>(null);
  const [target, setTarget] = useState("free");
  const [timing, setTiming] = useState<"immediate" | "period_end">("immediate");
  const [refundLatestPayment, setRefundLatestPayment] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setSuccess(null);
      setRefundLatestPayment(false);
      setTiming("immediate");
      setTarget("free");
      try {
        const res = await fetch(
          `/api/admin/users/${encodeURIComponent(userId)}/plan`,
        );
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to load plan options");
        }
        if (!cancelled) {
          setContext(data as PlanContext);
          const firstPaid = (data.plans as PlanOption[]).find(
            (p) => p.isActive && p.stripePriceId,
          );
          if (firstPaid) {
            // keep default free — CSM often downgrades
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
          setContext(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, userId]);

  if (!open) return null;

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(
        `/api/admin/users/${encodeURIComponent(userId)}/plan`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            target,
            timing,
            refundLatestPayment,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Plan change failed");
      }
      const refundNote = data.refund
        ? ` Refunded ${data.refund.amountDisplay}.`
        : "";
      setSuccess(`${data.message}${refundNote}`);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Plan change failed");
    } finally {
      setSubmitting(false);
    }
  };

  const paidPlans =
    context?.plans.filter((p) => p.isActive && p.stripePriceId) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Change plan</h2>
            <p className="text-sm text-gray-500">{userLabel || userId}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <X size={22} />
          </button>
        </div>

        <div className="px-5 py-4">
          {loading ? (
            <p className="text-sm text-gray-500">Loading Stripe &amp; plans…</p>
          ) : error && !context ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : context ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="rounded-lg border bg-gray-50 px-3 py-2 text-xs text-gray-600 space-y-1">
                <p>
                  Subscription:{" "}
                  <span className="font-medium text-gray-800">
                    {context.hasActiveSubscription ? "Active" : "None"}
                  </span>
                  {context.cancelAtPeriodEnd ? " (cancel at period end)" : ""}
                </p>
                <p>
                  Period ends:{" "}
                  <span className="font-medium text-gray-800">
                    {formatDate(context.currentPeriodEnd)}
                  </span>
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  New plan
                </label>
                <select
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="free">Free</option>
                  {paidPlans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} — ${p.price} ({p.planTitle})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  When
                </label>
                <div className="space-y-2">
                  <label className="flex cursor-pointer items-start gap-2 text-sm text-gray-800">
                    <input
                      type="radio"
                      name="timing"
                      checked={timing === "immediate"}
                      onChange={() => setTiming("immediate")}
                      className="mt-1"
                    />
                    <span>
                      <span className="font-medium">Immediately</span>
                      <span className="block text-xs text-gray-500">
                        Apply in Stripe now (cancel or swap price, no proration
                        invoice).
                      </span>
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-2 text-sm text-gray-800">
                    <input
                      type="radio"
                      name="timing"
                      checked={timing === "period_end"}
                      onChange={() => setTiming("period_end")}
                      className="mt-1"
                      disabled={!context.hasActiveSubscription}
                    />
                    <span>
                      <span className="font-medium">
                        End of subscription period
                      </span>
                      <span className="block text-xs text-gray-500">
                        Keep current access until{" "}
                        {formatDate(context.currentPeriodEnd)}, then apply.
                      </span>
                    </span>
                  </label>
                </div>
              </div>

              <div className="rounded-lg border px-3 py-3">
                <label className="flex cursor-pointer items-start gap-2 text-sm text-gray-800">
                  <input
                    type="checkbox"
                    checked={refundLatestPayment}
                    onChange={(e) => setRefundLatestPayment(e.target.checked)}
                    disabled={!context.lastPayment.available}
                    className="mt-1"
                  />
                  <span>
                    <span className="inline-flex items-center gap-1 font-medium">
                      <CreditCard className="h-3.5 w-3.5" />
                      Refund latest payment
                    </span>
                    <span className="block text-xs text-gray-500">
                      {context.lastPayment.available
                        ? `${context.lastPayment.amountDisplay} · paid ${formatDate(context.lastPayment.paidAtIso)}`
                        : context.lastPayment.message}
                    </span>
                  </span>
                </label>
              </div>

              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              {success ? (
                <p className="text-sm text-green-700">{success}</p>
              ) : null}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  disabled={submitting}
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={submitting || Boolean(success)}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? "Applying…" : "Apply in Stripe"}
                </button>
              </div>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}
