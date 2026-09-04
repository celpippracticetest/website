import documentsClient from "@/lib/appDocumentsClient";
import type { AppDocumentsClient, AppDocumentsDb as Db } from "@/lib/pg/types";
import type { NpsReadiness } from "@/lib/nps";

export type TNpsResponse = {
  userId: string;
  score: number;
  readiness?: NpsReadiness | null;
  reason?: string | null;
  trigger: "mock_leave" | "practice_milestone";
  contextLabel?: string | null;
  createdAt: Date;
};

export function npsCreatedAtMs(createdAt: unknown): number {
  if (createdAt instanceof Date) return createdAt.getTime();
  if (typeof createdAt === "string") {
    const t = Date.parse(createdAt);
    return Number.isFinite(t) ? t : 0;
  }
  if (createdAt && typeof createdAt === "object") {
    const raw = (createdAt as { $date?: unknown }).$date;
    if (typeof raw === "string") {
      const t = Date.parse(raw);
      return Number.isFinite(t) ? t : 0;
    }
    if (raw instanceof Date) return raw.getTime();
  }
  return 0;
}

/** Keep the newest response per user (NPS should be one score per person). */
export function latestNpsPerUser<T extends { userId: string; createdAt: unknown }>(
  rows: T[],
): T[] {
  const best = new Map<string, T>();
  for (const row of rows) {
    const prev = best.get(row.userId);
    if (!prev || npsCreatedAtMs(row.createdAt) > npsCreatedAtMs(prev.createdAt)) {
      best.set(row.userId, row);
    }
  }
  return [...best.values()].sort(
    (a, b) => npsCreatedAtMs(b.createdAt) - npsCreatedAtMs(a.createdAt),
  );
}

function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === 11000
  );
}

export class NpsRepository {
  private readonly db: Db;

  constructor(documentsClientArg: AppDocumentsClient = documentsClient) {
    this.db = documentsClientArg.db();
  }

  private getCollection() {
    return this.db.collection<TNpsResponse>("nps_responses");
  }

  async findLatestByUserId(userId: string): Promise<TNpsResponse | null> {
    const rows = await this.getCollection().find({ userId }).toArray();
    return latestNpsPerUser(rows)[0] ?? null;
  }

  /**
   * One NPS row per user. Existing responses are left unchanged.
   * Returns false when this user already submitted.
   */
  async createIfNew(data: TNpsResponse): Promise<boolean> {
    const existing = await this.findLatestByUserId(data.userId);
    if (existing) return false;

    try {
      await this.getCollection().insertOne({
        ...data,
        _id: `nps_${data.userId}`,
      } as TNpsResponse & { _id: string });
      return true;
    } catch (err) {
      if (isDuplicateKeyError(err)) return false;
      throw err;
    }
  }

  async create(data: TNpsResponse) {
    await this.createIfNew(data);
  }

  async findByUserId(userId: string): Promise<TNpsResponse[]> {
    return this.getCollection().find({ userId }).sort({ createdAt: -1 }).toArray();
  }

  async getAllPaginated(
    page: number,
    limit: number,
    filter: { trigger?: TNpsResponse["trigger"] } = {},
  ): Promise<(TNpsResponse & { _id?: unknown })[]> {
    const skip = (page - 1) * limit;
    const query: Record<string, unknown> = {};
    if (filter.trigger) query.trigger = filter.trigger;
    return this.getCollection()
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
  }

  async getAll(
    filter: { trigger?: TNpsResponse["trigger"] } = {},
  ): Promise<TNpsResponse[]> {
    const query: Record<string, unknown> = {};
    if (filter.trigger) query.trigger = filter.trigger;
    return this.getCollection().find(query).sort({ createdAt: -1 }).toArray();
  }

  async count(
    filter: { trigger?: TNpsResponse["trigger"] } = {},
  ): Promise<number> {
    const query: Record<string, unknown> = {};
    if (filter.trigger) query.trigger = filter.trigger;
    return this.getCollection().countDocuments(query);
  }
}
