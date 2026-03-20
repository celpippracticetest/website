import { TWritingAnswer, TWritingAnswerDto, WritingAnswerDto, WritingAnswerSchema } from "@/models/answer";
import { MongoClient, Db, ObjectId } from "mongodb";

export class WritingAndSpeakingAnswerRepository {
  private readonly db: Db;

  constructor(mongoClient: MongoClient) {
    this.db = mongoClient.db();
  }

  private getAnswerCollection() {
    return this.db.collection<TWritingAnswer>("answers");
  }

  private convertFromEntity(answerEntity: TWritingAnswer) {
    const answer: TWritingAnswerDto = {
      id: answerEntity._id.toHexString(),
      ...answerEntity,
    };
    return WritingAnswerDto.parse(answer);
  }
  async findAnswer(id: string): Promise<TWritingAnswerDto | null> {
    const entity = await this.getAnswerCollection().findOne({ _id: new ObjectId(id) });
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
    return uniqueAnswers.map(a => a.practiceId);
  }
  async createAnswer(dto: Omit<TWritingAnswerDto, "id">): Promise<TWritingAnswerDto> {
    const answer = WritingAnswerSchema.parse({
      ...dto,
      _id: new ObjectId(),
    });
    const { insertedId } = await this.getAnswerCollection().insertOne(answer);
    return this.convertFromEntity({ ...dto, _id: insertedId });
  }
  async createOrUpdateAnswer(dto: Omit<TWritingAnswerDto, "id">): Promise<TWritingAnswerDto> {
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
    );
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
    const answers = results[0]?.items || [];

    return {
      items: answers.map((answer: TWritingAnswer) => this.convertFromEntity(answer)),
      page,
      totalItems: results[0].totalItems,
      totalPages: results[0].totalPages,
      hasNextPage: results[0].hasNextPage,
    };
  }

  async updateAnswer(id: string, dto: Omit<Partial<TWritingAnswerDto>, "id">): Promise<TWritingAnswerDto | null> {
    const candidate = WritingAnswerSchema.partial().parse({ ...dto });

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
