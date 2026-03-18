import { Db, MongoClient, ObjectId } from "mongodb";
import {
  HomepageHeroScheduleSchema,
  HomepageHeroScheduleSchemaDto,
  HomepageHeroScheduleWriteSchema,
  THomepageHeroScheduleSchema,
  THomepageHeroScheduleSchemaDto,
  THomepageHeroScheduleWriteInput,
} from "@/models/homepage-hero-schedule.model";

export class HomepageHeroScheduleRepository {
  private readonly db: Db;

  constructor(mongoClient: MongoClient) {
    this.db = mongoClient.db();
  }

  private getCollection() {
    return this.db.collection<THomepageHeroScheduleSchema>("homepageHeroSchedules");
  }

  private convertFromEntity(
    entity: THomepageHeroScheduleSchema
  ): THomepageHeroScheduleSchemaDto {
    return HomepageHeroScheduleSchemaDto.parse({
      id: entity._id.toHexString(),
      ...entity,
    });
  }

  async ensureIndexes(): Promise<void> {
    await this.getCollection().createIndex({ scheduleKey: 1 }, { unique: true });
    await this.getCollection().createIndex({
      isEnabled: 1,
      startDate: 1,
      endDate: 1,
      priority: 1,
    });
    await this.getCollection().createIndex({ updatedAt: -1 });
  }

  async getAllSchedules(): Promise<THomepageHeroScheduleSchemaDto[]> {
    const entities = await this.getCollection()
      .find({})
      .sort({ priority: 1, startDate: 1, updatedAt: -1 })
      .toArray();

    return entities.map((entity) => this.convertFromEntity(entity));
  }

  async getActiveSchedule(
    targetDate: string
  ): Promise<THomepageHeroScheduleSchemaDto | null> {
    const entity = await this.getCollection()
      .find({
        isEnabled: true,
        startDate: { $lte: targetDate },
        endDate: { $gte: targetDate },
      })
      .sort({ priority: 1, startDate: -1, updatedAt: -1 })
      .limit(1)
      .next();

    return entity ? this.convertFromEntity(entity) : null;
  }

  async createSchedule(
    input: THomepageHeroScheduleWriteInput
  ): Promise<THomepageHeroScheduleSchemaDto> {
    const parsed = HomepageHeroScheduleWriteSchema.parse(input);
    const now = new Date();
    const entity = HomepageHeroScheduleSchema.parse({
      _id: new ObjectId(),
      scheduleKey: new ObjectId().toHexString(),
      ...parsed,
      createdAt: now,
      updatedAt: now,
    });

    const { insertedId } = await this.getCollection().insertOne(entity);

    return this.convertFromEntity({ ...entity, _id: insertedId });
  }

  async updateSchedule(
    id: string,
    input: THomepageHeroScheduleWriteInput
  ): Promise<THomepageHeroScheduleSchemaDto | null> {
    const parsed = HomepageHeroScheduleWriteSchema.parse(input);

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

    return updated
      ? this.convertFromEntity(HomepageHeroScheduleSchema.parse(updated))
      : null;
  }

  async deleteSchedule(id: string): Promise<boolean> {
    const result = await this.getCollection().deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }
}
