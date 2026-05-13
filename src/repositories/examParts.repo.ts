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
    // Narrow by partId first (SQL fast path when only one filter key), then match examId by
    // hex so Turbopack / PG deserialization never breaks on `ObjectId` constructor identity.
    const candidates = await this.getExamPartsCollection()
      .find({ partId })
      .toArray();
    const entity = candidates.find(
      (d) =>
        d != null &&
        examIdHexFromUnknown((d as unknown as { examId?: unknown }).examId) === wantExamHex
    ) as TExamPartSchema | undefined;
    return entity ? this.convertFromEntity(entity) : null;
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

    if (wantExamHex !== null) {
      const coll = this.getExamPartsCollection();
      const baseFilter = Object.fromEntries(
        Object.entries(rest).filter(([, v]) => v !== undefined)
      ) as Record<string, unknown>;
      const candidates = await coll.find(baseFilter).sort({ partId: 1 }).toArray();
      const matched = candidates.filter(
        (d) =>
          d != null &&
          examIdHexFromUnknown((d as unknown as { examId?: unknown }).examId) === wantExamHex
      ) as TExamPartSchema[];
      const totalItems = matched.length;
      const slice = matched.slice(skip, skip + limit);
      const totalPages = limit > 0 ? Math.ceil(totalItems / limit) : 0;
      return {
        items: slice.map((p) => this.convertFromEntity(p)),
        page,
        totalItems,
        totalPages,
        hasNextPage: skip + limit < totalItems,
      };
    }

    const aggregateFilter = [
      {
        $match: {
          ...filter,
        },
      },
      {
        $sort: {
          partId: 1,
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

    const results = await this.getExamPartsCollection().aggregate(aggregateFilter).toArray();

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
      items: practices.map((practice: TExamPartSchema) => this.convertFromEntity(practice)),
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
