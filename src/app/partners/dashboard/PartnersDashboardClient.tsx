"use client";

import Link from "next/link";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import { useCallback, useEffect, useState } from "react";

type PartnerDto = {
  id: string;
  code: string;
  webUserId: string;
  payoutEmail: string;
  status: "pending" | "active" | "suspended";
};

type CommissionRow = {
  id: string;
  subscriberClerkUserId: string;
  grossAmount: number;
  commissionAmount: number;
  currency: string;
  status: string;
  createdAt: string;
};

type ReferredRow = {
  webUserId?: string;
  purchaseAmount?: number;
  purchaseCurrency?: string;
  plan?: string;
  hasEverPurchased?: boolean;
};

export default function PartnersDashboardClient() {
  const { user, isLoaded } = useHybridWebUser();
  const [partner, setPartner] = useState<PartnerDto | null>(null);
  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [totals, setTotals] = useState({ pending: 0, paid: 0, count: 0 });
  const [referredUsers, setReferredUsers] = useState<ReferredRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [payoutEmail, setPayoutEmail] = useState("");
  const [payoutSaving, setPayoutSaving] = useState(false);
  const [payoutMessage, setPayoutMessage] = useState<string | null>(null);

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL ||
        process.env.APP_BASE_URL ||
        "https://celpippracticetest.com";

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      let me = await fetch("/api/partners/me").then((r) => r.json());
      if (!me.partner) {
        const reg = await fetch("/api/partners/register", { method: "POST" });
        const regJson = await reg.json();
        if (!reg.ok) {
          setLoadError(regJson.error || "Could not register partner profile.");
          return;
        }
        me = { partner: regJson.partner };
      }
      setPartner(me.partner);
      setPayoutEmail(me.partner.payoutEmail || "");

      const sum = await fetch("/api/partners/dashboard-summary");
      if (!sum.ok) {
        const j = await sum.json().catch(() => ({}));
        setLoadError(j.error || "Could not load dashboard.");
        return;
      }
      const data = await sum.json();
      setCommissions(
        (data.commissions || []).map((c: CommissionRow & { createdAt?: Date }) => ({
          ...c,
          createdAt:
            typeof c.createdAt === "string"
              ? c.createdAt
              : new Date(c.createdAt as unknown as string).toISOString(),
        }))
      );
      setTotals(data.totals || { pending: 0, paid: 0, count: 0 });
      setReferredUsers(data.referredUsers || []);
    } catch {
      setLoadError("Network error loading dashboard.");
    }
  }, []);

  useEffect(() => {
    if (isLoaded && user) {
      void load();
    }
  }, [isLoaded, user, load]);

  const savePayoutEmail = async () => {
    setPayoutMessage(null);
    setPayoutSaving(true);
    try {
      const res = await fetch("/api/partners/payout-email", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payoutEmail }),
      });
      const j = await res.json();
      if (!res.ok) {
        setPayoutMessage(j.error || "Save failed.");
        return;
      }
      setPartner(j.partner);
      setPayoutMessage("Saved.");
    } catch {
      setPayoutMessage("Network error.");
    } finally {
      setPayoutSaving(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-600">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Partner dashboard</h1>
            <p className="text-sm text-slate-600">
              Signed in as {user?.primaryEmailAddress?.emailAddress}
            </p>
          </div>
          <Link
            href="/partners"
            className="text-sm font-medium text-orange-700 hover:underline"
          >
            Program info
          </Link>
        </div>

        {loadError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {loadError}
          </div>
        ) : null}

        {partner ? (
          <>
            {partner.status === "pending" ? (
              <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Your account is <strong>pending approval</strong>. You will receive
                your referral link and commissions once an administrator activates
                your partner profile.
              </div>
            ) : null}
            {partner.status === "suspended" ? (
              <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
                Your partner account is suspended. Contact support if this is a mistake.
              </div>
            ) : null}

            <section className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Your referral link</h2>
              <p className="mt-1 text-sm text-slate-600">
                Share this URL with clients. Code:{" "}
                <code className="rounded bg-slate-100 px-1">{partner.code}</code>
              </p>
              <p className="mt-3 break-all rounded-lg bg-slate-100 p-3 font-mono text-sm">
                {baseUrl.replace(/\/$/, "")}/?ref={partner.code}
              </p>
            </section>

            <section className="mb-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase text-slate-500">Pending</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {totals.pending.toFixed(2)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase text-slate-500">Paid out</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {totals.paid.toFixed(2)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase text-slate-500">Commissions</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{totals.count}</p>
              </div>
            </section>

            <section className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">E-transfer email</h2>
              <p className="mt-1 text-sm text-slate-600">
                We use this email for manual e-transfer payouts, sent on a biweekly schedule.
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="flex-1">
                  <span className="sr-only">Payout email</span>
                  <input
                    type="email"
                    value={payoutEmail}
                    onChange={(e) => setPayoutEmail(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    autoComplete="email"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void savePayoutEmail()}
                  disabled={payoutSaving}
                  className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
                >
                  {payoutSaving ? "Saving…" : "Save"}
                </button>
              </div>
              {payoutMessage ? (
                <p className="mt-2 text-sm text-slate-600">{payoutMessage}</p>
              ) : null}
            </section>

            <section className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Referred users</h2>
              <p className="mt-1 text-sm text-slate-600">
                Users attributed to you (from our database).
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2 pr-4">User ID</th>
                      <th className="py-2 pr-4">Plan</th>
                      <th className="py-2 pr-4">Purchased</th>
                      <th className="py-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-4 text-slate-500">
                          No referred users yet.
                        </td>
                      </tr>
                    ) : (
                      referredUsers.map((r) => (
                        <tr key={r.webUserId} className="border-b border-slate-100">
                          <td className="py-2 pr-4 font-mono text-xs">
                            {r.webUserId?.slice(0, 12)}…
                          </td>
                          <td className="py-2 pr-4">{r.plan || "—"}</td>
                          <td className="py-2 pr-4">
                            {r.hasEverPurchased ? "Yes" : "No"}
                          </td>
                          <td className="py-2">
                            {r.purchaseAmount != null
                              ? `${r.purchaseAmount} ${r.purchaseCurrency || ""}`
                              : "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Commissions</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2 pr-4">Date</th>
                      <th className="py-2 pr-4">Subscriber</th>
                      <th className="py-2 pr-4">Gross</th>
                      <th className="py-2 pr-4">Your 30%</th>
                      <th className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-4 text-slate-500">
                          No commissions yet.
                        </td>
                      </tr>
                    ) : (
                      commissions.map((c) => (
                        <tr key={c.id} className="border-b border-slate-100">
                          <td className="py-2 pr-4 text-xs text-slate-600">
                            {new Date(c.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-2 pr-4 font-mono text-xs">
                            {c.subscriberClerkUserId?.slice(0, 10)}…
                          </td>
                          <td className="py-2 pr-4">
                            {c.grossAmount} {c.currency}
                          </td>
                          <td className="py-2 pr-4 font-medium">
                            {c.commissionAmount} {c.currency}
                          </td>
                          <td className="py-2">{c.status}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : !loadError ? (
          <p className="text-slate-600">Loading partner profile…</p>
        ) : null}
      </div>
    </div>
  );
}
