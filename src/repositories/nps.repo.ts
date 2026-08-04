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

export class NpsRepository {
  private readonly db: Db;

  constructor(documentsClientArg: AppDocumentsClient = documentsClient) {
    this.db = documentsClientArg.db();
  }

  private getCollection() {
    return this.db.collection<TNpsResponse>("nps_responses");
  }

  async create(data: TNpsResponse) {
    await this.getCollection().insertOne(data);
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
