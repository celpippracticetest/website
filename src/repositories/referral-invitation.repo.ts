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

  async findInvitationsByInviter(
    inviterId: string
  ): Promise<ReferralInvitation[]> {
    return this.getCollection()
      .find({ inviterId })
      .sort({ createdAt: -1 })
      .toArray();
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
