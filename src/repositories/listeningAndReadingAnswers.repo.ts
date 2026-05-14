import {
  ListeningAndReadingAnswer,
  ListeningAndReadingAnswerDto,
  TListeningAndReadingAnswer,
  TListeningAndReadingAnswerDto,
  TWritingAnswerDto,
} from "@/models/answer";
import { ObjectId } from "bson";
import type { AppDocumentsClient, AppDocumentsDb as Db } from "@/lib/pg/types";
import { shouldUseSupabaseForPracticeAnswers } from "@/lib/auth/should-use-supabase-practice-answers";
import {
  supabaseCreateOrUpdateAnswer,
  supabaseDeleteAnswer,
  supabaseFindAllTaskIdsByTaskAndUser,
  supabaseFindAnswerById,
  supabaseFindAnswerByPracticeAndUser,
  supabaseFindAnswersByExamIdAndUser,
  supabaseGetAllListeningAndReadingAnswers,
  supabaseGetPartitionedMockExamProgressAnswers,
  supabaseUpdateAnswer,
} from "@/repositories/supabaseUserPracticeAnswers.store";
import { writingAnswerDtoFromLeanDocument } from "@/repositories/writingAndSpeakingAnswers.repo";

const HEX24 = /^[a-f0-9]{24}$/i;

/** Stringify ObjectId-like values for DTOs (PG layer may revive `taskId` as `ObjectId` via `rowToDocument`). */
function objectIdHexFromComparable(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") {
    return HEX24.test(value) ? value.toLowerCase() : null;
  }
  if (value instanceof ObjectId) return value.toHexString().toLowerCase();
  if (typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    if (typeof obj.$oid === "string" && HEX24.test(obj.$oid)) {
      return obj.$oid.toLowerCase();
    }
    if (typeof (obj as { toHexString?: unknown }).toHexString === "function") {
      try {
        const hex = (obj as { toHexString: () => string }).toHexString();
        if (typeof hex === "string" && HEX24.test(hex)) return hex.toLowerCase();
      } catch {
        // fall through
      }
    }
    if (obj._bsontype === "ObjectId" && obj.id) {
      const id = obj.id as Uint8Array | Buffer;
      const buf = id instanceof Uint8Array ? Buffer.from(id) : Buffer.isBuffer(id) ? id : null;
      if (buf && buf.length === 12) return buf.toString("hex").toLowerCase();
    }
  }
  return null;
}

function optionalIdString(value: unknown): string | undefined {
  const hex = objectIdHexFromComparable(value);
  if (hex) return hex;
  if (typeof value === "string" && value.length > 0) return value;
  return undefined;
}

function listeningAnswerDtoFromLeanDocument(
  doc: unknown
): TListeningAndReadingAnswerDto {
  const row = doc as TListeningAndReadingAnswer;
  const answer: TListeningAndReadingAnswerDto = {
    ...row,
    id: row._id.toHexString(),
    answers: row.answers ?? {},
    taskId: optionalIdString(row.taskId as unknown),
    examId: optionalIdString(row.examId as unknown),
    practiceId: optionalIdString(row.practiceId as unknown),
  };
  return ListeningAndReadingAnswerDto.parse(answer);
}

export class ListeningAndReadingAnswerRepository {
  private readonly db: Db;

  constructor(documentsClient: AppDocumentsClient) {
    this.db = documentsClient.db();
  }

  private getAnswerCollection() {
    return this.db.collection<TListeningAndReadingAnswer>("answers");
  }

  private convertFromEntity(
    answerEntity: TListeningAndReadingAnswer
  ): TListeningAndReadingAnswerDto {
    return listeningAnswerDtoFromLeanDocument(answerEntity);
  }

  /**
   * One DB round-trip for mock-exam progress: L/R + W/S answers for these exams only,
   * with a tight projection (avoids two full scans + large payloads).
   */
  async getPartitionedMockExamProgressAnswers(
    userId: string,
    examIds: string[]
  ): Promise<{
    listeningAndReading: TListeningAndReadingAnswerDto[];
    writingAndSpeaking: TWritingAnswerDto[];
    fetchedCount: number;
  }> {
    if (examIds.length === 0) {
      return { listeningAndReading: [], writingAndSpeaking: [], fetchedCount: 0 };
    }
    const examIdMatch: (ObjectId | string)[] = [];
    for (const id of examIds) {
      if (!HEX24.test(id)) continue;
      const h = id.toLowerCase();
      examIdMatch.push(new ObjectId(h));
      examIdMatch.push(h);
    }
    if (examIdMatch.length === 0) {
      return { listeningAndReading: [], writingAndSpeaking: [], fetchedCount: 0 };
    }

    if (shouldUseSupabaseForPracticeAnswers(userId)) {
      const projection = {
        _id: 1,
        userId: 1,
        type: 1,
        examId: 1,
        partId: 1,
        attemptId: 1,
        answers: 1,
        text: 1,
        audioUrl: 1,
        overalScore: 1,
        result: 1,
      } as const;

      return supabaseGetPartitionedMockExamProgressAnswers(
        userId,
        examIds,
        async () =>
          this.getAnswerCollection()
            .find(
              {
                userId,
                examId: { $in: examIdMatch },
                type: { $in: ["WRITING", "SPEAKING"] },
              },
              { projection }
            )
            .toArray()
      );
    }

    const projection = {
      _id: 1,
      userId: 1,
      type: 1,
      examId: 1,
      partId: 1,
      attemptId: 1,
      answers: 1,
      text: 1,
      audioUrl: 1,
      overalScore: 1,
      result: 1,
    } as const;

    const raw = await this.getAnswerCollection()
      .find({ userId, examId: { $in: examIdMatch } }, { projection })
      .toArray();

    const listeningAndReading: TListeningAndReadingAnswerDto[] = [];
    const writingAndSpeaking: TWritingAnswerDto[] = [];

    for (const doc of raw) {
      const type = String((doc as { type?: string }).type ?? "").toUpperCase();
      if (type === "WRITING" || type === "SPEAKING") {
        try {
          writingAndSpeaking.push(writingAnswerDtoFromLeanDocument(doc));
        } catch {
          /* skip malformed row */
        }
      } else {
        try {
          listeningAndReading.push(listeningAnswerDtoFromLeanDocument(doc));
        } catch {
          /* skip malformed row */
        }
      }
    }

    return {
      listeningAndReading,
      writingAndSpeaking,
      fetchedCount: raw.length,
    };
  }

  async findAnswerByPracticeAndUser(
    practiceId: string,
    userId: string
  ): Promise<TListeningAndReadingAnswerDto | null> {
    if (shouldUseSupabaseForPracticeAnswers(userId)) {
      return supabaseFindAnswerByPracticeAndUser(practiceId, userId);
    }
    const entity = await this.getAnswerCollection().findOne({
      practiceId,
      userId,
    });
    return entity ? this.convertFromEntity(entity as TListeningAndReadingAnswer) : null;
  }

  async findAnswer(id: string): Promise<TListeningAndReadingAnswerDto | null> {
    const fromSb = await supabaseFindAnswerById(id);
    if (fromSb) return fromSb;
    const entity = await this.getAnswerCollection().findOne({
      _id: new ObjectId(id),
    });
    return entity ? this.convertFromEntity(entity as TListeningAndReadingAnswer) : null;
  }

  async findAllTaskIdsByTaskAndUser(
    taskId: string,
    userId: string
  ): Promise<string[]> {
    if (shouldUseSupabaseForPracticeAnswers(userId)) {
      return supabaseFindAllTaskIdsByTaskAndUser(taskId, userId);
    }
    const wantHex = objectIdHexFromComparable(taskId);
    const answers = await this.getAnswerCollection()
      .find({ userId })
      .project({ practiceId: 1, taskId: 1 })
      .toArray();
    return answers
      .filter((a) => {
        if (!wantHex) return false;
        return objectIdHexFromComparable(a.taskId as unknown) === wantHex;
      })
      .map((a) => String(a.practiceId));
  }

  async createOrUpdateAnswer(
    dto: Omit<TListeningAndReadingAnswerDto, "id">
  ): Promise<TListeningAndReadingAnswerDto> {
    if (shouldUseSupabaseForPracticeAnswers(dto.userId)) {
      return supabaseCreateOrUpdateAnswer(dto);
    }
    // Check if an answer exists for the given practiceId and userId
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
      const answer: TListeningAndReadingAnswer =
        ListeningAndReadingAnswer.parse({
          ...dto,
          _id: new ObjectId(),
        });
      await this.getAnswerCollection().insertOne(answer);
      return this.convertFromEntity(answer);
    }
  }

  async getAllListeningAndReadingAnswers(
    filter: Partial<TListeningAndReadingAnswerDto>,
    page: number = 0,
    limit: number = 100
  ): Promise<{
    items: TListeningAndReadingAnswerDto[];
    hasNextPage: boolean;
    page: number;
    totalPages: number;
    totalItems: number;
  }  > {
    const skip = page * limit;
    const sanitizedFilter = Object.fromEntries(
      Object.entries(filter).filter(([, value]) => value !== undefined)
    ) as Record<string, unknown>;

    const coll = this.getAnswerCollection();
    const examHex = objectIdHexFromComparable(sanitizedFilter.examId);
    const userIdStr = typeof sanitizedFilter.userId === "string" ? sanitizedFilter.userId : null;
    const keys = Object.keys(sanitizedFilter);
    if (examHex && userIdStr && keys.length === 2 && keys.includes("examId") && keys.includes("userId")) {
      if (shouldUseSupabaseForPracticeAnswers(userIdStr)) {
        return supabaseGetAllListeningAndReadingAnswers(
          userIdStr,
          String(sanitizedFilter.examId),
          page,
          limit
        );
      }
      const rows = await coll
        .find({ examId: new ObjectId(examHex), userId: userIdStr })
        .sort({ createdAt: -1 })
        .toArray();
      const filtered = rows.filter(
        (a) => a && !["SPEAKING", "WRITING"].includes(String((a as { type?: string }).type ?? ""))
      );
      const totalItems = filtered.length;
      const slice = filtered.slice(skip, skip + limit);
      const totalPages = limit > 0 ? Math.ceil(totalItems / limit) : 0;
      return {
        items: slice.map((a) => this.convertFromEntity(a as TListeningAndReadingAnswer)),
        page,
        totalItems,
        totalPages,
        hasNextPage: skip + slice.length < totalItems,
      };
    }

    const aggregateFilter = [
      {
        $match: {
          ...sanitizedFilter,
          type: { $nin: ["SPEAKING", "WRITING"] },
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

    const results = await this.getAnswerCollection()
      .aggregate(aggregateFilter)
      .toArray();
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
      items?: TListeningAndReadingAnswer[];
      totalItems?: number;
      totalPages?: number;
      hasNextPage?: boolean;
    };
    const answers = row.items ?? [];

    return {
      items: answers.map((answer: TListeningAndReadingAnswer) =>
        this.convertFromEntity(answer)
      ),
      page,
      totalItems: row.totalItems ?? 0,
      totalPages: row.totalPages ?? 0,
      hasNextPage: row.hasNextPage ?? false,
    };
  }

  async findAnswersByExamIdAndUser(examId: string, userId: string) {
    if (shouldUseSupabaseForPracticeAnswers(userId)) {
      return supabaseFindAnswersByExamIdAndUser(examId, userId);
    }
    const rawAnswers = await this.getAnswerCollection()
      .find({ examId, userId, answers: { $ne: {} } })
      .toArray();

    return rawAnswers.map((ans) => {
      const idVal = ans._id;
      const idStr =
        idVal instanceof ObjectId
          ? idVal.toHexString()
          : idVal != null
            ? String(idVal)
            : "";
      return {
        ...ans,
        _id: idStr,
        createdAt:
          ans.createdAt instanceof Date
            ? ans.createdAt.toISOString()
            : ans.createdAt,
        updatedAt:
          ans.updatedAt instanceof Date
            ? ans.updatedAt.toISOString()
            : ans.updatedAt,
      };
    });
  }

  async updateAnswer(
    id: string,
    dto: Omit<Partial<TListeningAndReadingAnswerDto>, "id">
  ): Promise<TListeningAndReadingAnswerDto | null> {
    const fromSb = await supabaseUpdateAnswer(id, dto);
    if (fromSb) return fromSb;
    const candidate = ListeningAndReadingAnswerDto.partial().parse({ ...dto });

    const result = await this.getAnswerCollection().findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: candidate },
      { returnDocument: "after" }
    );
    return result ? this.convertFromEntity(result) : null;
  }

  async deleteAnswer(id: string): Promise<void> {
    await supabaseDeleteAnswer(id);
    const trimmed = id.trim();
    if (HEX24.test(trimmed)) {
      await this.getAnswerCollection().deleteOne({ _id: new ObjectId(trimmed) });
    }
  }
}
