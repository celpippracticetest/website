import {
  TWritingAnswer,
  TWritingAnswerDto,
  WritingAnswerSchema,
  writingAnswerDtoFromLeanDocument,
} from "@/models/answer";
import { ObjectId } from "bson";
import type { AppDocumentsClient, AppDocumentsDb as Db } from "@/lib/pg/types";
import { shouldPersistAnswersInSupabase } from "@/lib/auth/should-use-supabase-practice-answers";
import {
  normalizeExamIdForStorage,
  supabaseCreateOrUpdateWritingAnswer,
  supabaseDeleteWritingAnswer,
  supabaseFindPracticeIdsWithWritingAnswers,
  supabaseFindWritingAnswerById,
  supabaseGetAllWritingAnswers,
  supabaseUpdateWritingAnswer,
} from "@/repositories/supabaseAnswers.store";

const HEX24 = /^[a-f0-9]{24}$/i;

export { writingAnswerDtoFromLeanDocument };

function writingDedupeKey(w: TWritingAnswerDto): string {
  if (w.practiceId) return `p:${w.userId}:${w.practiceId}`;
  const e = String(w.examId ?? "").trim().toLowerCase();
  return `e:${w.userId}:${e}:${String(w.partId ?? "")}:${w.attemptId ?? ""}`;
}

function writingDtoTimeMs(w: TWritingAnswerDto): number {
  const u = w.updatedAt ?? w.createdAt;
  return u instanceof Date ? u.getTime() : 0;
}

function mergeWritingPreferSupabase(
  legacy: TWritingAnswerDto[],
  fromSb: TWritingAnswerDto[]
): TWritingAnswerDto[] {
  const m = new Map<string, TWritingAnswerDto>();
  for (const x of legacy) m.set(writingDedupeKey(x), x);
  for (const x of fromSb) m.set(writingDedupeKey(x), x);
  return [...m.values()].sort((a, b) => writingDtoTimeMs(b) - writingDtoTimeMs(a));
}
function examIdAsObjectId(raw: unknown): ObjectId | null {
  if (raw instanceof ObjectId) return raw;
  if (typeof raw === "string" && HEX24.test(raw)) return new ObjectId(raw);
  return null;
}

export class WritingAndSpeakingAnswerRepository {
  private readonly db: Db;

  constructor(documentsClient: AppDocumentsClient) {
    this.db = documentsClient.db();
  }

  private getAnswerCollection() {
    return this.db.collection<TWritingAnswer>("answers");
  }

  private convertFromEntity(answerEntity: unknown) {
    return writingAnswerDtoFromLeanDocument(answerEntity as TWritingAnswer);
  }

  async findAnswer(id: string): Promise<TWritingAnswerDto | null> {
    if (shouldPersistAnswersInSupabase()) {
      const sb = await supabaseFindWritingAnswerById(id);
      if (sb) return sb;
    }
    const trimmed = id.trim();
    if (!HEX24.test(trimmed)) return null;
    const entity = await this.getAnswerCollection().findOne({ _id: new ObjectId(trimmed) });
    return entity ? this.convertFromEntity(entity) : null;
  }

  async findAnswersByPracticeIdsAndUser(
    practiceIds: string[],
    userId: string
  ): Promise<string[]> {
    const answers = await this.getAnswerCollection()
      .find({
        practiceId: { $in: practiceIds },
        userId: userId,
      })
      .project({ practiceId: 1 })
      .toArray();

    const uniqueAnswers = Array.from(
      new Map(answers.map(a => [a.practiceId, a])).values()
    );
    const legacy = uniqueAnswers
      .map((a) => String(a.practiceId ?? ""))
      .filter((id) => id.length > 0);
    if (shouldPersistAnswersInSupabase()) {
      const merged = new Set([
        ...legacy,
        ...(await supabaseFindPracticeIdsWithWritingAnswers(practiceIds, userId)),
      ]);
      return [...merged];
    }
    return legacy;
  }
  async createAnswer(dto: Omit<TWritingAnswerDto, "id">): Promise<TWritingAnswerDto> {
    if (shouldPersistAnswersInSupabase()) {
      return supabaseCreateOrUpdateWritingAnswer(dto);
    }
    const answer = WritingAnswerSchema.parse({
      ...dto,
      _id: new ObjectId(),
    });
    const { insertedId } = await this.getAnswerCollection().insertOne(answer);
    return this.convertFromEntity({ ...dto, _id: insertedId } as TWritingAnswer);
  }
  async createOrUpdateAnswer(dto: Omit<TWritingAnswerDto, "id">): Promise<TWritingAnswerDto> {
    if (shouldPersistAnswersInSupabase()) {
      return supabaseCreateOrUpdateWritingAnswer(dto);
    }
    const existing = await this.getAnswerCollection().findOne(
      dto.attemptId
        ? {
          attemptId: dto.attemptId,
          examId: dto.examId,
          partId: dto.partId,
          userId: dto.userId,
        }
        : dto.practiceId
          ? {
            practiceId: dto.practiceId,
            userId: dto.userId,
          }
          : {
            examId: dto.examId,
            partId: dto.partId,
            userId: dto.userId,
          }
    );

    if (existing) {
      // Update the existing answer
      const updated = await this.getAnswerCollection().findOneAndUpdate(
        { _id: existing._id },
        { $set: { ...dto } },
        { returnDocument: "after" }
      );
      if (!updated) {
        throw new Error("Failed to update the answer document.");
      }
      return this.convertFromEntity(updated);
    } else {
      // Create a new answer
      return this.createAnswer(dto);
    }
  }

  async getAllWritingAnswers(
    filter: Partial<TWritingAnswerDto>,
    page: number = 0,
    limit: number = 10
  ): Promise<{ items: TWritingAnswerDto[]; hasNextPage: boolean; page: number; totalPages: number; totalItems: number }> {
    const skip = page * limit;
    const sanitizedFilter = Object.fromEntries(
      Object.entries(filter).filter(([, value]) => value !== undefined)
    ) as Record<string, unknown>;

    const coll = this.getAnswerCollection();
    const userIdVal = typeof sanitizedFilter.userId === "string" ? sanitizedFilter.userId : null;
    const examOid = examIdAsObjectId(sanitizedFilter.examId);
    const typeVal = typeof sanitizedFilter.type === "string" ? sanitizedFilter.type : null;
    const keys = Object.keys(sanitizedFilter);
    if (
      userIdVal &&
      examOid &&
      typeVal &&
      keys.length === 3 &&
      keys.includes("examId") &&
      keys.includes("userId") &&
      keys.includes("type")
    ) {
      const q = { userId: userIdVal, examId: examOid, type: typeVal };
      const [totalItems, raw] = await Promise.all([
        coll.countDocuments(q),
        coll.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      ]);
      const legacyItems = raw.map((a) => this.convertFromEntity(a));
      if (shouldPersistAnswersInSupabase()) {
        const wsType = typeVal === "SPEAKING" ? "SPEAKING" : "WRITING";
        const sb: Awaited<ReturnType<typeof supabaseGetAllWritingAnswers>> =
          await supabaseGetAllWritingAnswers(
            {
              userId: userIdVal,
              examId: normalizeExamIdForStorage(String(sanitizedFilter.examId)),
              type: wsType,
            },
            0,
            20_000
          );
        const merged = mergeWritingPreferSupabase(legacyItems, sb.items);
        const totalMerged = merged.length;
        const slice = merged.slice(skip, skip + limit);
        const totalPages = limit > 0 ? Math.ceil(totalMerged / limit) : 0;
        return {
          items: slice,
          page,
          totalItems: totalMerged,
          totalPages,
          hasNextPage: skip + slice.length < totalMerged,
        };
      }
      const totalPages = limit > 0 ? Math.ceil(totalItems / limit) : 0;
      return {
        items: legacyItems,
        page,
        totalItems,
        totalPages,
        hasNextPage: skip + raw.length < totalItems,
      };
    }
    const matchFilter = {
      ...sanitizedFilter,
      ...(!("type" in sanitizedFilter)
        ? { type: { $in: ["WRITING", "SPEAKING"] } }
        : {}),
    };
    const aggregateFilter = [
      {
        $match: {
          ...matchFilter,
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },

      {
        $facet: {
          total: [
            {
              $count: "count",
            },
          ],
          data: [
            {
              $addFields: {
                _id: "$_id",
              },
            },
          ],
        },
      },
      {
        $unwind: "$total",
      },

      {
        $project: {
          items: {
            $slice: [
              "$data",
              skip,
              {
                $ifNull: [limit, "$total.count"],
              },
            ],
          },
          page: {
            $literal: skip / limit + 1,
          },
          hasNextPage: {
            $lt: [{ $multiply: [limit, Number(page)] }, "$total.count"],
          },
          totalPages: {
            $ceil: {
              $divide: ["$total.count", limit],
            },
          },
          totalItems: "$total.count",
        },
      },
    ];

    const results = await this.getAnswerCollection().aggregate(aggregateFilter).toArray();
    if (results.length == 0) {
      return {
        items: [],
        page: 0,
        totalItems: 0,
        totalPages: 0,
        hasNextPage: false,
      };
    }
    const row = results[0] as {
      items?: TWritingAnswer[];
      totalItems?: number;
      totalPages?: number;
      hasNextPage?: boolean;
    };
    const answers = row.items ?? [];
    const legacyItems = answers.map((answer) => this.convertFromEntity(answer));

    if (shouldPersistAnswersInSupabase()) {
      const sb = await supabaseGetAllWritingAnswers(
        sanitizedFilter as Partial<TWritingAnswerDto>,
        0,
        20_000
      );
      const merged = mergeWritingPreferSupabase(legacyItems, sb.items);
      const totalMerged = merged.length;
      const slice = merged.slice(skip, skip + limit);
      const totalPages = limit > 0 ? Math.ceil(totalMerged / limit) : 0;
      return {
        items: slice,
        page,
        totalItems: totalMerged,
        totalPages,
        hasNextPage: skip + slice.length < totalMerged,
      };
    }

    return {
      items: legacyItems,
      page,
      totalItems: row.totalItems ?? 0,
      totalPages: row.totalPages ?? 0,
      hasNextPage: row.hasNextPage ?? false,
    };
  }

  async updateAnswer(id: string, dto: Omit<Partial<TWritingAnswerDto>, "id">): Promise<TWritingAnswerDto | null> {
    if (shouldPersistAnswersInSupabase()) {
      const sb = await supabaseUpdateWritingAnswer(id, dto);
      if (sb) return sb;
    }
    const candidate = WritingAnswerSchema.partial().parse({ ...dto });

    const trimmed = id.trim();
    if (!HEX24.test(trimmed)) return null;
    const result = await this.getAnswerCollection().findOneAndUpdate(
      { _id: new ObjectId(trimmed) },
      { $set: candidate },
      { returnDocument: "after" }
    );
    return result ? this.convertFromEntity(result) : null;
  }

  async deleteAnswer(id: string): Promise<void> {
    if (shouldPersistAnswersInSupabase()) {
      await supabaseDeleteWritingAnswer(id);
    }
    const trimmed = id.trim();
    if (HEX24.test(trimmed)) {
      await this.getAnswerCollection().deleteOne({ _id: new ObjectId(trimmed) });
    }
  }}
