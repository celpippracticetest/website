import { MongoClient, Db, ObjectId } from "mongodb";
import { TUserWord, TUserWordDto, UserWordSchema, UserWordSchemaDto } from "@/models/userWords.model";

export class UserWordsRepository {
    private readonly db: Db;

    constructor(mongoClient: MongoClient) {
        this.db = mongoClient.db();
    }

    private getCollection() {
        return this.db.collection<TUserWord>("userwords");
    }

    private convertFromEntity(entity: TUserWord): TUserWordDto {
        const dto: TUserWordDto = {
            ...entity,
            id: entity._id.toHexString(),
        };
        return UserWordSchemaDto.parse(dto);
    }

    async findWord(userId: string, word: string): Promise<TUserWordDto | null> {
        const entity = await this.getCollection().findOne({
            userId,
            word: word.toLowerCase().trim()
        });
        return entity ? this.convertFromEntity(entity) : null;
    }

    async saveWord(userId: string, word: string): Promise<TUserWordDto> {
        const existing = await this.findWord(userId, word);
        if (existing) return existing;

        const wordToSave = word.toLowerCase().trim();
        const entity: TUserWord = {
            _id: new ObjectId(),
            userId,
            word: wordToSave,
            isLearned: false,
            createdAt: new Date(),
        };

        await this.getCollection().insertOne(entity);
        return this.convertFromEntity(entity);
    }

    async saveBulkWords(userId: string, words: string[]): Promise<void> {
        const uniqueWords = Array.from(new Set(words.map(w => w.toLowerCase().trim())));

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
        const wordToMatch = word.toLowerCase().trim();
        const result = await this.getCollection().findOneAndUpdate(
            { userId, word: wordToMatch },
            { $set: { isLearned } },
            { returnDocument: "after" }
        );
        return result ? this.convertFromEntity(result) : null;
    }

    async deleteWord(userId: string, word: string): Promise<void> {
        await this.getCollection().deleteOne({
            userId,
            word: word.toLowerCase().trim()
        });
    }
}
