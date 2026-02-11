import {
  ExamSchema,
  ExamSchemaDto,
  TExamSchema,
  TExamSchemaDto,
} from "@/models/exam.model";
import { MongoClient, Db, ObjectId } from "mongodb";

export class ExamRepository {
  private readonly db: Db;

  constructor(mongoClient: MongoClient) {
    this.db = mongoClient.db();
  }

  private getExamCollection() {
    return this.db.collection<TExamSchema>("exams");
  }

  private convertFromEntity(taskEntity: TExamSchema) {
    const task: TExamSchemaDto = {
      id: taskEntity._id.toHexString(),
      ...taskEntity,
    };
    return ExamSchemaDto.parse(task);
  }
  async findExamById(id: string): Promise<TExamSchemaDto | null> {
    const entity = await this.getExamCollection().findOne({
      _id: new ObjectId(id),
    });
    return entity ? this.convertFromEntity(entity) : null;
  }

  async createExam(dto: Omit<TExamSchemaDto, "id">): Promise<TExamSchemaDto> {
    const task = ExamSchema.parse({
      ...dto,
      _id: new ObjectId(),
    });
    const { insertedId } = await this.getExamCollection().insertOne(task);
    return this.convertFromEntity({ ...dto, _id: insertedId });
  }

  async getAllExam(
    filter: Partial<TExamSchemaDto>,
    page: number = 0,
    limit: number = 10
  ): Promise<{
    items: TExamSchemaDto[];
    hasNextPage: boolean;
    page: number;
    totalPages: number;
    totalItems: number;
  }> {
    const skip = page * limit;
    const aggregateFilter = [
      {
        $match: {
          ...filter,
        },
      },
      {
        $lookup: {
          from: "practices", // The practices collection
          localField: "_id", // The task ID in the tasks collection
          foreignField: "taskId", // The task ID in the practices collection
          as: "practices", // The resulting array of practices
        },
      },
      {
        $addFields: {
          practiceCount: { $size: "$practices" }, // Count the number of practices for each task
        },
      },
      {
        $sort: {
          order: 1,
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

    const results = await this.getExamCollection()
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
    const practices = results[0]?.items || [];

    return {
      items: practices.map((practice: TExamSchema) =>
        this.convertFromEntity(practice)
      ),
      page,
      totalItems: results[0].totalItems,
      totalPages: results[0].totalPages,
      hasNextPage: results[0].hasNextPage,
    };
  }

  //   async updateUser(id: string, dto: Omit<Partial<UserDTO>, "id">): Promise<UserDTO | null> {
  //     const candidate = userEntitySchema.partial().parse(dto);

  //     const { value } = await this.getUsersCollection().findOneAndUpdate(
  //       { _id: new ObjectId(id) },
  //       { $set: candidate },
  //       { returnDocument: "after" }
  //     );
  //     return value ? UserDTO.convertFromEntity(value) : null;
  //   }

  //   async deleteUser(id: string): Promise<void> {
  //     await this.getUsersCollection().deleteOne({ _id: new ObjectId(id) });
  //   }

  async updateExam(
    idOrFilter: string | { _id: ObjectId } | Partial<TExamSchemaDto>,
    dto: Omit<Partial<TExamSchemaDto>, "id">
  ): Promise<TExamSchemaDto | null> {
    // Normalize filter
    let filter: any = {};
    if (typeof idOrFilter === "string") {
      filter = { _id: new ObjectId(idOrFilter) };
    } else if ((idOrFilter as any)?._id instanceof ObjectId) {
      filter = { _id: (idOrFilter as any)._id };
    } else if ((idOrFilter as any)?.id) {
      filter = { _id: new ObjectId((idOrFilter as any).id) };
    } else {
      // Best-effort: map known keys from DTO filter to entity filter
      const f: any = {};
      if ((idOrFilter as any)?.name) f.name = (idOrFilter as any).name;
      filter = f;
    }

    // Build a safe $set from provided dto
    const candidate: Partial<TExamSchema> = {} as any;
    if (typeof dto.name === "string") (candidate as any).name = dto.name;
    if (typeof dto.order === "number") (candidate as any).order = dto.order;
    if (typeof (dto as any).isReady === "boolean")
      (candidate as any).isReady = (dto as any).isReady;
    if (dto.createdAt)
      (candidate as any).createdAt = new Date(dto.createdAt as any);

    if (Object.keys(candidate).length === 0) {
      // Nothing to update
      return this.findExamById((filter._id as ObjectId)?.toHexString?.() || "");
    }

    const value = await this.getExamCollection().findOneAndUpdate(
      filter,
      { $set: candidate },
      { returnDocument: "after" }
    );

    return value ? this.convertFromEntity(value as TExamSchema) : null;
  }

  async deleteExam(
    idOrFilter: string | { _id: ObjectId } | Partial<TExamSchemaDto>
  ) {
    // Normalize filter
    let filter: any = {};
    if (typeof idOrFilter === "string") {
      filter = { _id: new ObjectId(idOrFilter) };
    } else if ((idOrFilter as any)?._id instanceof ObjectId) {
      filter = { _id: (idOrFilter as any)._id };
    } else if ((idOrFilter as any)?.id) {
      filter = { _id: new ObjectId((idOrFilter as any).id) };
    } else {
      const f: any = {};
      if ((idOrFilter as any)?.name) f.name = (idOrFilter as any).name;
      filter = f;
    }

    return this.getExamCollection().deleteOne(filter);
  }
}
