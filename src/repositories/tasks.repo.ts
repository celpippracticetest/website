import { TaskSchema, TaskSchemaDto, TTaskSchema, TTaskSchemaDto } from "@/models/tasks.model";
import { ObjectId } from "bson";
import type { AppDocumentsClient, AppDocumentsDb as Db } from "@/lib/pg/types";
import { countPracticesByTaskIds } from "@/repositories/practice.repo";

export class TaskRepository {
  private readonly db: Db;

  constructor(documentsClient: AppDocumentsClient) {
    this.db = documentsClient.db();
  }

  private getTaskCollection() {
    return this.db.collection<TTaskSchema>("tasks");
  }

  private convertFromEntity(taskEntity: TTaskSchema) {
    const { _id, ...rest } = taskEntity;
    return TaskSchemaDto.parse({
      id: _id.toHexString(),
      ...rest,
    });
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
    const items = practices.map((practice: TTaskSchema) => this.convertFromEntity(practice));
    const practiceCounts = await countPracticesByTaskIds(items.map((task) => task.id));

    return {
      items: items.map((task) => ({
        ...task,
        practiceCount: practiceCounts[task.id.toLowerCase()] ?? 0,
      })),
      page,
      totalItems: results[0].totalItems,
      totalPages: results[0].totalPages,
      hasNextPage: results[0].hasNextPage,
    };
  }

  async updateTask(id: string, dto: Partial<TTaskSchemaDto>): Promise<TTaskSchemaDto | null> {
    const { id: _id, ...updateData } = dto;

    const result = await this.getTaskCollection().findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: "after" }
    );

    return result ? this.convertFromEntity(result as unknown as TTaskSchema) : null;
  }

  async deleteTask(id: string): Promise<void> {
    await this.getTaskCollection().deleteOne({ _id: new ObjectId(id) });
  }
}
