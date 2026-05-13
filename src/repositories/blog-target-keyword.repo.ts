import { ObjectId } from "bson";
import type { AppDocFilter } from "@/lib/pg/types";
import type { AppDocumentsClient, AppDocumentsDb as Db } from "@/lib/pg/types";
import {
  BlogTargetKeywordSchema,
  BlogTargetKeywordSchemaDto,
  TBlogTargetKeywordSchema,
  TBlogTargetKeywordSchemaDto,
  TBlogTargetKeywordWriteInput,
} from "@/models/blog-target-keyword.model";

const COLLECTION_NAME = "blog_target_keywords";

export type BlogTargetKeywordBulkImportResult = {
  created: number;
  skippedDuplicate: number;
  skippedInvalid: number;
  skippedEmpty: number;
};

const PHRASE_MAX_LEN = 200;

export class BlogTargetKeywordRepository {
  private readonly db: Db;

  constructor(documentsClient: AppDocumentsClient) {
    this.db = documentsClient.db();
  }

  private getCollection() {
    return this.db.collection<TBlogTargetKeywordSchema>(COLLECTION_NAME);
  }

  private convertFromEntity(entity: TBlogTargetKeywordSchema): TBlogTargetKeywordSchemaDto {
    const dto = { id: entity._id.toHexString(), ...entity };
    return BlogTargetKeywordSchemaDto.parse(dto);
  }

  private normalizePhraseKey(phrase: string): string {
    return phrase.trim().toLowerCase();
  }

  async findDuplicatePhrase(
    phrase: string,
    excludeId?: string
  ): Promise<TBlogTargetKeywordSchemaDto | null> {
    const key = this.normalizePhraseKey(phrase);
    const filter: AppDocFilter<TBlogTargetKeywordSchema> = {
      phraseKey: key,
    };
    if (excludeId && ObjectId.isValid(excludeId)) {
      filter._id = { $ne: new ObjectId(excludeId) };
    }
    const entity = await this.getCollection().findOne(filter);
    return entity ? this.convertFromEntity(entity) : null;
  }

  async listAll(): Promise<TBlogTargetKeywordSchemaDto[]> {
    const entities = await this.getCollection()
      .find({})
      .sort({ sortOrder: 1, phrase: 1 })
      .toArray();
    return entities.map((e) => this.convertFromEntity(e));
  }

  /** Active keywords in display order, for AI blog generation. */
  async listActivePhrases(): Promise<string[]> {
    const entities = await this.getCollection()
      .find({ isActive: true })
      .sort({ sortOrder: 1, phrase: 1 })
      .project<{ phrase: string }>({ phrase: 1 })
      .toArray();
    return entities.map((e) => e.phrase.trim()).filter(Boolean);
  }

  async create(dto: TBlogTargetKeywordWriteInput): Promise<TBlogTargetKeywordSchemaDto> {
    const now = new Date();
    const phrase = dto.phrase.trim();
    const doc: TBlogTargetKeywordSchema = BlogTargetKeywordSchema.parse({
      _id: new ObjectId(),
      phrase,
      phraseKey: this.normalizePhraseKey(phrase),
      notes: dto.notes?.trim() ?? "",
      sortOrder: dto.sortOrder,
      isActive: dto.isActive,
      createdAt: now,
      updatedAt: now,
    });
    await this.getCollection().insertOne(doc);
    return this.convertFromEntity(doc);
  }

  async update(
    id: string,
    dto: Partial<TBlogTargetKeywordWriteInput>
  ): Promise<TBlogTargetKeywordSchemaDto | null> {
    if (!ObjectId.isValid(id)) return null;
    const current = await this.getCollection().findOne({ _id: new ObjectId(id) });
    if (!current) return null;

    const nextPhrase = dto.phrase != null ? dto.phrase.trim() : current.phrase;
    const updateDoc: Partial<TBlogTargetKeywordSchema> = {
      updatedAt: new Date(),
    };
    if (dto.phrase != null) {
      updateDoc.phrase = nextPhrase;
      updateDoc.phraseKey = this.normalizePhraseKey(nextPhrase);
    }
    if (dto.notes != null) updateDoc.notes = dto.notes.trim();
    if (dto.sortOrder != null) updateDoc.sortOrder = dto.sortOrder;
    if (dto.isActive != null) updateDoc.isActive = dto.isActive;

    await this.getCollection().updateOne({ _id: new ObjectId(id) }, { $set: updateDoc });
    const updated = await this.getCollection().findOne({ _id: new ObjectId(id) });
    return updated ? this.convertFromEntity(updated) : null;
  }

  async delete(id: string): Promise<boolean> {
    if (!ObjectId.isValid(id)) return false;
    const result = await this.getCollection().deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount === 1;
  }

  private async nextSortOrderStart(): Promise<number> {
    const agg = await this.getCollection()
      .aggregate([{ $group: { _id: null, maxOrder: { $max: "$sortOrder" } } }])
      .toArray();
    const max = agg[0]?.maxOrder;
    return typeof max === "number" && Number.isFinite(max) ? max + 1 : 0;
  }

  /**
   * Insert many unique phrases (trimmed, non-empty, max length). Skips duplicates against DB and within the batch.
   */
  async bulkImportPhrases(
    rawPhrases: string[],
    options: { isActive: boolean },
  ): Promise<BlogTargetKeywordBulkImportResult> {
    let skippedEmpty = 0;
    let skippedInvalid = 0;
    let skippedDuplicate = 0;
    const batchKeys = new Set<string>();
    const candidates: string[] = [];

    for (const raw of rawPhrases) {
      const p = raw.trim();
      if (!p) {
        skippedEmpty += 1;
        continue;
      }
      if (p.length > PHRASE_MAX_LEN) {
        skippedInvalid += 1;
        continue;
      }
      const key = this.normalizePhraseKey(p);
      if (batchKeys.has(key)) {
        skippedDuplicate += 1;
        continue;
      }
      batchKeys.add(key);
      candidates.push(p);
    }

    if (candidates.length === 0) {
      return { created: 0, skippedDuplicate, skippedInvalid, skippedEmpty };
    }

    const keys = candidates.map((p) => this.normalizePhraseKey(p));
    const existing = await this.getCollection()
      .find({ phraseKey: { $in: keys } })
      .project<{ phraseKey: string }>({ phraseKey: 1 })
      .toArray();
    const existingSet = new Set(existing.map((e) => e.phraseKey));

    let sortOrder = await this.nextSortOrderStart();
    const now = new Date();
    const docs: TBlogTargetKeywordSchema[] = [];

    for (const phrase of candidates) {
      const key = this.normalizePhraseKey(phrase);
      if (existingSet.has(key)) {
        skippedDuplicate += 1;
        continue;
      }
      existingSet.add(key);
      docs.push(
        BlogTargetKeywordSchema.parse({
          _id: new ObjectId(),
          phrase,
          phraseKey: key,
          notes: "",
          sortOrder: sortOrder++,
          isActive: options.isActive,
          createdAt: now,
          updatedAt: now,
        }),
      );
    }

    if (docs.length > 0) {
      await this.getCollection().insertMany(docs);
    }

    return {
      created: docs.length,
      skippedDuplicate,
      skippedInvalid,
      skippedEmpty,
    };
  }
}
