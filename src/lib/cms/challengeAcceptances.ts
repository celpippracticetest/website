import type { CompatDb as Db } from "@/lib/pg/types";

/** Users who completed checkout with `challenge_mode` (stored as `users.challenge`). */
export type ChallengeAcceptanceRow = {
  clerkUserId: string;
  email: string | null;
  mode: string | null;
  status: string | null;
  targetClb: number | null;
  windowDays: number | null;
  refundPercent: number | null;
  offerSource: string | null;
  tierKey: string | null;
  startsAt: string | null;
  deadlineAt: string | null;
  challengeUpdatedAt: string | null;
};

function iso(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.toISOString();
  if (typeof v === "string" || typeof v === "number") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}

const CHALLENGE_FILTER = {
  "challenge.mode": { $exists: true, $nin: [null, ""] },
} as const;

export async function loadChallengeAcceptances(
  db: Db,
  page: number,
  pageSize: number,
): Promise<{ total: number; rows: ChallengeAcceptanceRow[] }> {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safeSize = Number.isFinite(pageSize)
    ? Math.min(100, Math.max(1, Math.floor(pageSize)))
    : 25;
  const skip = (safePage - 1) * safeSize;

  const total = await db.collection("users").countDocuments(CHALLENGE_FILTER);
  const docs = await db
    .collection("users")
    .find(CHALLENGE_FILTER)
    .sort({ "challenge.startsAt": -1, updatedAt: -1 })
    .skip(skip)
    .limit(safeSize)
    .project({
      clerkUserId: 1,
      email: 1,
      challenge: 1,
      updatedAt: 1,
    })
    .toArray();

  const rows: ChallengeAcceptanceRow[] = docs.map((d) => {
    const c = d.challenge as
      | {
          mode?: string;
          status?: string;
          targetClb?: number;
          windowDays?: number;
          refundPercent?: number;
          offerSource?: string;
          tierKey?: string;
          startsAt?: Date | string;
          deadlineAt?: Date | string | null;
          updatedAt?: Date | string;
        }
      | undefined;

    return {
      clerkUserId: String(d.clerkUserId ?? ""),
      email: typeof d.email === "string" && d.email.trim() ? d.email.trim() : null,
      mode: c?.mode ?? null,
      status: c?.status ?? null,
      targetClb: typeof c?.targetClb === "number" && Number.isFinite(c.targetClb) ? c.targetClb : null,
      windowDays: typeof c?.windowDays === "number" && Number.isFinite(c.windowDays) ? c.windowDays : null,
      refundPercent:
        typeof c?.refundPercent === "number" && Number.isFinite(c.refundPercent)
          ? c.refundPercent
          : null,
      offerSource: typeof c?.offerSource === "string" && c.offerSource.trim() ? c.offerSource.trim() : null,
      tierKey: typeof c?.tierKey === "string" && c.tierKey.trim() ? c.tierKey.trim() : null,
      startsAt: iso(c?.startsAt),
      deadlineAt: iso(c?.deadlineAt),
      challengeUpdatedAt: iso(c?.updatedAt) ?? iso(d.updatedAt),
    };
  });

  return { total, rows };
}

export async function countActiveChallenges(db: Db): Promise<number> {
  return db.collection("users").countDocuments({
    ...CHALLENGE_FILTER,
    "challenge.status": "active",
  });
}
