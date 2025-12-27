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
            createdAt: new Date(),
        }));

        await this.getCollection().insertMany(entities);
    }

    async getAllWords(userId: string): Promise<TUserWordDto[]> {
        const entities = await this.getCollection()
            .find({ userId })
            .sort({ createdAt: -1 })
            .toArray();
        return entities.map(e => this.convertFromEntity(e));
    }

    async deleteWord(userId: string, word: string): Promise<void> {
        await this.getCollection().deleteOne({
            userId,
            word: word.toLowerCase().trim()
        });
    }
}
