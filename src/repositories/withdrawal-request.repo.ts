import {
  TWithdrawalRequestSchema,
  TWithdrawalRequestSchemaDto,
  WithdrawalRequestSchema,
  WithdrawalRequestSchemaDto,
} from "@/models/withdrawal-request.model";
import { MongoClient, Db, ObjectId } from "mongodb";

export class WithdrawalRequestRepository {
  private readonly db: Db;

  constructor(mongoClient: MongoClient) {
    this.db = mongoClient.db();
  }

  private getWithdrawalRequestCollection() {
    return this.db.collection<TWithdrawalRequestSchema>("withdrawalRequests");
  }

  private convertFromEntity(
    withdrawalEntity: TWithdrawalRequestSchema
  ): TWithdrawalRequestSchemaDto {
    const withdrawal: TWithdrawalRequestSchemaDto = {
      id: withdrawalEntity._id.toHexString(),
      ...withdrawalEntity,
    };
    return WithdrawalRequestSchemaDto.parse(withdrawal);
  }

  async ensureIndexes() {
    const collection = this.getWithdrawalRequestCollection();
    await collection.createIndex({ userId: 1 });
    await collection.createIndex({ status: 1 });
    await collection.createIndex({ createdAt: 1 });
    await collection.createIndex({ paypalEmail: 1 });
  }

  async createWithdrawalRequest(withdrawal: {
    userId: string;
    amount: number;
    paypalEmail: string;
    status: "pending" | "approved" | "paid" | "rejected";
    userEmail: string;
    referralStats: {
      totalInvitees: number;
      totalReward: number;
      referralCode: string;
    };
    planPurchased: string;
    purchaseDate: Date;
    adminNotes?: string;
    processedAt?: Date;
  }): Promise<TWithdrawalRequestSchemaDto> {
    const newWithdrawal = WithdrawalRequestSchema.parse({
      ...withdrawal,
      _id: new ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { insertedId } =
      await this.getWithdrawalRequestCollection().insertOne(newWithdrawal);
    return this.convertFromEntity({ ...newWithdrawal, _id: insertedId });
  }

  async findWithdrawalRequestsByUserId(
    userId: string
  ): Promise<TWithdrawalRequestSchemaDto[]> {
    const withdrawals = await this.getWithdrawalRequestCollection()
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();

    return withdrawals.map((withdrawal) => this.convertFromEntity(withdrawal));
  }

  async findWithdrawalRequestById(
    id: string
  ): Promise<TWithdrawalRequestSchemaDto | null> {
    const withdrawal = await this.getWithdrawalRequestCollection().findOne({
      _id: new ObjectId(id),
    });
    return withdrawal ? this.convertFromEntity(withdrawal) : null;
  }

  async updateWithdrawalStatus(
    id: string,
    status: "pending" | "approved" | "paid" | "rejected",
    adminNotes?: string
  ): Promise<TWithdrawalRequestSchemaDto | null> {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (status === "paid") {
      updateData.processedAt = new Date();
    }

    if (adminNotes) {
      updateData.adminNotes = adminNotes;
    }

    const result = await this.getWithdrawalRequestCollection().findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: "after" }
    );

    const doc = (result as any)?.value ?? result;
    return doc ? this.convertFromEntity(doc as TWithdrawalRequestSchema) : null;
  }

  async findPendingWithdrawalRequests() {
    const withdrawals = await this.getWithdrawalRequestCollection().find({});

    return withdrawals;
  }

  async findWithdrawalRequestsByStatus(
    status: "pending" | "approved" | "paid" | "rejected"
  ): Promise<TWithdrawalRequestSchemaDto[]> {
    const withdrawals = await this.getWithdrawalRequestCollection()
      .find({ status })
      .sort({ createdAt: -1 })
      .toArray();

    return withdrawals.map((withdrawal) => this.convertFromEntity(withdrawal));
  }

  async findAllWithdrawalRequests(): Promise<TWithdrawalRequestSchemaDto[]> {
    const withdrawals = await this.getWithdrawalRequestCollection()
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return withdrawals.map((withdrawal) => this.convertFromEntity(withdrawal));
  }

  async getTotalWithdrawnAmount(userId: string): Promise<number> {
    const result = await this.getWithdrawalRequestCollection()
      .aggregate([
        { $match: { userId, status: "paid" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ])
      .toArray();

    return result.length > 0 ? result[0].total : 0;
  }

  async getPendingWithdrawalAmount(userId: string): Promise<number> {
    const result = await this.getWithdrawalRequestCollection()
      .aggregate([
        { $match: { userId, status: "pending" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ])
      .toArray();

    return result.length > 0 ? result[0].total : 0;
  }
}
