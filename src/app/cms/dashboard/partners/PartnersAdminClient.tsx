"use client";

import { useCallback, useEffect, useState } from "react";

type PartnerRow = {
  id: string;
  code: string;
  clerkUserId: string;
  payoutEmail: string;
  status: "pending" | "active" | "suspended";
  referredDiscountPercent: number | null;
  commissionPercent: number | null;
  createdAt: string;
};

type ProgramDefaults = {
  referredDiscountPercent: number;
  partnerCommissionPercent: number;
};

export default function PartnersAdminClient() {
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [programDefaults, setProgramDefaults] = useState<ProgramDefaults>({
    referredDiscountPercent: 20,
    partnerCommissionPercent: 30,
  });
  const [defaultsDraft, setDefaultsDraft] = useState<ProgramDefaults>({
    referredDiscountPercent: 20,
    partnerCommissionPercent: 30,
  });
  const [rateDrafts, setRateDrafts] = useState<
    Record<string, { discount: string; commission: string }>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingDefaults, setSavingDefaults] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/partners");
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || "Failed to load");
        return;
      }
      const rows: PartnerRow[] = (j.partners || []).map(
        (p: PartnerRow & { createdAt?: Date }) => ({
          ...p,
          referredDiscountPercent:
            typeof p.referredDiscountPercent === "number"
              ? p.referredDiscountPercent
              : null,
          commissionPercent:
            typeof p.commissionPercent === "number" ? p.commissionPercent : null,
          createdAt:
            typeof p.createdAt === "string"
              ? p.createdAt
              : new Date(p.createdAt as unknown as string).toISOString(),
        })
      );
      setPartners(rows);
      if (j.programDefaults) {
        const d: ProgramDefaults = {
          referredDiscountPercent: Number(j.programDefaults.referredDiscountPercent) || 20,
          partnerCommissionPercent:
            Number(j.programDefaults.partnerCommissionPercent) || 30,
        };
        setProgramDefaults(d);
        setDefaultsDraft(d);
      }
      const drafts: Record<string, { discount: string; commission: string }> = {};
      for (const p of rows) {
        drafts[p.id] = {
          discount:
            p.referredDiscountPercent == null
              ? ""
              : String(p.referredDiscountPercent),
          commission:
            p.commissionPercent == null ? "" : String(p.commissionPercent),
        };
      }
      setRateDrafts(drafts);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveProgramDefaults = async () => {
    setSavingDefaults(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/partners", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programDefaults: defaultsDraft }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || "Save failed");
        return;
      }
      if (j.programDefaults) {
        const d: ProgramDefaults = {
          referredDiscountPercent: Number(j.programDefaults.referredDiscountPercent) || 20,
          partnerCommissionPercent:
            Number(j.programDefaults.partnerCommissionPercent) || 30,
        };
        setProgramDefaults(d);
        setDefaultsDraft(d);
      }
      await load();
    } catch {
      setError("Network error");
    } finally {
      setSavingDefaults(false);
    }
  };

  const setStatus = async (id: string, status: PartnerRow["status"]) => {
    try {
      const res = await fetch("/api/admin/partners", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || "Update failed");
        return;
      }
      await load();
    } catch {
      setError("Network error");
    }
  };

  const savePartnerRates = async (id: string) => {
    const draft = rateDrafts[id];
    if (!draft) return;
    const discountTrim = draft.discount.trim();
    const commissionTrim = draft.commission.trim();
    const body: {
      id: string;
      referredDiscountPercent?: number | null;
      commissionPercent?: number | null;
    } = { id };
    body.referredDiscountPercent = discountTrim === "" ? null : Number(discountTrim);
    body.commissionPercent = commissionTrim === "" ? null : Number(commissionTrim);
    if (
      body.referredDiscountPercent !== null &&
      (Number.isNaN(body.referredDiscountPercent) ||
        body.referredDiscountPercent < 0 ||
        body.referredDiscountPercent > 100)
    ) {
      setError("Referee discount must be between 0 and 100, or empty for default.");
      return;
    }
    if (
      body.commissionPercent !== null &&
      (Number.isNaN(body.commissionPercent) ||
        body.commissionPercent < 0 ||
        body.commissionPercent > 100)
    ) {
      setError("Commission must be between 0 and 100, or empty for default.");
      return;
    }
    setError(null);
    try {
      const res = await fetch("/api/admin/partners", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || "Update failed");
        return;
      }
      await load();
    } catch {
      setError("Network error");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Partners</h1>
        <p className="text-sm text-muted-foreground">
          Approve partners and set defaults. Only <strong>active</strong> partners
          earn attribution from <code>?ref=</code> links. Referees receive a one-time
          Stripe discount on their first subscription (defaults below); commission is
          calculated on the referee&apos;s first qualifying payment.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-muted/20 p-4">
        <h2 className="text-sm font-semibold text-foreground">Program defaults</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Used when a partner has no override. New partner referrals snapshot these
          values onto the user at signup.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-foreground">
              Referee discount (% first period)
            </span>
            <input
              type="number"
              min={0}
              max={100}
              className="h-9 w-28 rounded-md border border-input bg-background px-2 text-sm"
              value={defaultsDraft.referredDiscountPercent}
              onChange={(e) =>
                setDefaultsDraft((d) => ({
                  ...d,
                  referredDiscountPercent: Number(e.target.value) || 0,
                }))
              }
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-foreground">Partner commission (%)</span>
            <input
              type="number"
              min={0}
              max={100}
              className="h-9 w-28 rounded-md border border-input bg-background px-2 text-sm"
              value={defaultsDraft.partnerCommissionPercent}
              onChange={(e) =>
                setDefaultsDraft((d) => ({
                  ...d,
                  partnerCommissionPercent: Number(e.target.value) || 0,
                }))
              }
            />
          </label>
          <button
            type="button"
            disabled={savingDefaults}
            onClick={() => void saveProgramDefaults()}
            className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {savingDefaults ? "Saving…" : "Save defaults"}
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Current saved defaults: referee {programDefaults.referredDiscountPercent}% ·
          partner {programDefaults.partnerCommissionPercent}%
        </p>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="px-3 py-2 font-medium">Code</th>
                <th className="px-3 py-2 font-medium">Payout email</th>
                <th className="px-3 py-2 font-medium">Clerk user</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Referee %</th>
                <th className="px-3 py-2 font-medium">Comm. %</th>
                <th className="px-3 py-2 font-medium">Created</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {partners.map((p) => (
                <tr key={p.id} className="border-b border-border">
                  <td className="px-3 py-2 font-mono text-xs">{p.code}</td>
                  <td className="px-3 py-2">{p.payoutEmail}</td>
                  <td className="px-3 py-2 font-mono text-xs">{p.clerkUserId}</td>
                  <td className="px-3 py-2">{p.status}</td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      placeholder={`${programDefaults.referredDiscountPercent}`}
                      className="h-8 w-20 rounded border border-input bg-background px-2 text-xs"
                      value={rateDrafts[p.id]?.discount ?? ""}
                      onChange={(e) =>
                        setRateDrafts((prev) => ({
                          ...prev,
                          [p.id]: {
                            discount: e.target.value,
                            commission: prev[p.id]?.commission ?? "",
                          },
                        }))
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      placeholder={`${programDefaults.partnerCommissionPercent}`}
                      className="h-8 w-20 rounded border border-input bg-background px-2 text-xs"
                      value={rateDrafts[p.id]?.commission ?? ""}
                      onChange={(e) =>
                        setRateDrafts((prev) => ({
                          ...prev,
                          [p.id]: {
                            discount: prev[p.id]?.discount ?? "",
                            commission: e.target.value,
                          },
                        }))
                      }
                    />
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {new Date(p.createdAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void savePartnerRates(p.id)}
                        className="rounded border border-border px-2 py-1 text-xs font-medium"
                      >
                        Save rates
                      </button>
                      {p.status !== "active" ? (
                        <button
                          type="button"
                          onClick={() => void setStatus(p.id, "active")}
                          className="rounded bg-primary px-2 py-1 text-xs font-medium text-primary-foreground"
                        >
                          Activate
                        </button>
                      ) : null}
                      {p.status !== "pending" ? (
                        <button
                          type="button"
                          onClick={() => void setStatus(p.id, "pending")}
                          className="rounded border border-border px-2 py-1 text-xs"
                        >
                          Pending
                        </button>
                      ) : null}
                      {p.status !== "suspended" ? (
                        <button
                          type="button"
                          onClick={() => void setStatus(p.id, "suspended")}
                          className="rounded border border-destructive/50 px-2 py-1 text-xs text-destructive"
                        >
                          Suspend
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
