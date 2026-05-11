import {
  ListeningAndReadingAnswer,
  ListeningAndReadingAnswerDto,
  TListeningAndReadingAnswer,
  TListeningAndReadingAnswerDto,
} from "@/models/answer";
import { ObjectId } from "bson";
import type { CompatMongoClient as MongoClient, CompatDb as Db } from "@/lib/pg/types";

const HEX24 = /^[a-f0-9]{24}$/i;

/** Stringify ObjectId-like values for DTOs (PG layer may revive `taskId` as `ObjectId` via `rowToDocument`). */
function mongoIdLikeToHex(value: unknown): string | null {
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
  const hex = mongoIdLikeToHex(value);
  if (hex) return hex;
  if (typeof value === "string" && value.length > 0) return value;
  return undefined;
}

export class ListeningAndReadingAnswerRepository {
  private readonly db: Db;

  constructor(mongoClient: MongoClient) {
    this.db = mongoClient.db();
  }

  private getAnswerCollection() {
    return this.db.collection<TListeningAndReadingAnswer>("answers");
  }

  private convertFromEntity(
    answerEntity: TListeningAndReadingAnswer
  ): TListeningAndReadingAnswerDto {
    const answer: TListeningAndReadingAnswerDto = {
      id: answerEntity._id.toHexString(),
      ...answerEntity,
      taskId: optionalIdString(answerEntity.taskId as unknown),
      examId: optionalIdString(answerEntity.examId as unknown),
      practiceId: optionalIdString(answerEntity.practiceId as unknown),
    };
    return ListeningAndReadingAnswerDto.parse(answer);
  }

  async findAnswerByPracticeAndUser(
    practiceId: string,
    userId: string
  ): Promise<TListeningAndReadingAnswerDto | null> {
    const entity = await this.getAnswerCollection().findOne({
      practiceId,
      userId,
    });
    return entity ? this.convertFromEntity(entity) : null;
  }

  async findAnswer(id: string): Promise<TListeningAndReadingAnswerDto | null> {
    const entity = await this.getAnswerCollection().findOne({
      _id: new ObjectId(id),
    });
    return entity ? this.convertFromEntity(entity) : null;
  }

  async findAllTaskIdsByTaskAndUser(
    taskId: string,
    userId: string
  ): Promise<string[]> {
    const wantHex = mongoIdLikeToHex(taskId);
    const answers = await this.getAnswerCollection()
      .find({ userId })
      .project({ practiceId: 1, taskId: 1 })
      .toArray();
    return answers
      .filter((a) => {
        if (!wantHex) return false;
        return mongoIdLikeToHex(a.taskId as unknown) === wantHex;
      })
      .map((a) => String(a.practiceId));
  }

  async createOrUpdateAnswer(
    dto: Omit<TListeningAndReadingAnswerDto, "id">
  ): Promise<TListeningAndReadingAnswerDto> {
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
  }> {
    const skip = page * limit;
    const sanitizedFilter = Object.fromEntries(
      Object.entries(filter).filter(([, value]) => value !== undefined)
    );
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
    const answers = results[0]?.items || [];

    return {
      items: answers.map((answer: TListeningAndReadingAnswer) =>
        this.convertFromEntity(answer)
      ),
      page,
      totalItems: results[0].totalItems,
      totalPages: results[0].totalPages,
      hasNextPage: results[0].hasNextPage,
    };
  }

  async findAnswersByExamIdAndUser(examId: string, userId: string) {
    const rawAnswers = await this.getAnswerCollection()
      .find({ examId, userId, answers: { $ne: {} } })
      .toArray();

    return rawAnswers.map((ans) => ({
      ...ans,
      _id: ans._id.toHexString(),
      createdAt:
        ans.createdAt instanceof Date
          ? ans.createdAt.toISOString()
          : ans.createdAt,
      updatedAt:
        ans.updatedAt instanceof Date
          ? ans.updatedAt.toISOString()
          : ans.updatedAt,
    }));
  }

  async updateAnswer(
    id: string,
    dto: Omit<Partial<TListeningAndReadingAnswerDto>, "id">
  ): Promise<TListeningAndReadingAnswerDto | null> {
    const candidate = ListeningAndReadingAnswerDto.partial().parse({ ...dto });

    const result = await this.getAnswerCollection().findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: candidate },
      { returnDocument: "after" }
    );
    return result ? this.convertFromEntity(result) : null;
  }

  async deleteAnswer(id: string): Promise<void> {
    await this.getAnswerCollection().deleteOne({ _id: new ObjectId(id) });
  }
}
