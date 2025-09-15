import { Db, MongoClient } from "mongodb";

type TOnboardingResult = {
  userId: string;
  answers: any;
  answeredAt: Date;
};

export class OnboardingRepository {
  private readonly db: Db;

  constructor(mongoClient: MongoClient) {
    this.db = mongoClient.db();
  }

  private getCollection() {
    return this.db.collection<TOnboardingResult>("onboarding_results");
  }

  async createOrUpdateOnboardingResult(data: TOnboardingResult) {
    await this.getCollection().updateOne(
      { userId: data.userId },
      {
        $set: {
          answers: data.answers,
          answeredAt: data.answeredAt,
        },
      },
      { upsert: true }
    );
  }

  async getAllOnboardingResults(): Promise<TOnboardingResult[]> {
    return this.getCollection().find({}).toArray();
  }

  async getOnboardingResultsPaginated(page: number, limit: number): Promise<TOnboardingResult[]> {
    const skip = (page - 1) * limit;
    return this.getCollection()
      .find({})
      .sort({ answeredAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
  }

  async getOnboardingResultsCount(): Promise<number> {
    return this.getCollection().countDocuments();
  }

  async findByUserId(userId: string): Promise<TOnboardingResult | null> {
    return this.getCollection().findOne({ userId });
  }
}
