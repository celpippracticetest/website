import { ObjectId } from "bson";
import type { AppDocumentsClient, AppDocumentsDb as Db } from "@/lib/pg/types";
import { TUserWord, TUserWordDto, UserWordSchemaDto } from "@/models/userWords.model";

export class UserWordsRepository {
    private readonly db: Db;

    constructor(documentsClient: AppDocumentsClient) {
        this.db = documentsClient.db();
    }

    private getCollection() {
        return this.db.collection<TUserWord>("userwords");
    }

    private normalizeWord(word: string) {
        let normalized = word.toLowerCase().trim();
        const quoteEdges = /^['"`\u2018\u2019\u201C\u201D]+|['"`\u2018\u2019\u201C\u201D]+$/g;
        // Strip wrapping quotes repeatedly while preserving inner apostrophes.
        while (quoteEdges.test(normalized)) {
            normalized = normalized.replace(quoteEdges, "").trim();
        }
        return normalized;
    }

    private convertFromEntity(entity: TUserWord): TUserWordDto {
        const dto: TUserWordDto = {
            ...entity,
            reviewedTimes: entity.reviewedTimes ?? 0,
            complexityLevel: entity.complexityLevel ?? "intermediate",
            id: entity._id.toHexString(),
        };
        return UserWordSchemaDto.parse(dto);
    }

    async findWord(userId: string, word: string): Promise<TUserWordDto | null> {
        const entity = await this.getCollection().findOne({
            userId,
            word: this.normalizeWord(word)
        });
        return entity ? this.convertFromEntity(entity) : null;
    }

    async saveWord(
        userId: string,
        word: string,
        complexityLevel: "beginner" | "intermediate" | "advanced" = "intermediate"
    ): Promise<TUserWordDto> {
        const existing = await this.findWord(userId, word);
        if (existing) return existing;

        const wordToSave = this.normalizeWord(word);
        const entity: TUserWord = {
            _id: new ObjectId(),
            userId,
            word: wordToSave,
            isLearned: false,
            reviewedTimes: 0,
            complexityLevel,
            createdAt: new Date(),
        };

        await this.getCollection().insertOne(entity);
        return this.convertFromEntity(entity);
    }

    async saveBulkWords(userId: string, words: string[]): Promise<void> {
        const uniqueWords = Array.from(
            new Set(words.map((w) => this.normalizeWord(w)).filter((w) => w.length > 0))
        );

        // Check which ones already exist
        const existingEntities = await this.getCollection().find({
            userId,
            word: { $in: uniqueWords }
        }).toArray();

        const existingWords = new Set(existingEntities.map(e => e.word));
        const newWords = uniqueWords.filter(w => !existingWords.has(w));

        if (newWords.length === 0) return;

        const entities: TUserWord[] = newWords.map(word => ({
            _id: new ObjectId(),
            userId,
            word,
            isLearned: false,
            reviewedTimes: 0,
            complexityLevel: "intermediate",
            createdAt: new Date(),
        }));

        await this.getCollection().insertMany(entities);
    }

    async getAllWords(userId: string, limit: number = 100, skip: number = 0): Promise<{ items: TUserWordDto[], total: number }> {
        const total = await this.getCollection().countDocuments({ userId });
        const entities = await this.getCollection()
            .find({ userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();

        return {
            items: entities.map(e => this.convertFromEntity(e)),
            total
        };
    }

    async countWords(userId: string): Promise<number> {
        return await this.getCollection().countDocuments({ userId });
    }

    async toggleLearned(userId: string, word: string, isLearned: boolean): Promise<TUserWordDto | null> {
        const wordToMatch = this.normalizeWord(word);
        const result = await this.getCollection().findOneAndUpdate(
            { userId, word: wordToMatch },
            { $set: { isLearned } },
            { returnDocument: "after" }
        );
        return result ? this.convertFromEntity(result) : null;
    }

    async incrementReviewedTimes(userId: string, word: string): Promise<TUserWordDto | null> {
        const wordToMatch = this.normalizeWord(word);
        const result = await this.getCollection().findOneAndUpdate(
            { userId, word: wordToMatch },
            { $inc: { reviewedTimes: 1 } },
            { returnDocument: "after" }
        );
        return result ? this.convertFromEntity(result) : null;
    }

    async getTopReviewedWords(limit: number = 10): Promise<string[]> {
        const items = await this.getCollection().aggregate<{ _id: string }>([
            {
                $group: {
                    _id: "$word",
                    totalReviews: { $sum: { $ifNull: ["$reviewedTimes", 0] } }
                }
            },
            { $sort: { totalReviews: -1, _id: 1 } },
            { $limit: Math.max(limit * 5, limit) }
        ]).toArray();

        const uniqueNormalized = new Set<string>();
        for (const item of items) {
            const cleaned = this.normalizeWord(item._id);
            if (!cleaned) continue;
            uniqueNormalized.add(cleaned);
            if (uniqueNormalized.size >= limit) break;
        }

        return Array.from(uniqueNormalized);
    }

    async deleteWord(userId: string, word: string): Promise<void> {
        await this.getCollection().deleteOne({
            userId,
            word: this.normalizeWord(word)
        });
    }
}
