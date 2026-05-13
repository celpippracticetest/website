import type { AppDocumentsDb as Db } from "@/lib/pg/types";
import { Plan } from "@/models/plans.model";

function planDocIsActive(isActive: unknown): boolean {
    if (isActive === true) return true;
    if (isActive === false || isActive === null) return false;
    if (typeof isActive === "number" && Number.isFinite(isActive)) return isActive !== 0;
    if (typeof isActive === "string") {
        const s = isActive.trim().toLowerCase();
        return s === "true" || s === "1" || s === "yes";
    }
    if (isActive && typeof isActive === "object") {
        const o = isActive as Record<string, unknown>;
        if (typeof o.$numberInt === "string") return o.$numberInt !== "0";
        if (typeof o.$numberLong === "string") return o.$numberLong !== "0";
    }
    return false;
}

export class PlansRepository {
    private db: Db;
    private collectionName = "plans";

    constructor(db: Db) {
        this.db = db;
    }

    async getActivePlans(): Promise<Plan[]> {
        const coll = this.db.collection(this.collectionName);
        const fromFilter = await coll
            .find({ isActive: true })
            .sort({ order: 1 })
            .toArray();

        if (fromFilter.length > 0) {
            return fromFilter as unknown as Plan[];
        }

        // Small collection: tolerate legacy `isActive` encodings the SQL fast-path can miss.
        const all = await coll.find({}).sort({ order: 1 }).toArray();
        const active = (all as unknown as Plan[]).filter((p) =>
            planDocIsActive((p as { isActive?: unknown }).isActive)
        );
        return active;
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
