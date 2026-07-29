import { TaskSchema, TaskSchemaDto, TTaskSchema, TTaskSchemaDto } from "@/models/tasks.model";
import { ObjectId } from "bson";
import type { AppDocumentsClient, AppDocumentsDb as Db } from "@/lib/pg/types";
import { getSql } from "@/lib/pg/pool";

export class TaskRepository {
  private readonly db: Db;

  constructor(documentsClient: AppDocumentsClient) {
    this.db = documentsClient.db();
  }

  private getTaskCollection() {
    return this.db.collection<TTaskSchema>("tasks");
  }

  private convertFromEntity(taskEntity: TTaskSchema & { practiceCount?: number }) {
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
    const matchFilter = { ...filter } as Record<string, unknown>;
    delete matchFilter.id;

    const totalItems = await this.getTaskCollection().countDocuments(matchFilter);
    const totalPages = limit > 0 ? Math.ceil(totalItems / limit) : 0;
    const entities = (await this.getTaskCollection()
      .find(matchFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()) as TTaskSchema[];

    const taskIds = entities
      .map((t) => (t._id instanceof ObjectId ? t._id.toHexString() : String(t._id)))
      .map((id) => id.toLowerCase());

    const counts = new Map<string, number>();
    if (taskIds.length > 0) {
      try {
        const sql = getSql();
        const rows = await sql<{ task_mongo_id: string; c: number }[]>`
          SELECT lower(task_mongo_id) AS task_mongo_id, COUNT(*)::int AS c
          FROM public.practices
          WHERE lower(task_mongo_id) = ANY(${taskIds})
          GROUP BY lower(task_mongo_id)
        `;
        for (const r of rows) {
          counts.set(r.task_mongo_id, r.c);
        }
      } catch (e) {
        console.warn("[tasks.repo] practice count from public.practices failed", e);
      }
    }

    const items = entities.map((entity) => {
      const id =
        entity._id instanceof ObjectId
          ? entity._id.toHexString().toLowerCase()
          : String(entity._id).toLowerCase();
      return this.convertFromEntity({
        ...entity,
        practiceCount: counts.get(id) ?? 0,
      });
    });

    return {
      items,
      page,
      totalItems,
      totalPages,
      hasNextPage: (page + 1) * limit < totalItems,
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
