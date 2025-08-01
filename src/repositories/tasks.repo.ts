import { TaskSchema, TaskSchemaDto, TTaskSchema, TTaskSchemaDto } from "@/models/tasks.model";
import { MongoClient, Db, ObjectId } from "mongodb";

export class TaskRepository {
  private readonly db: Db;

  constructor(mongoClient: MongoClient) {
    this.db = mongoClient.db();
  }

  private getTaskCollection() {
    return this.db.collection<TTaskSchema>("tasks");
  }

  private convertFromEntity(taskEntity: TTaskSchema) {
    const task: TTaskSchemaDto = {
      id: taskEntity._id.toHexString(),
      ...taskEntity,
    };
    return TaskSchemaDto.parse(task);
  }
    async findTaskById(id: string): Promise<TTaskSchemaDto | null> {
      const entity = await this.getTaskCollection().findOne({ _id: new ObjectId(id) });
      return entity ? this.convertFromEntity(entity) : null;
    }

  async createTask(dto: Omit<TTaskSchemaDto, "id">): Promise<TTaskSchemaDto> {
    const task = TaskSchema.parse({
      ...dto,
      _id: new ObjectId(),
    });
    const { insertedId } = await this.getTaskCollection().insertOne(task);
    return this.convertFromEntity({ ...dto, _id: insertedId });
  }

  async getAllTask(
    filter: Partial<TTaskSchemaDto>,
    page: number = 0,
    limit: number = 10
  ): Promise<{ items: TTaskSchemaDto[]; hasNextPage: boolean; page: number; totalPages: number; totalItems: number }> {
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

    const results = await this.getTaskCollection().aggregate(aggregateFilter).toArray();
    
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
      items: practices.map((practice: TTaskSchema) => this.convertFromEntity(practice)),
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
}
