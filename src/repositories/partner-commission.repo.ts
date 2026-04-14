import type {
  TPartnerCommissionDto,
  TPartnerCommissionSchema,
} from "@/models/partner-commission.model";
import { partnerCommissionToDto } from "@/models/partner-commission.model";
import { MongoClient, Db, ObjectId } from "mongodb";

const COLL = "partnerCommissions";

export class PartnerCommissionRepository {
  private readonly db: Db;

  constructor(mongoClient: MongoClient) {
    this.db = mongoClient.db();
  }

  private col() {
    return this.db.collection<TPartnerCommissionSchema>(COLL);
  }

  async ensureIndexes() {
    await this.col().createIndex({ idempotencyKey: 1 }, { unique: true });
    await this.col().createIndex({ partnerId: 1 });
    await this.col().createIndex({ subscriberClerkUserId: 1 });
  }

  async insertCommission(
    doc: Omit<TPartnerCommissionSchema, "_id" | "createdAt" | "updatedAt">
  ): Promise<{ inserted: true; dto: TPartnerCommissionDto } | { inserted: false }> {
    const now = new Date();
    const entity: TPartnerCommissionSchema = {
      ...doc,
      _id: new ObjectId(),
      createdAt: now,
      updatedAt: now,
    };
    try {
      await this.col().insertOne(entity);
      return { inserted: true, dto: partnerCommissionToDto(entity) };
    } catch (e: unknown) {
      const code = (e as { code?: number })?.code;
      if (code === 11000) {
        return { inserted: false };
      }
      throw e;
    }
  }

  async findByPartnerId(partnerId: string): Promise<TPartnerCommissionDto[]> {
    const docs = await this.col()
      .find({ partnerId })
      .sort({ createdAt: -1 })
      .toArray();
    return docs.map(partnerCommissionToDto);
  }

  async aggregateTotalsForPartner(partnerId: string): Promise<{
    pending: number;
    paid: number;
    count: number;
  }> {
    const rows = await this.col()
      .aggregate([
        { $match: { partnerId } },
        {
          $group: {
            _id: "$status",
            total: { $sum: "$commissionAmount" },
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    let pending = 0;
    let paid = 0;
    let count = 0;
    for (const r of rows) {
      count += Number(r.count) || 0;
      if (r._id === "pending") pending = Number(r.total) || 0;
      if (r._id === "paid") paid = Number(r.total) || 0;
    }
    return { pending, paid, count };
  }
}
