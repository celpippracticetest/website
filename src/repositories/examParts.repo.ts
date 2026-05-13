import { ExamPartSchema, ExamPartSchemaDto, TExamPartSchema, TExamPartSchemaDto } from "@/models/examParts.model";
import { ObjectId } from "bson";
import type { AppDocumentsClient, AppDocumentsDb as Db } from "@/lib/pg/types";
import { objectIdLikeToHex } from "@/lib/pg/document";

const OID24 = /^[a-f0-9]{24}$/i;

function examIdHexFromUnknown(value: unknown): string | null {
  return objectIdLikeToHex(value);
}

export class ExamPartsRepository {
  private readonly db: Db;

  constructor(documentsClient: AppDocumentsClient) {
    this.db = documentsClient.db();
  }

  private getExamPartsCollection() {
    return this.db.collection<TExamPartSchema>("exam-parts");
  }

  private convertFromEntity(taskEntity: TExamPartSchema) {
    const task: TExamPartSchemaDto = {
      id: taskEntity._id.toHexString(),
      ...taskEntity,
      examId: taskEntity.examId.toString(),
    };
    return ExamPartSchemaDto.parse(task);
  }
  async findExamPartByExamIdAndPartId(examId: string, partId: number): Promise<TExamPartSchemaDto | null> {
    const wantExamHex =
      examIdHexFromUnknown(examId) ?? (OID24.test(examId) ? examId.toLowerCase() : null);
    if (wantExamHex == null || !Number.isFinite(partId)) {
      return null;
    }
    const entity = await this.getExamPartsCollection().findOne({
      partId,
      examId: new ObjectId(wantExamHex),
    });
    return entity ? this.convertFromEntity(entity as TExamPartSchema) : null;
  }

  async findById(id: string): Promise<TExamPartSchemaDto | null> {
    const entity = await this.getExamPartsCollection().findOne({ _id: new ObjectId(id) });
    return entity ? this.convertFromEntity(entity) : null;
  }

  async deletePractice(id: string): Promise<void> {
    await this.getExamPartsCollection().deleteOne({ _id: new ObjectId(id) });
  }


  async updateExam(id: string, dto: Omit<Partial<TExamPartSchemaDto>, "id">): Promise<TExamPartSchemaDto | null> {
    const candidate = ExamPartSchema.partial().parse({...dto, examId: new ObjectId(dto.examId ?? "")});

    const result = await this.getExamPartsCollection().findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: candidate },
      { returnDocument: "after" }
    );
    return result ? this.convertFromEntity(result) : null;
  }

  async createExamPart(dto: Omit<TExamPartSchemaDto, "id">): Promise<TExamPartSchemaDto> {
    const task = ExamPartSchema.parse({
      ...dto,
      examId: new ObjectId(dto.examId.toString()),
      _id: new ObjectId(),
    });
    const { insertedId } = await this.getExamPartsCollection().insertOne(task);
    return this.convertFromEntity({ ...dto, _id: insertedId, examId: task.examId });
  }

  async getAllExamPart(
    filter: Partial<TExamPartSchema>,
    page: number = 0,
    limit: number = 21
  ): Promise<{
    items: TExamPartSchemaDto[];
    hasNextPage: boolean;
    page: number;
    totalPages: number;
    totalItems: number;
  }> {
    const skip = page * limit;
    const filterRecord = filter as Record<string, unknown>;
    const examIdRaw = filterRecord.examId;
    const wantExamHex =
      examIdRaw !== undefined && examIdRaw !== null
        ? examIdHexFromUnknown(examIdRaw) ??
          (typeof examIdRaw === "string" && OID24.test(examIdRaw)
            ? examIdRaw.toLowerCase()
            : null)
        : null;

    const rest = { ...filterRecord } as Record<string, unknown>;
    delete rest.examId;

    const coll = this.getExamPartsCollection();

    if (wantExamHex !== null) {
      const baseFilter = Object.fromEntries(
        Object.entries(rest).filter(([, v]) => v !== undefined)
      ) as Record<string, unknown>;
      const combined: Record<string, unknown> = {
        ...baseFilter,
        examId: new ObjectId(wantExamHex),
      };
      const [totalItems, raw] = await Promise.all([
        coll.countDocuments(combined),
        coll.find(combined).sort({ partId: 1 }).skip(skip).limit(limit).toArray(),
      ]);
      const totalPages = limit > 0 ? Math.ceil(totalItems / limit) : 0;
      return {
        items: (raw as TExamPartSchema[]).map((p) => this.convertFromEntity(p)),
        page,
        totalItems,
        totalPages,
        hasNextPage: skip + raw.length < totalItems,
      };
    }

    const totalItems = await coll.countDocuments(filterRecord);
    const raw = await coll.find(filterRecord).sort({ partId: 1 }).skip(skip).limit(limit).toArray();
    const totalPages = limit > 0 ? Math.ceil(totalItems / limit) : 0;
    return {
      items: (raw as TExamPartSchema[]).map((p) => this.convertFromEntity(p)),
      page,
      totalItems,
      totalPages,
      hasNextPage: skip + raw.length < totalItems,
    };
  }

  /** Part counts per exam only for the given exam ids (avoids loading every part document). */
  async countPartsByExamIds(examIds: string[]): Promise<Record<string, number>> {
    if (examIds.length === 0) {
      return {};
    }
    const oidList = examIds
      .filter((id) => OID24.test(id))
      .map((id) => new ObjectId(id.toLowerCase()));
    if (oidList.length === 0) {
      return {};
    }
    const coll = this.getExamPartsCollection();
    const rows = (await coll
      .aggregate([
        { $match: { examId: { $in: oidList } } },
        { $group: { _id: "$examId", count: { $sum: 1 } } },
      ])
      .toArray()) as { _id: ObjectId; count: number }[];
    const out: Record<string, number> = {};
    for (const row of rows) {
      out[row._id.toHexString()] = row.count;
    }
    return out;
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
