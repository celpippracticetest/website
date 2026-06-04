import type { AppDocumentsClient, AppDocumentsDb as Db } from "@/lib/pg/types";

type TOnboardingNewResult = {
  userId: string;
  answers: {
    primaryGoal: string;
    customPrimaryGoal?: string;
    subGoal?: string;
    customSubGoal?: string;
    testDate?: string;
    focusSkill: string;
    customFocusSkill?: string;
    targetScores: {
      listening: number;
      reading: number;
      writing: number;
      speaking: number;
    };
  };
  answeredAt: Date;
};

export class OnboardingNewRepository {
  private readonly db: Db;

  constructor(documentsClient: AppDocumentsClient) {
    this.db = documentsClient.db();
  }

  private getCollection() {
    return this.db.collection<TOnboardingNewResult>("onboarding_new_results");
  }

  async createOrUpdateOnboardingNewResult(data: TOnboardingNewResult) {
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

  async getAllOnboardingNewResults(): Promise<TOnboardingNewResult[]> {
    return this.getCollection().find({}).toArray();
  }

  async getOnboardingNewResultsPaginated(page: number, limit: number): Promise<TOnboardingNewResult[]> {
    const skip = (page - 1) * limit;
    return this.getCollection()
      .find({})
      .sort({ answeredAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
  }

  async getOnboardingNewResultsCount(): Promise<number> {
    return this.getCollection().countDocuments();
  }

  async findByUserId(userId: string): Promise<TOnboardingNewResult | null> {
    return this.getCollection().findOne({ userId });
  }
}
