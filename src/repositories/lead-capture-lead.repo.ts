import { ObjectId } from "bson";
import type { MongoFilter } from "@/lib/pg/types";
import type { CompatMongoClient as MongoClient, CompatDb as Db } from "@/lib/pg/types";
import {
  LeadCaptureLeadSchema,
  LeadCaptureLeadSchemaDto,
  LeadCaptureLeadWriteSchema,
  TLeadCaptureLeadSchema,
  TLeadCaptureLeadSchemaDto,
  TLeadCaptureLeadWriteInput,
} from "@/models/lead-capture.model";

type LeadCaptureLeadListFilters = {
  search?: string;
  leadCaptureId?: string;
};

type PaginatedLeadCaptureLeadsResult = {
  items: TLeadCaptureLeadSchemaDto[];
  page: number;
  totalPages: number;
  totalItems: number;
  hasNextPage: boolean;
};

export class LeadCaptureLeadRepository {
  private readonly db: Db;

  constructor(mongoClient: MongoClient) {
    this.db = mongoClient.db();
  }

  private getCollection() {
    return this.db.collection<TLeadCaptureLeadSchema>("leadCaptureLeads");
  }

  private convertFromEntity(
    entity: TLeadCaptureLeadSchema
  ): TLeadCaptureLeadSchemaDto {
    const dto: TLeadCaptureLeadSchemaDto = {
      id: entity._id.toHexString(),
      ...entity,
    };

    return LeadCaptureLeadSchemaDto.parse(dto);
  }

  async ensureIndexes(): Promise<void> {
    await this.getCollection().createIndex({ emailLower: 1 });
    await this.getCollection().createIndex({ subscribedAt: -1 });
    await this.getCollection().createIndex({ sourceUrl: 1 });
    await this.getCollection().createIndex({ createdAt: -1 });
    await this.getCollection().createIndex({ senderSyncStatus: 1 });
    await this.getCollection().createIndex({ leadCaptureId: 1 });
    await this.getCollection().createIndex({ senderGroupId: 1 });
  }

  async createLead(input: TLeadCaptureLeadWriteInput): Promise<TLeadCaptureLeadSchemaDto> {
    const now = new Date();
    const parsed = LeadCaptureLeadWriteSchema.parse(input);

    const lead = LeadCaptureLeadSchema.parse({
      _id: new ObjectId(),
      ...parsed,
      emailLower: parsed.email.toLowerCase(),
      subscribedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    const { insertedId } = await this.getCollection().insertOne(lead);
    return this.convertFromEntity({ ...lead, _id: insertedId });
  }

  async updateSenderSyncStatus(
    id: string,
    status: "pending" | "synced" | "failed",
    senderSyncError?: string
  ): Promise<void> {
    await this.getCollection().updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          senderSyncStatus: status,
          senderSyncError,
          updatedAt: new Date(),
        },
      }
    );
  }

  async findRecentByEmailLower(
    emailLower: string,
    withinMinutes: number
  ): Promise<TLeadCaptureLeadSchemaDto | null> {
    const cutoff = new Date(Date.now() - withinMinutes * 60 * 1000);
    const entity = await this.getCollection().findOne(
      { emailLower: emailLower.toLowerCase(), createdAt: { $gte: cutoff } },
      { sort: { createdAt: -1 } }
    );

    return entity ? this.convertFromEntity(entity) : null;
  }

  private buildListFilter(filters: LeadCaptureLeadListFilters): MongoFilter<TLeadCaptureLeadSchema> {
    const query: MongoFilter<TLeadCaptureLeadSchema> = {};

    if (filters.search) {
      query.$or = [
        { email: { $regex: filters.search, $options: "i" } },
        { firstName: { $regex: filters.search, $options: "i" } },
        { sourceUrl: { $regex: filters.search, $options: "i" } },
        { leadCaptureName: { $regex: filters.search, $options: "i" } },
      ];
    }

    if (filters.leadCaptureId) {
      query.leadCaptureId = filters.leadCaptureId;
    }

    return query;
  }

  async getLeads(
    filters: LeadCaptureLeadListFilters,
    page: number = 0,
    limit: number = 20
  ): Promise<PaginatedLeadCaptureLeadsResult> {
    const currentPage = Math.max(0, page);
    const pageSize = Math.max(1, Math.min(limit, 100));
    const query = this.buildListFilter(filters);

    const [totalItems, entities] = await Promise.all([
      this.getCollection().countDocuments(query),
      this.getCollection()
        .find(query)
        .sort({ subscribedAt: -1, createdAt: -1 })
        .skip(currentPage * pageSize)
        .limit(pageSize)
        .toArray(),
    ]);

    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize);

    return {
      items: entities.map((entity) => this.convertFromEntity(entity)),
      page: currentPage,
      totalItems,
      totalPages,
      hasNextPage: currentPage + 1 < totalPages,
    };
  }

  async getLeadsForExport(limit: number = 5000): Promise<TLeadCaptureLeadSchemaDto[]> {
    const rows = await this.getCollection()
      .find({})
      .sort({ subscribedAt: -1, createdAt: -1 })
      .limit(Math.max(1, Math.min(limit, 10000)))
      .toArray();

    return rows.map((entity) => this.convertFromEntity(entity));
  }
}
