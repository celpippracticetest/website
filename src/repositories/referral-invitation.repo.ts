import { MongoClient, ObjectId } from "mongodb";

export interface ReferralInvitation {
  _id?: ObjectId;
  inviterId: string;
  inviteeId: string;
  referralCode: string;
  status: "pending" | "completed" | "cancelled";
  invitedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  inviteeEmail?: string;
  inviteeName?: string;
  sentAt?: Date; // optional alias for invitedAt used by some mappers
}

export class ReferralInvitationRepository {
  private readonly db: any;

  constructor(mongoClient: MongoClient) {
    this.db = mongoClient.db();
  }

  private getCollection() {
    return this.db.collection("referralInvitations");
  }

  async ensureIndexes() {
    const collection = this.getCollection();
    await collection.createIndex({ inviterId: 1 });
    await collection.createIndex({ inviteeId: 1 });
    await collection.createIndex({ referralCode: 1 });
    await collection.createIndex({ status: 1 });
    await collection.createIndex({ inviterId: 1, status: 1 });
    await collection.createIndex({ createdAt: -1 });
    await collection.createIndex({ completedAt: -1 });
    // Avoid duplicate invitation documents for the same (referralCode, inviteeId)
    await collection.createIndex(
      { referralCode: 1, inviteeId: 1 },
      { unique: true }
    );
  }

  async findInvitationsByInviter(
    inviterId: string
  ): Promise<ReferralInvitation[]> {
    return this.getCollection()
      .find({ inviterId })
      .sort({ createdAt: -1 })
      .toArray();
  }

  // Alias kept for backwards-compatibility with callers expecting *ByInviterId
  async findInvitationsByInviterId(
    inviterId: string
  ): Promise<ReferralInvitation[]> {
    return this.findInvitationsByInviter(inviterId);
  }

  async findRecentInvitationsByInviterId(
    inviterId: string,
    limit = 50
  ): Promise<ReferralInvitation[]> {
    return this.getCollection()
      .find({ inviterId })
      .project({
        inviterId: 1,
        inviteeId: 1,
        inviteeEmail: 1,
        inviteeName: 1,
        referralCode: 1,
        status: 1,
        invitedAt: 1,
        sentAt: 1,
        completedAt: 1,
        createdAt: 1,
        updatedAt: 1,
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }

  async upsertInvitationByCodeAndInvitee(
    referralCode: string,
    inviteeId: string,
    payload: Omit<
      ReferralInvitation,
      "_id" | "createdAt" | "updatedAt" | "referralCode" | "inviteeId"
    > & { inviterId: string }
  ): Promise<ReferralInvitation> {
    const now = new Date();
    const result = await this.getCollection().findOneAndUpdate(
      { referralCode, inviteeId },
      {
        $setOnInsert: {
          _id: new ObjectId(),
          referralCode,
          inviteeId,
          createdAt: now,
        },
        $set: {
          ...payload,
          updatedAt: now,
          invitedAt: payload?.invitedAt ?? now,
        },
      },
      { upsert: true, returnDocument: "after" }
    );
    // `findOneAndUpdate` returns `value` as the document
    return result.value as ReferralInvitation;
  }

  async createInvitation(
    invitation: Omit<ReferralInvitation, "_id" | "createdAt" | "updatedAt">
  ): Promise<ReferralInvitation> {
    const newInvitation: ReferralInvitation = {
      ...invitation,
      _id: new ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await this.getCollection().insertOne(newInvitation);
    return { ...newInvitation, _id: result.insertedId };
  }

  async findInvitationsByInvitee(
    inviteeId: string
  ): Promise<ReferralInvitation[]> {
    return this.getCollection()
      .find({ inviteeId })
      .sort({ createdAt: -1 })
      .toArray();
  }

  async findInvitationByCodeAndInvitee(
    referralCode: string,
    inviteeId: string
  ): Promise<ReferralInvitation | null> {
    return this.getCollection().findOne({ referralCode, inviteeId });
  }

  async markCompletedByCodeAndInvitee(
    referralCode: string,
    inviteeId: string
  ): Promise<boolean> {
    const result = await this.getCollection().updateOne(
      { referralCode, inviteeId },
      {
        $set: {
          status: "completed",
          completedAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );
    return result.modifiedCount > 0;
  }

  async updateInvitationStatus(
    invitationId: string,
    status: "pending" | "completed" | "cancelled"
  ): Promise<boolean> {
    const result = await this.getCollection().updateOne(
      { _id: new ObjectId(invitationId) },
      {
        $set: {
          status,
          updatedAt: new Date(),
          ...(status === "completed" && { completedAt: new Date() }),
        },
      }
    );
    return result.modifiedCount > 0;
  }

  async getInviteeCount(inviterId: string): Promise<number> {
    return this.getCollection().countDocuments({
      inviterId,
      status: "completed",
    });
  }

  async getTotalInvitations(inviterId: string): Promise<number> {
    return this.getCollection().countDocuments({ inviterId });
  }
}
