import { MongoClient, Db, ObjectId, Filter } from "mongodb";
import {
  BlogSchema,
  BlogSchemaDto,
  TBlogSchema,
  TBlogSchemaDto,
  TBlogStatus,
  TBlogWriteInput,
} from "@/models/blog.model";

type BlogListFilters = {
  status?: TBlogStatus;
  category?: string;
  tag?: string;
  search?: string;
};

type PaginatedBlogResult = {
  items: TBlogSchemaDto[];
  page: number;
  totalPages: number;
  totalItems: number;
  hasNextPage: boolean;
};

export class BlogRepository {
  private readonly db: Db;

  constructor(mongoClient: MongoClient) {
    this.db = mongoClient.db();
  }

  private getBlogCollection() {
    return this.db.collection<TBlogSchema>("blogs");
  }

  private convertFromEntity(entity: TBlogSchema): TBlogSchemaDto {
    const dto: TBlogSchemaDto = {
      id: entity._id.toHexString(),
      ...entity,
    };
    return BlogSchemaDto.parse(dto);
  }

  private normalizeSlug(rawSlug: string): string {
    return rawSlug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-");
  }

  private async ensureUniqueSlug(slug: string, excludeId?: string): Promise<string> {
    const baseSlug = this.normalizeSlug(slug);
    let candidate = baseSlug;
    let sequence = 2;

    while (true) {
      const filter: Filter<TBlogSchema> = excludeId
        ? {
            slug: candidate,
            _id: { $ne: new ObjectId(excludeId) },
          }
        : { slug: candidate };
      const exists = await this.getBlogCollection().findOne(filter, { projection: { _id: 1 } });
      if (!exists) {
        return candidate;
      }
      candidate = `${baseSlug}-${sequence}`;
      sequence += 1;
    }
  }

  private buildListFilter(filters: BlogListFilters): Filter<TBlogSchema> {
    const query: Filter<TBlogSchema> = {};

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.category) {
      query.categories = filters.category;
    }

    if (filters.tag) {
      query.tags = filters.tag;
    }

    if (filters.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: "i" } },
        { excerpt: { $regex: filters.search, $options: "i" } },
      ];
    }

    return query;
  }

  private buildPublishedFilter(extraFilter: Filter<TBlogSchema> = {}): Filter<TBlogSchema> {
    return {
      status: "published",
      publishedAt: { $ne: null, $lte: new Date() },
      ...extraFilter,
    };
  }

  async createBlog(dto: TBlogWriteInput): Promise<TBlogSchemaDto> {
    const now = new Date();
    const slug = await this.ensureUniqueSlug(dto.slug);

    const blog = BlogSchema.parse({
      _id: new ObjectId(),
      ...dto,
      slug,
      categories: dto.categories.map((item) => item.trim()).filter(Boolean),
      tags: dto.tags.map((item) => item.trim()).filter(Boolean),
      publishedAt: dto.status === "published" ? dto.publishedAt ?? now : null,
      createdAt: now,
      updatedAt: now,
    });

    const { insertedId } = await this.getBlogCollection().insertOne(blog);
    return this.convertFromEntity({ ...blog, _id: insertedId });
  }

  async findBlogById(id: string): Promise<TBlogSchemaDto | null> {
    const entity = await this.getBlogCollection().findOne({ _id: new ObjectId(id) });
    return entity ? this.convertFromEntity(entity) : null;
  }

  async findPublishedBySlug(slug: string): Promise<TBlogSchemaDto | null> {
    const entity = await this.getBlogCollection().findOne(
      this.buildPublishedFilter({ slug: this.normalizeSlug(slug) })
    );
    return entity ? this.convertFromEntity(entity) : null;
  }

  async findBlogBySlug(slug: string): Promise<TBlogSchemaDto | null> {
    const entity = await this.getBlogCollection().findOne({ slug: this.normalizeSlug(slug) });
    return entity ? this.convertFromEntity(entity) : null;
  }

  async getAllBlogs(
    filters: BlogListFilters,
    page: number = 0,
    limit: number = 10
  ): Promise<PaginatedBlogResult> {
    const currentPage = Math.max(0, page);
    const pageSize = Math.max(1, limit);
    const query = this.buildListFilter(filters);

    const [totalItems, entities] = await Promise.all([
      this.getBlogCollection().countDocuments(query),
      this.getBlogCollection()
        .find(query)
        .sort({ updatedAt: -1, createdAt: -1 })
        .skip(currentPage * pageSize)
        .limit(pageSize)
        .toArray(),
    ]);

    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize);

    return {
      items: entities.map((entity) => this.convertFromEntity(entity)),
      page: currentPage,
      totalItems,
      totalPages,
      hasNextPage: currentPage + 1 < totalPages,
    };
  }

  async getPublishedBlogs(page: number = 0, limit: number = 10): Promise<PaginatedBlogResult> {
    const currentPage = Math.max(0, page);
    const pageSize = Math.max(1, limit);
    const query = this.buildPublishedFilter();

    const [totalItems, entities] = await Promise.all([
      this.getBlogCollection().countDocuments(query),
      this.getBlogCollection()
        .find(query)
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip(currentPage * pageSize)
        .limit(pageSize)
        .toArray(),
    ]);

    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize);

    return {
      items: entities.map((entity) => this.convertFromEntity(entity)),
      page: currentPage,
      totalItems,
      totalPages,
      hasNextPage: currentPage + 1 < totalPages,
    };
  }

  async findRelatedPublishedBlogs(
    currentId: string,
    categories: string[],
    tags: string[],
    limit: number = 3
  ): Promise<TBlogSchemaDto[]> {
    const relatedFilter: Filter<TBlogSchema> = {
      _id: { $ne: new ObjectId(currentId) },
    };

    const scopedFilter =
      categories.length || tags.length
        ? {
            $or: [
              ...(categories.length ? categories.map((category) => ({ categories: category })) : []),
              ...(tags.length ? tags.map((tag) => ({ tags: tag })) : []),
            ],
          }
        : {};

    const query = this.buildPublishedFilter({
      ...relatedFilter,
      ...scopedFilter,
    });

    const entities = await this.getBlogCollection()
      .find(query)
      .sort({ publishedAt: -1 })
      .limit(Math.max(limit, 1))
      .toArray();

    return entities.map((entity) => this.convertFromEntity(entity));
  }

  async getPublishedSlugs(): Promise<Array<{ slug: string; updatedAt: Date; canonicalUrl?: string }>> {
    const rows = await this.getBlogCollection()
      .find(this.buildPublishedFilter(), { projection: { slug: 1, updatedAt: 1, "seo.canonicalUrl": 1 } })
      .toArray();

    return rows.map((row) => ({
      slug: row.slug,
      updatedAt: row.updatedAt,
      canonicalUrl: row.seo?.canonicalUrl,
    }));
  }

  async updateBlog(id: string, dto: Partial<TBlogWriteInput>): Promise<TBlogSchemaDto | null> {
    const current = await this.getBlogCollection().findOne({ _id: new ObjectId(id) });
    if (!current) {
      return null;
    }

    const now = new Date();
    const nextSlug = dto.slug ? await this.ensureUniqueSlug(dto.slug, id) : current.slug;
    const nextStatus = dto.status ?? current.status;
    const nextPublishedAt =
      nextStatus === "published"
        ? dto.publishedAt ?? current.publishedAt ?? now
        : null;

    const updateDoc: Partial<TBlogSchema> = {
      ...dto,
      ...(dto.categories
        ? { categories: dto.categories.map((item) => item.trim()).filter(Boolean) }
        : {}),
      ...(dto.tags ? { tags: dto.tags.map((item) => item.trim()).filter(Boolean) } : {}),
      slug: nextSlug,
      status: nextStatus,
      publishedAt: nextPublishedAt,
      updatedAt: now,
    };

    const updated = await this.getBlogCollection().findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateDoc },
      { returnDocument: "after" }
    );

    return updated ? this.convertFromEntity(updated) : null;
  }

  async deleteBlog(id: string): Promise<void> {
    await this.getBlogCollection().deleteOne({ _id: new ObjectId(id) });
  }
}
