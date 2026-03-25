import { MongoClient, Db, Filter } from "mongodb";
import {
  ProfessionPageContentSchema,
  TProfessionPageContent,
} from "@/models/profession-page.model";

type ProfessionPageDoc = TProfessionPageContent & {
  updatedAt?: Date;
};

export class ProfessionPageRepository {
  private readonly db: Db;

  constructor(mongoClient: MongoClient) {
    this.db = mongoClient.db();
  }

  private collection() {
    return this.db.collection<ProfessionPageDoc>("profession_pages");
  }

  async ensureSlugIndex(): Promise<void> {
    await this.collection().createIndex({ slug: 1 }, { unique: true });
  }

  async findPublishedBySlug(slug: string): Promise<TProfessionPageContent | null> {
    const doc = await this.collection().findOne({
      slug,
      published: true,
    } satisfies Filter<ProfessionPageDoc>);
    if (!doc) return null;
    const parsed = ProfessionPageContentSchema.safeParse(doc);
    if (!parsed.success) {
      console.error("Invalid profession_pages document:", slug, parsed.error.flatten());
      return null;
    }
    return parsed.data;
  }

  async findBySlugAny(slug: string): Promise<TProfessionPageContent | null> {
    const doc = await this.collection().findOne({ slug });
    if (!doc) return null;
    const parsed = ProfessionPageContentSchema.safeParse(doc);
    if (!parsed.success) {
      console.error("Invalid profession_pages document:", slug, parsed.error.flatten());
      return null;
    }
    return parsed.data;
  }

  async listAllForAdmin(): Promise<TProfessionPageContent[]> {
    const rows = await this.collection().find({}).sort({ slug: 1 }).toArray();
    const out: TProfessionPageContent[] = [];
    for (const row of rows) {
      const parsed = ProfessionPageContentSchema.safeParse(row);
      if (parsed.success) out.push(parsed.data);
    }
    return out;
  }

  async listPublishedSlugs(): Promise<string[]> {
    const rows = await this.collection()
      .find({ published: true } satisfies Filter<ProfessionPageDoc>, { projection: { slug: 1 } })
      .sort({ slug: 1 })
      .toArray();
    return rows.map((r) => r.slug).filter(Boolean);
  }

  async create(data: TProfessionPageContent): Promise<void> {
    const existing = await this.collection().findOne({ slug: data.slug }, { projection: { _id: 1 } });
    if (existing) {
      throw new Error("A profession page with this slug already exists.");
    }
    await this.collection().insertOne({
      ...data,
      updatedAt: new Date(),
    });
  }

  async replaceBySlug(slug: string, data: TProfessionPageContent): Promise<boolean> {
    if (data.slug !== slug) {
      throw new Error("Slug in the URL must match the slug in the document.");
    }
    const result = await this.collection().replaceOne(
      { slug },
      { ...data, updatedAt: new Date() }
    );
    return result.matchedCount > 0;
  }

  async deleteBySlug(slug: string): Promise<boolean> {
    const result = await this.collection().deleteOne({ slug });
    return result.deletedCount > 0;
  }
}
