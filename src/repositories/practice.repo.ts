import { PracticeDtoSchema, PracticeSchema, TPracticeDto, TPracticeSchema } from "@/models/practice.model";
import { ObjectId } from "bson";
import type { CompatMongoClient as MongoClient, CompatDb as Db } from "@/lib/pg/types";

/**
 * Extract a 24-char hex string from an ObjectId-like value. Uses duck-typing so it works
 * even when Turbopack/webpack double-bundles `bson` (the API route's `ObjectId` and the
 * repo's `ObjectId` can be different constructors → `instanceof` returns false → the
 * filter silently drops every row). See `src/lib/pg/document.ts` for the same pattern.
 */
function taskIdHexLoose(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") {
    return /^[a-f0-9]{24}$/i.test(value) ? value.toLowerCase() : null;
  }
  if (value instanceof ObjectId) return value.toHexString().toLowerCase();
  if (typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    if (typeof obj.$oid === "string" && /^[a-f0-9]{24}$/i.test(obj.$oid)) {
      return obj.$oid.toLowerCase();
    }
    if (typeof (obj as { toHexString?: unknown }).toHexString === "function") {
      try {
        const hex = (obj as { toHexString: () => string }).toHexString();
        if (typeof hex === "string" && /^[a-f0-9]{24}$/i.test(hex)) return hex.toLowerCase();
      } catch {
        // fall through to other shape checks
      }
    }
    if (obj._bsontype === "ObjectId" && obj.id) {
      const id = obj.id as { toString?: (enc: string) => string } | Uint8Array;
      const buf = id instanceof Uint8Array ? Buffer.from(id) : Buffer.isBuffer(id) ? id : null;
      if (buf && buf.length === 12) return buf.toString("hex").toLowerCase();
    }
  }
  return null;
}

/** Avoid mingo `isEqual` on ObjectId (fails when duplicate `bson` bundles give different constructors). */
function practiceEntityMatchesFilter(
  doc: TPracticeSchema,
  filter: Record<string, unknown>
): boolean {
  for (const [key, want] of Object.entries(filter)) {
    if (want === undefined) continue;
    const got = (doc as unknown as Record<string, unknown>)[key];
    if (key === "taskId") {
      const wh = taskIdHexLoose(want);
      const gh = taskIdHexLoose(got);
      if (!wh || !gh || wh !== gh) return false;
      continue;
    }
    if (key === "type") {
      if (String(got ?? "").toUpperCase() !== String(want).toUpperCase()) return false;
      continue;
    }
    if (got !== want && String(got) !== String(want)) return false;
  }
  return true;
}

export class PracticeRepository {
  private readonly db: Db;

  constructor(mongoClient: MongoClient) {
    this.db = mongoClient.db();
  }

  private getPracticeCollection() {
    return this.db.collection<TPracticeSchema>("practices");
  }

  private convertFromEntity(practiceEntity: TPracticeSchema) {
    const { taskId, ...rest } = practiceEntity;
    const practice: TPracticeDto = {
      id: practiceEntity._id.toHexString(),
      taskId: taskId.toHexString(),
      ...rest,
    };
    return PracticeDtoSchema.parse(practice);
  }
    async findPractice(id: string): Promise<TPracticeDto | null> {
      const entity = await this.getPracticeCollection().findOne({ _id: new ObjectId(id) });
      return entity ? this.convertFromEntity(entity) : null;
    }

  async createPractice(dto: Omit<TPracticeDto, "id">): Promise<TPracticeDto> {
    const practice = PracticeSchema.parse({
      ...dto,
      taskId: new ObjectId(dto.taskId ?? ""),
      _id: new ObjectId(),
    });
    const { insertedId } = await this.getPracticeCollection().insertOne(practice);
    return this.convertFromEntity({ ...dto, taskId: new ObjectId(dto.taskId ?? ""), _id: insertedId });
  }

  async getAllPractice(
    filter: Partial<TPracticeDto>,
    page: number = 0,
    limit: number = 10
  ): Promise<{ items: TPracticeDto[]; hasNextPage: boolean; page: number; totalPages: number; totalItems: number }> {
    const skip = page * limit;
    const sanitizedFilter = Object.fromEntries(
      Object.entries(filter).filter(([_, value]) => value !== undefined)
    ) as Record<string, unknown>;
    if (typeof sanitizedFilter.type === "string") {
      sanitizedFilter.type = sanitizedFilter.type.toUpperCase();
    }
    if (sanitizedFilter.taskId != null) {
      const hex = taskIdHexLoose(sanitizedFilter.taskId);
      if (hex) sanitizedFilter.taskId = hex;
    }

    const coll = this.getPracticeCollection();
    const all = await coll.find({}).sort({ isFree: -1 }).toArray();
    const matched = all.filter((doc) =>
      practiceEntityMatchesFilter(doc as TPracticeSchema, sanitizedFilter)
    );
    const totalItems = matched.length;
    const slice = matched.slice(skip, skip + limit);
    const totalPages = limit > 0 ? Math.ceil(totalItems / limit) : 0;

    return {
      items: slice.map((practice) => this.convertFromEntity(practice as TPracticeSchema)),
      page,
      totalItems,
      totalPages,
      hasNextPage: skip + limit < totalItems,
    };
  }

    async updatePractice(id: string, dto: Omit<Partial<TPracticeDto>, "id">): Promise<TPracticeDto | null> {
      const candidate = PracticeSchema.partial().parse({...dto, taskId: new ObjectId(dto.taskId ?? "")});

      const result = await this.getPracticeCollection().findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: candidate },
        { returnDocument: "after" }
      );
      return result ? this.convertFromEntity(result) : null;
    }

    async deletePractice(id: string): Promise<void> {
      await this.getPracticeCollection().deleteOne({ _id: new ObjectId(id) });
    }
}
