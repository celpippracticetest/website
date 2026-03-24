import { Db } from "mongodb";
import { Plan } from "@/models/plans.model";

export class PlansRepository {
    private db: Db;
    private collectionName = "plans";

    constructor(db: Db) {
        this.db = db;
    }

    async getActivePlans(): Promise<Plan[]> {
        const plans = await this.db
            .collection(this.collectionName)
            .find({ isActive: true })
            .sort({ order: 1 })
            .toArray();

        // Map _id to string or keep as ObjectId depending on need, 
        // but usually for frontend we might want string. 
        // However, the model has _id as ObjectId.
        // We'll return as is, Next.js serializes it automatically in API, 
        // but in server components we might need to be careful if passing to client components.
        return plans as unknown as Plan[];
    }

    async getAllPlans(): Promise<Plan[]> {
        const plans = await this.db
            .collection(this.collectionName)
            .find({})
            .sort({ order: 1 })
            .toArray();
        return plans as unknown as Plan[];
    }

    async findActivePlanByStripePriceId(priceId: string): Promise<Plan | null> {
        if (!priceId?.trim()) return null;
        const doc = await this.db.collection(this.collectionName).findOne({
            isActive: true,
            stripePriceId: priceId.trim(),
        });
        return (doc as Plan | null) ?? null;
    }
}
