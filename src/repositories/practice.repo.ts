import { PracticeDtoSchema, PracticeSchema, TPracticeDto, TPracticeSchema } from "@/models/practice.model";
import { MongoClient, Db, ObjectId } from "mongodb";

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
    );
    const aggregateFilter = [
      {
        $match: {
          ...sanitizedFilter,
        },
      },
      {
        $sort: {
          isFree: -1,
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

    const results = await this.getPracticeCollection().aggregate(aggregateFilter).toArray();
    if (results.length == 0) {
      return {
        items: [],
        page: 0,
        totalItems: 0,
        totalPages: 0,
        hasNextPage: false,
      };
    }
    const practices = results[0]?.items || [];

    return {
      items: practices.map((practice: TPracticeSchema) => this.convertFromEntity(practice)),
      page,
      totalItems: results[0].totalItems,
      totalPages: results[0].totalPages,
      hasNextPage: results[0].hasNextPage,
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
