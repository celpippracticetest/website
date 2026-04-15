import { MongoClient, Db } from "mongodb";

const COLL = "partnerProgramSettings";
const DEFAULTS_DOC_ID = "program_defaults";

export type PartnerProgramDefaults = {
  referredDiscountPercent: number;
  partnerCommissionPercent: number;
};

const FALLBACK: PartnerProgramDefaults = {
  referredDiscountPercent: 20,
  partnerCommissionPercent: 30,
};

export class PartnerProgramSettingsRepository {
  private readonly db: Db;

  constructor(mongoClient: MongoClient) {
    this.db = mongoClient.db();
  }

  private col() {
    return this.db.collection(COLL);
  }

  async getDefaults(): Promise<PartnerProgramDefaults> {
    const doc = await this.col().findOne({ _id: DEFAULTS_DOC_ID });
    if (!doc) {
      return { ...FALLBACK };
    }
    return {
      referredDiscountPercent:
        typeof doc.referredDiscountPercent === "number"
          ? doc.referredDiscountPercent
          : FALLBACK.referredDiscountPercent,
      partnerCommissionPercent:
        typeof doc.partnerCommissionPercent === "number"
          ? doc.partnerCommissionPercent
          : FALLBACK.partnerCommissionPercent,
    };
  }

  async setDefaults(values: PartnerProgramDefaults): Promise<PartnerProgramDefaults> {
    const now = new Date();
    await this.col().updateOne(
      { _id: DEFAULTS_DOC_ID },
      {
        $set: {
          referredDiscountPercent: values.referredDiscountPercent,
          partnerCommissionPercent: values.partnerCommissionPercent,
          updatedAt: now,
        },
        $setOnInsert: {
          _id: DEFAULTS_DOC_ID,
          createdAt: now,
        },
      },
      { upsert: true }
    );
    return this.getDefaults();
  }
}
