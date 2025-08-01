import { ExamPartSchema, ExamPartSchemaDto, TExamPartSchema, TExamPartSchemaDto } from "@/models/examParts.model";
import { MongoClient, Db, ObjectId } from "mongodb";

export class ExamPartsRepository {
  private readonly db: Db;

  constructor(mongoClient: MongoClient) {
    this.db = mongoClient.db();
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
    const entity = await this.getExamPartsCollection().findOne({ examId: new ObjectId(examId), partId });
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
