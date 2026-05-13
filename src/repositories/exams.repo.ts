import {
  ExamSchema,
  ExamSchemaDto,
  TExamSchema,
  TExamSchemaDto,
} from "@/models/exam.model";
import { ObjectId } from "bson";
import type { AppDocumentsClient, AppDocumentsDb as Db } from "@/lib/pg/types";

export class ExamRepository {
  private readonly db: Db;

  constructor(documentsClient: AppDocumentsClient) {
    this.db = documentsClient.db();
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
    const entityFilter: Record<string, unknown> = { ...filter };
    if ("id" in entityFilter && entityFilter.id != null) {
      entityFilter._id = new ObjectId(String(entityFilter.id));
      delete entityFilter.id;
    }

    const coll = this.getExamCollection();
    const [totalItems, rawItems] = await Promise.all([
      coll.countDocuments(entityFilter),
      coll.find(entityFilter).sort({ order: 1 }).skip(skip).limit(limit).toArray(),
    ]);

    const totalPages = limit > 0 ? Math.ceil(totalItems / limit) : 0;
    const hasNextPage = skip + rawItems.length < totalItems;

    return {
      items: (rawItems as TExamSchema[]).map((row) => this.convertFromEntity(row)),
      page,
      totalItems,
      totalPages,
      hasNextPage,
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
