import {
  TReferralRewardSchema,
  TReferralRewardSchemaDto,
  ReferralRewardSchema,
  ReferralRewardSchemaDto,
} from "@/models/referral-reward.model";
import { MongoClient, Db, ObjectId } from "mongodb";

export class ReferralRewardRepository {
  private readonly db: Db;

  constructor(mongoClient: MongoClient) {
    this.db = mongoClient.db();
  }

  private getReferralRewardCollection() {
    return this.db.collection<TReferralRewardSchema>("referralRewards");
  }

  private convertFromEntity(
    rewardEntity: TReferralRewardSchema
  ): TReferralRewardSchemaDto {
    const reward: TReferralRewardSchemaDto = {
      id: rewardEntity._id.toHexString(),
      ...rewardEntity,
    };
    return ReferralRewardSchemaDto.parse(reward);
  }

  async ensureIndexes() {
    const collection = this.getReferralRewardCollection();
    await collection.createIndex({ inviterId: 1 });
    await collection.createIndex({ inviteeId: 1 });
    await collection.createIndex({ referralCode: 1 });
    await collection.createIndex({ status: 1 });
    await collection.createIndex({ checkoutId: 1 });
  }

  async createReward(
    reward: Omit<TReferralRewardSchema, "_id" | "createdAt" | "updatedAt">
  ): Promise<TReferralRewardSchemaDto> {
    const newReward = ReferralRewardSchema.parse({
      ...reward,
      _id: new ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { insertedId } = await this.getReferralRewardCollection().insertOne(
      newReward
    );
    return this.convertFromEntity({ ...newReward, _id: insertedId });
  }

  async findRewardsByInviterId(
    inviterId: string
  ): Promise<TReferralRewardSchemaDto[]> {
    const rewards = await this.getReferralRewardCollection()
      .find({ inviterId })
      .sort({ createdAt: -1 })
      .toArray();

    return rewards.map((reward) => this.convertFromEntity(reward));
  }

  async findRewardsByInviteeId(
    inviteeId: string
  ): Promise<TReferralRewardSchemaDto[]> {
    const rewards = await this.getReferralRewardCollection()
      .find({ inviteeId })
      .sort({ createdAt: -1 })
      .toArray();

    return rewards.map((reward) => this.convertFromEntity(reward));
  }

  async findRewardByCheckoutId(
    checkoutId: string
  ): Promise<TReferralRewardSchemaDto | null> {
    const reward = await this.getReferralRewardCollection().findOne({
      checkoutId,
    });
    return reward ? this.convertFromEntity(reward) : null;
  }

  async updateRewardStatus(
    id: string,
    status: "pending" | "confirmed" | "paid"
  ): Promise<TReferralRewardSchemaDto | null> {
    const result = await this.getReferralRewardCollection().findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: {
          status,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );

    return result ? this.convertFromEntity(result) : null;
  }

  async getTotalConfirmedRewards(inviterId: string): Promise<number> {
    const result = await this.getReferralRewardCollection()
      .aggregate([
        { $match: { inviterId, status: "confirmed" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ])
      .toArray();

    return result.length > 0 ? result[0].total : 0;
  }

  async getTotalPendingRewards(inviterId: string): Promise<number> {
    const result = await this.getReferralRewardCollection()
      .aggregate([
        { $match: { inviterId, status: "pending" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ])
      .toArray();

    return result.length > 0 ? result[0].total : 0;
  }

  async getInviteeCount(inviterId: string): Promise<number> {
    // Count distinct inviteeIds for this inviter, regardless of reward status
    const ids = await this.getReferralRewardCollection().distinct("inviteeId", {
      inviterId,
    });
    return ids.length;
  }

  async getTotalEarnings(inviterId: string): Promise<number> {
    return this.getTotalConfirmedRewards(inviterId);
  }

  async getRewardLevel(inviterId: string): Promise<number> {
    const totalInvitees = await this.getInviteeCount(inviterId);
    if (totalInvitees >= 10) return 3;
    if (totalInvitees >= 5) return 2;
    return 1;
  }
}
