"use client";

import { useCallback, useEffect, useState } from "react";

type PartnerRow = {
  id: string;
  code: string;
  clerkUserId: string;
  payoutEmail: string;
  status: "pending" | "active" | "suspended";
  createdAt: string;
};

export default function PartnersAdminClient() {
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
      setPartners(
        (j.partners || []).map((p: PartnerRow & { createdAt?: Date }) => ({
          ...p,
          createdAt:
            typeof p.createdAt === "string"
              ? p.createdAt
              : new Date(p.createdAt as unknown as string).toISOString(),
        }))
      );
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Partners</h1>
        <p className="text-sm text-muted-foreground">
          Approve immigration consultant partners. Only <strong>active</strong>{" "}
          partners can earn attribution from <code>?ref=</code> links.
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
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="px-3 py-2 font-medium">Code</th>
                <th className="px-3 py-2 font-medium">Payout email</th>
                <th className="px-3 py-2 font-medium">Clerk user</th>
                <th className="px-3 py-2 font-medium">Status</th>
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
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {new Date(p.createdAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
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
