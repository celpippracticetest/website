import { MongoClient, Db, ObjectId, Filter } from "mongodb";
import {
  WikiArticleSchema,
  WikiArticleSchemaDto,
  TWikiArticleSchema,
  TWikiArticleSchemaDto,
  TWikiArticleWriteInput,
} from "@/models/wiki.model";

const COLLECTION_NAME = "wikiArticles";

export class WikiRepository {
  private readonly db: Db;

  constructor(mongoClient: MongoClient) {
    this.db = mongoClient.db();
  }

  private getCollection() {
    return this.db.collection<TWikiArticleSchema>(COLLECTION_NAME);
  }

  private convertFromEntity(entity: TWikiArticleSchema): TWikiArticleSchemaDto {
    const { _id, ...rest } = entity;
    const dto = { id: _id.toHexString(), ...rest };
    return WikiArticleSchemaDto.parse(dto);
  }

  private normalizeSlug(rawSlug: string): string {
    return rawSlug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-");
  }

  async findById(id: string): Promise<TWikiArticleSchemaDto | null> {
    if (!ObjectId.isValid(id)) return null;
    const entity = await this.getCollection().findOne({
      _id: new ObjectId(id),
    });
    return entity ? this.convertFromEntity(entity) : null;
  }

  async findBySlug(slug: string): Promise<TWikiArticleSchemaDto | null> {
    const entity = await this.getCollection().findOne({
      slug: this.normalizeSlug(slug),
    });
    return entity ? this.convertFromEntity(entity) : null;
  }

  async findAll(): Promise<TWikiArticleSchemaDto[]> {
    const entities = await this.getCollection()
      .find({})
      .sort({ sortOrder: 1, slug: 1 })
      .toArray();
    return entities.map((e) => this.convertFromEntity(e));
  }

  async getSlugs(): Promise<Array<{ slug: string; updatedAt: Date }>> {
    const rows = await this.getCollection()
      .find({}, { projection: { slug: 1, updatedAt: 1 } })
      .sort({ sortOrder: 1, slug: 1 })
      .toArray();
    return rows.map((row) => ({
      slug: row.slug,
      updatedAt: row.updatedAt,
    }));
  }

  async findRelated(
    currentId: string,
    category: string,
    limit: number = 2
  ): Promise<TWikiArticleSchemaDto[]> {
    const filter: Filter<TWikiArticleSchema> = {
      _id: { $ne: new ObjectId(currentId) },
      category,
    };
    const entities = await this.getCollection()
      .find(filter)
      .sort({ sortOrder: 1, slug: 1 })
      .limit(Math.max(limit, 1))
      .toArray();
    return entities.map((e) => this.convertFromEntity(e));
  }

  /** Get the next article after the one with the given slug (by sortOrder, then slug). */
  async findNextBySlug(slug: string): Promise<TWikiArticleSchemaDto | null> {
    const current = await this.findBySlug(slug);
    if (!current) return null;

    const entities = await this.getCollection()
      .find({
        $or: [
          { sortOrder: { $gt: current.sortOrder } },
          { sortOrder: current.sortOrder, slug: { $gt: current.slug } },
        ],
      })
      .sort({ sortOrder: 1, slug: 1 })
      .limit(1)
      .toArray();

    return entities[0] ? this.convertFromEntity(entities[0]) : null;
  }

  async create(dto: TWikiArticleWriteInput): Promise<TWikiArticleSchemaDto> {
    const now = new Date();
    const slug = this.normalizeSlug(dto.slug);
    const doc: TWikiArticleSchema = {
      _id: new ObjectId(),
      ...dto,
      slug,
      createdAt: now,
      updatedAt: now,
    };
    await this.getCollection().insertOne(doc);
    return this.convertFromEntity(doc);
  }

  async upsertBySlug(
    slug: string,
    dto: TWikiArticleWriteInput
  ): Promise<TWikiArticleSchemaDto> {
    const normalized = this.normalizeSlug(slug);
    const now = new Date();
    const existing = await this.getCollection().findOne({ slug: normalized });

    const payload = {
      ...dto,
      slug: normalized,
      updatedAt: now,
    };

    if (existing) {
      const updated = await this.getCollection().findOneAndUpdate(
        { slug: normalized },
        { $set: payload },
        { returnDocument: "after" }
      );
      return updated ? this.convertFromEntity(updated) : this.convertFromEntity(existing);
    }

    const doc: TWikiArticleSchema = {
      _id: new ObjectId(),
      ...payload,
      createdAt: now,
    };
    await this.getCollection().insertOne(doc);
    return this.convertFromEntity(doc);
  }

  async deleteBySlug(slug: string): Promise<boolean> {
    const result = await this.getCollection().deleteOne({
      slug: this.normalizeSlug(slug),
    });
    return (result.deletedCount ?? 0) > 0;
  }

  async updateById(
    id: string,
    dto: Partial<TWikiArticleWriteInput>
  ): Promise<TWikiArticleSchemaDto | null> {
    if (!ObjectId.isValid(id)) return null;
    const now = new Date();
    const payload = { ...dto, updatedAt: now };
    if (dto.slug !== undefined) {
      payload.slug = this.normalizeSlug(dto.slug);
    }
    const updated = await this.getCollection().findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: payload },
      { returnDocument: "after" }
    );
    return updated ? this.convertFromEntity(updated) : null;
  }

  async deleteById(id: string): Promise<boolean> {
    if (!ObjectId.isValid(id)) return false;
    const result = await this.getCollection().deleteOne({
      _id: new ObjectId(id),
    });
    return (result.deletedCount ?? 0) > 0;
  }
}
