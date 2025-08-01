import { MongoClient, ObjectId } from "mongodb";

interface SpeakingAnswer {
  _id?: ObjectId;
  userId: string;
  practiceId: string;
  createdAt: Date;
  audioUrl: string;
}

export class SpeakingAnswerRepository {
  private client: MongoClient;
  private collectionName = "speakingAnswers";

  constructor(client: MongoClient) {
    this.client = client;
  }

  private collection() {
    return this.client.db().collection<SpeakingAnswer>(this.collectionName);
  }

  async findAnswersByPracticeIdsAndUser(
    practiceIds: string[],
    userId: string
  ): Promise<SpeakingAnswer[]> {
    const answers = await this.collection()
      .find({ userId, practiceId: { $in: practiceIds } })
      .toArray();

    return answers;
  }

  async saveAnswer(answer: SpeakingAnswer) {
    await this.collection().insertOne({
      ...answer,
      createdAt: new Date(),
    });
  }
}
