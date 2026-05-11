import { ObjectId } from "bson";
import type { CompatMongoClient as MongoClient, CompatDb as Db } from "@/lib/pg/types";
import {
  LeadCaptureConfigSchema,
  LeadCaptureConfigSchemaDto,
  LeadCaptureConfigWriteSchema,
  TLeadCaptureConfigSchema,
  TLeadCaptureConfigSchemaDto,
  TLeadCaptureConfigWriteInput,
  TLeadCapturePublicConfig,
} from "@/models/lead-capture.model";

const DEFAULT_POPUP_CONFIG: TLeadCapturePublicConfig = {
  name: "Default Lead Capture",
  headline: "Stuck at CLB 8? Get the Free 2026 CELPIP Templates Guide.",
  subHeadline:
    "Stop using robotic templates. Download our examiner-approved email and survey templates to hit CLB 9+.",
  ctaText: "Send My Free Guide",
  exitIntent: { enabled: true, value: 0 },
  timeOnPage: { enabled: true, value: 30 },
  scrollDepth: { enabled: true, value: 50 },
  targetPaths: [],
  senderGroupId: "",
  senderGroupName: "",
  priority: 100,
  audience: {
    showToGuest: true,
    showToLoggedIn: true,
    showToPremium: true,
    showToWasPremium: true,
  },
  frequencyCapDays: 30,
  isEnabled: true,
};

export class LeadCaptureConfigRepository {
  private readonly db: Db;

  constructor(mongoClient: MongoClient) {
    this.db = mongoClient.db();
  }

  private getCollection() {
    return this.db.collection<TLeadCaptureConfigSchema>("leadCaptureConfig");
  }

  private convertFromEntity(
    entity: TLeadCaptureConfigSchema
  ): TLeadCaptureConfigSchemaDto {
    const dto: TLeadCaptureConfigSchemaDto = {
      id: entity._id.toHexString(),
      ...entity,
    };

    return LeadCaptureConfigSchemaDto.parse(dto);
  }

  async ensureIndexes(): Promise<void> {
    await this.getCollection().createIndex({ configKey: 1 }, { unique: true });
    await this.getCollection().createIndex({ isEnabled: 1, priority: 1 });
    await this.getCollection().createIndex({ updatedAt: -1 });
  }

  async getConfigById(id: string): Promise<TLeadCaptureConfigSchemaDto | null> {
    try {
      const entity = await this.getCollection().findOne({ _id: new ObjectId(id) });
      return entity ? this.convertFromEntity(entity) : null;
    } catch {
      return null;
    }
  }

  async getAllConfigs(): Promise<TLeadCaptureConfigSchemaDto[]> {
    const entities = await this.getCollection()
      .find({})
      .sort({ priority: 1, updatedAt: -1 })
      .toArray();
    return entities.map((entity) => this.convertFromEntity(entity));
  }

  async getPublicConfigs(): Promise<Array<TLeadCapturePublicConfig & { id: string }>> {
    const configs = await this.getAllConfigs();
    const enabledConfigs = configs.filter((item) => item.isEnabled);

    if (enabledConfigs.length === 0) {
      return [{ id: "default-fallback", ...DEFAULT_POPUP_CONFIG }];
    }

    return enabledConfigs.map((config) => ({
      id: config.id,
      name: config.name,
      headline: config.headline,
      subHeadline: config.subHeadline,
      ctaText: config.ctaText,
      exitIntent: config.exitIntent,
      timeOnPage: config.timeOnPage,
      scrollDepth: config.scrollDepth,
      targetPaths: config.targetPaths,
      senderGroupId: config.senderGroupId,
      senderGroupName: config.senderGroupName,
      priority: config.priority,
      audience: config.audience,
      frequencyCapDays: config.frequencyCapDays,
      isEnabled: config.isEnabled,
    }));
  }

  async createConfig(
    input: TLeadCaptureConfigWriteInput
  ): Promise<TLeadCaptureConfigSchemaDto> {
    const parsed = LeadCaptureConfigWriteSchema.parse(input);
    const now = new Date();

    const entity = LeadCaptureConfigSchema.parse({
      _id: new ObjectId(),
      configKey: new ObjectId().toHexString(),
      ...parsed,
      createdAt: now,
      updatedAt: now,
    });
    const { insertedId } = await this.getCollection().insertOne(entity);
    return this.convertFromEntity({ ...entity, _id: insertedId });
  }

  async updateConfig(
    id: string,
    input: TLeadCaptureConfigWriteInput
  ): Promise<TLeadCaptureConfigSchemaDto | null> {
    const parsed = LeadCaptureConfigWriteSchema.parse(input);
    const updated = await this.getCollection().findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...parsed,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );
    return updated ? this.convertFromEntity(LeadCaptureConfigSchema.parse(updated)) : null;
  }

  async deleteConfig(id: string): Promise<boolean> {
    const result = await this.getCollection().deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }
}

export { DEFAULT_POPUP_CONFIG };
