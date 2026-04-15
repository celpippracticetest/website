import { ReferralRepository } from "@/repositories/referral.repo";
import type { TPartnerDto, TPartnerSchema } from "@/models/partner.model";
import { partnerToDto } from "@/models/partner.model";
import { MongoClient, Db, ObjectId } from "mongodb";

const COLL = "partners";

export class PartnerRepository {
  private readonly db: Db;
  private readonly mongoClient: MongoClient;

  constructor(mongoClient: MongoClient) {
    this.mongoClient = mongoClient;
    this.db = mongoClient.db();
  }

  private col() {
    return this.db.collection<TPartnerSchema>(COLL);
  }

  async ensureIndexes() {
    await this.col().createIndex({ code: 1 }, { unique: true });
    await this.col().createIndex({ clerkUserId: 1 }, { unique: true });
  }

  async findActiveByCode(code: string): Promise<TPartnerDto | null> {
    const normalized = code.trim();
    if (!normalized) return null;
    const doc = await this.col().findOne({
      code: normalized,
      status: "active",
    });
    return doc ? partnerToDto(doc) : null;
  }

  async findByCodeAnyStatus(code: string): Promise<TPartnerDto | null> {
    const normalized = code.trim();
    if (!normalized) return null;
    const doc = await this.col().findOne({ code: normalized });
    return doc ? partnerToDto(doc) : null;
  }

  async findByClerkUserId(clerkUserId: string): Promise<TPartnerDto | null> {
    const doc = await this.col().findOne({ clerkUserId });
    return doc ? partnerToDto(doc) : null;
  }

  async findById(id: string): Promise<TPartnerDto | null> {
    if (!ObjectId.isValid(id)) return null;
    const doc = await this.col().findOne({ _id: new ObjectId(id) });
    return doc ? partnerToDto(doc) : null;
  }

  async codeExists(code: string): Promise<boolean> {
    const c = code.trim();
    const hit = await this.col().findOne({ code: c }, { projection: { _id: 1 } });
    if (hit) return true;
    const refRepo = new ReferralRepository(this.mongoClient);
    await refRepo.ensureIndexes();
    const refHit = await refRepo.findOneByCode(c);
    return Boolean(refHit);
  }

  async insertPartner(doc: {
    code: string;
    clerkUserId: string;
    payoutEmail: string;
    status: "pending" | "active" | "suspended";
  }): Promise<TPartnerDto> {
    const now = new Date();
    const entity: TPartnerSchema = {
      _id: new ObjectId(),
      code: doc.code.trim(),
      clerkUserId: doc.clerkUserId,
      payoutEmail: doc.payoutEmail.trim().toLowerCase(),
      status: doc.status,
      createdAt: now,
      updatedAt: now,
    };
    await this.col().insertOne(entity);
    return partnerToDto(entity);
  }

  async updatePayoutEmail(
    clerkUserId: string,
    payoutEmail: string
  ): Promise<TPartnerDto | null> {
    const r = await this.col().findOneAndUpdate(
      { clerkUserId },
      {
        $set: {
          payoutEmail: payoutEmail.trim().toLowerCase(),
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );
    const doc = r ?? null;
    return doc ? partnerToDto(doc) : null;
  }

  async updateStatusById(
    id: string,
    status: "pending" | "active" | "suspended"
  ): Promise<TPartnerDto | null> {
    if (!ObjectId.isValid(id)) return null;
    const r = await this.col().findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { status, updatedAt: new Date() } },
      { returnDocument: "after" }
    );
    return r ? partnerToDto(r as TPartnerSchema) : null;
  }

  async updateRatesById(
    id: string,
    rates: {
      referredDiscountPercent?: number | null;
      commissionPercent?: number | null;
    }
  ): Promise<TPartnerDto | null> {
    if (!ObjectId.isValid(id)) return null;
    const $set: Record<string, unknown> = { updatedAt: new Date() };
    const $unset: Record<string, ""> = {};
    if (rates.referredDiscountPercent !== undefined) {
      if (rates.referredDiscountPercent === null) {
        $unset.referredDiscountPercent = "";
      } else {
        $set.referredDiscountPercent = rates.referredDiscountPercent;
      }
    }
    if (rates.commissionPercent !== undefined) {
      if (rates.commissionPercent === null) {
        $unset.commissionPercent = "";
      } else {
        $set.commissionPercent = rates.commissionPercent;
      }
    }
    const update: { $set: Record<string, unknown>; $unset?: Record<string, ""> } = {
      $set,
    };
    if (Object.keys($unset).length) {
      update.$unset = $unset;
    }
    const r = await this.col().findOneAndUpdate(
      { _id: new ObjectId(id) },
      update,
      { returnDocument: "after" }
    );
    return r ? partnerToDto(r as TPartnerSchema) : null;
  }

  async listAll(): Promise<TPartnerDto[]> {
    const docs = await this.col().find({}).sort({ createdAt: -1 }).toArray();
    return docs.map(partnerToDto);
  }
}
