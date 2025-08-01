import {
  ListeningAndReadingAnswer,
  ListeningAndReadingAnswerDto,
  TListeningAndReadingAnswer,
  TListeningAndReadingAnswerDto,
} from "@/models/answer";
import { MongoClient, Db, ObjectId } from "mongodb";

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
    const answers = await this.getAnswerCollection()
      .find({ taskId, userId })
      .project({ practiceId: 1 })
      .toArray();
    return answers.map((a) => a.practiceId);
  }

  async createOrUpdateAnswer(
    dto: Omit<TListeningAndReadingAnswerDto, "id">
  ): Promise<TListeningAndReadingAnswerDto> {
    // Check if an answer exists for the given practiceId and userId
    const existing = await this.getAnswerCollection().findOne(
      dto.practiceId
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
