import { ObjectId } from "bson";
import type { AppDocumentsClient } from "@/lib/pg/types";
import { getSql } from "@/lib/pg/pool";
import { normalizeWikiSlug, normalizeWikiSlugStorage } from "@/lib/wiki/slug";
import {
  BlogSchema,
  BlogSchemaDto,
  BlogSeoSchema,
  TBlogSchemaDto,
  TBlogStatus,
  TBlogWriteInput,
} from "@/models/blog.model";
import postgres from "postgres";

const BLOG_SELECT_SQL =
  "mongo_id, title, slug, excerpt, content_html, content_json, status, author_name, categories, tags, featured_image, faq, ai_snippet, seo, published_at, created_at, updated_at";

function blogListWhereSql(filters: BlogListFilters) {
  const sql = getSql();
  const st = filters.status;
  const cat = filters.category?.trim();
  const tg = filters.tag?.trim();
  const q = filters.search?.trim();
  if (!st && !cat && !tg && !q) {
    return sql`true`;
  }
  const like = q ? `%${q}%` : null;
  return sql`
    (${st ? sql`status = ${st}` : sql`true`})
    AND (${cat ? sql`${cat} = ANY (categories)` : sql`true`})
    AND (${tg ? sql`${tg} = ANY (tags)` : sql`true`})
    AND (${q && like ? sql`(title ILIKE ${like} OR excerpt ILIKE ${like})` : sql`true`})
  `;
}

function relatedScopeSql(
  sql: ReturnType<typeof getSql>,
  categories: string[],
  tags: string[]
) {
  if (categories.length === 0 && tags.length === 0) {
    return sql`true`;
  }
  const ors: ReturnType<typeof sql>[] = [];
  if (categories.length > 0) {
    // postgres.js `sql.array(x, type)` expects a type OID, not the string "text".
    ors.push(sql`categories && ${sql.array(categories)}`);
  }
  if (tags.length > 0) {
    ors.push(sql`tags && ${sql.array(tags)}`);
  }
  if (ors.length === 1) return ors[0]!;
  return sql`(${ors.reduce((a, b) => sql`${a} OR ${b}`)})`;
}

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

type BlogRow = {
  mongo_id: string;
  title: string;
  slug: string;
  excerpt: string;
  content_html: string;
  content_json: unknown | null;
  status: string;
  author_name: string;
  categories: string[] | null;
  tags: string[] | null;
  featured_image: unknown | null;
  faq: unknown;
  ai_snippet: unknown | null;
  seo: unknown;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

function isHex24(id: string): boolean {
  return /^[a-f0-9]{24}$/i.test(id.trim());
}

/** When `fetch_types` is off (Supabase pooler), postgres.js returns text[] as `{a,b}` strings. */
function parsePgTextArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? "").trim()).filter(Boolean);
  }
  if (value == null) return [];
  if (typeof value !== "string") return [];

  const trimmed = value.trim();
  if (!trimmed || trimmed === "{}") return [];
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
    return trimmed
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  const inner = trimmed.slice(1, -1);
  if (!inner) return [];

  const items: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < inner.length; i += 1) {
    const ch = inner[i]!;
    if (inQuotes) {
      if (ch === "\\" && i + 1 < inner.length) {
        current += inner[++i];
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      const item = current.trim();
      if (item) items.push(item);
      current = "";
    } else {
      current += ch;
    }
  }

  const last = current.trim();
  if (last) items.push(last);
  return items;
}

function rowToDto(row: BlogRow): TBlogSchemaDto {
  const faq = Array.isArray(row.faq) ? row.faq : [];
  const seoRaw = row.seo && typeof row.seo === "object" && !Array.isArray(row.seo) ? row.seo : {};
  const seo = BlogSeoSchema.parse({
    keywords: [],
    ...seoRaw,
  });
  const aiSnippet =
    row.ai_snippet && typeof row.ai_snippet === "object" && !Array.isArray(row.ai_snippet)
      ? (row.ai_snippet as Record<string, unknown>)
      : { question: "", answer: "" };
  const featuredImage =
    row.featured_image &&
    typeof row.featured_image === "object" &&
    !Array.isArray(row.featured_image)
      ? (row.featured_image as Record<string, unknown>)
      : null;

  return BlogSchemaDto.parse({
    id: row.mongo_id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    contentHtml: row.content_html,
    contentJson:
      row.content_json === null || row.content_json === undefined
        ? null
        : (row.content_json as Record<string, unknown>),
    status: row.status,
    authorName: row.author_name,
    categories: parsePgTextArray(row.categories),
    tags: parsePgTextArray(row.tags),
    featuredImage,
    faq,
    aiSnippet,
    seo,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export class BlogRepository {
  constructor(_documentsClient: AppDocumentsClient) {
    void _documentsClient;
  }

  private async ensureUniqueSlug(slugInput: string, excludeMongoId?: string): Promise<string> {
    const sql = getSql();
    const baseSlug = normalizeWikiSlugStorage(slugInput);
    let candidate = baseSlug;
    let seq = 2;
    for (;;) {
      const rows =
        excludeMongoId && isHex24(excludeMongoId)
          ? await sql<{ ok: number }[]>`
              SELECT 1 AS ok FROM public.blogs
              WHERE slug = ${candidate} AND mongo_id <> ${excludeMongoId.trim().toLowerCase()}
              LIMIT 1
            `
          : await sql<{ ok: number }[]>`
              SELECT 1 AS ok FROM public.blogs WHERE slug = ${candidate} LIMIT 1
            `;
      if (rows.length === 0) {
        return candidate;
      }
      candidate = `${baseSlug}-${seq}`;
      seq += 1;
    }
  }

  async createBlog(dto: TBlogWriteInput): Promise<TBlogSchemaDto> {
    const sql = getSql();
    const now = new Date();
    const mongoId = new ObjectId().toHexString();
    const slug = await this.ensureUniqueSlug(dto.slug);
    const publishedAt =
      dto.status === "published" ? (dto.publishedAt != null ? new Date(dto.publishedAt) : now) : null;
    const categories = dto.categories.map((item) => item.trim()).filter(Boolean);
    const tags = dto.tags.map((item) => item.trim()).filter(Boolean);
    const seo = BlogSeoSchema.parse({ keywords: [], ...dto.seo });
    const faq = dto.faq ?? [];
    const aiSnippet = dto.aiSnippet ?? { question: "", answer: "" };

    const blog = BlogSchema.parse({
      _id: new ObjectId(mongoId),
      ...dto,
      slug,
      categories,
      tags,
      publishedAt,
      createdAt: now,
      updatedAt: now,
      seo,
      faq,
      aiSnippet,
    });

    await sql`
      INSERT INTO public.blogs (
        mongo_id,
        title,
        slug,
        excerpt,
        content_html,
        content_json,
        status,
        author_name,
        categories,
        tags,
        featured_image,
        faq,
        ai_snippet,
        seo,
        published_at,
        created_at,
        updated_at
      )
      VALUES (
        ${mongoId},
        ${blog.title},
        ${blog.slug},
        ${blog.excerpt},
        ${blog.contentHtml},
        ${blog.contentJson != null ? sql.json(blog.contentJson as postgres.JSONValue) : null},
        ${blog.status},
        ${blog.authorName},
        ${sql.array(blog.categories)},
        ${sql.array(blog.tags)},
        ${blog.featuredImage != null ? sql.json(blog.featuredImage as postgres.JSONValue) : null},
        ${sql.json(blog.faq as postgres.JSONValue)},
        ${sql.json(blog.aiSnippet as postgres.JSONValue)},
        ${sql.json(blog.seo as postgres.JSONValue)},
        ${publishedAt},
        ${now},
        ${now}
      )
    `;

    const created = await this.findBlogById(mongoId);
    if (!created) {
      throw new Error("blog insert succeeded but row not found");
    }
    return created;
  }

  async findBlogById(id: string): Promise<TBlogSchemaDto | null> {
    if (!isHex24(id)) return null;
    const sql = getSql();
    const key = id.trim().toLowerCase();
    const rows = await sql<BlogRow[]>`
      SELECT ${sql.unsafe(BLOG_SELECT_SQL)}
      FROM public.blogs
      WHERE mongo_id = ${key}
      LIMIT 1
    `;
    const row = rows[0];
    return row ? rowToDto(row) : null;
  }

  async findPublishedBySlug(slug: string): Promise<TBlogSchemaDto | null> {
    const normalized = normalizeWikiSlug(slug);
    const sql = getSql();
    const rows = await sql<BlogRow[]>`
      SELECT ${sql.unsafe(BLOG_SELECT_SQL)}
      FROM public.blogs
      WHERE slug = ${normalized}
        AND status = 'published'
        AND published_at IS NOT NULL
        AND published_at <= now()
      LIMIT 1
    `;
    const row = rows[0];
    return row ? rowToDto(row) : null;
  }

  async findBlogBySlug(slug: string): Promise<TBlogSchemaDto | null> {
    const normalized = normalizeWikiSlug(slug);
    const sql = getSql();
    const rows = await sql<BlogRow[]>`
      SELECT ${sql.unsafe(BLOG_SELECT_SQL)}
      FROM public.blogs
      WHERE slug = ${normalized}
      LIMIT 1
    `;
    const row = rows[0];
    return row ? rowToDto(row) : null;
  }

  async getAllBlogs(
    filters: BlogListFilters,
    page: number = 0,
    limit: number = 10
  ): Promise<PaginatedBlogResult> {
    const sql = getSql();
    const currentPage = Math.max(0, page);
    const pageSize = Math.max(1, limit);
    const skip = currentPage * pageSize;
    const where = blogListWhereSql(filters);

    const countRows = await sql<{ c: number }[]>`
      SELECT COUNT(*)::int AS c FROM public.blogs WHERE ${where}
    `;
    const totalItems = countRows[0]?.c ?? 0;

    const entities = await sql<BlogRow[]>`
      SELECT ${sql.unsafe(BLOG_SELECT_SQL)}
      FROM public.blogs
      WHERE ${where}
      ORDER BY updated_at DESC, created_at DESC
      OFFSET ${skip}
      LIMIT ${pageSize}
    `;

    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize);

    return {
      items: entities.map(rowToDto),
      page: currentPage,
      totalItems,
      totalPages,
      hasNextPage: currentPage + 1 < totalPages,
    };
  }

  async getPublishedBlogs(page: number = 0, limit: number = 10): Promise<PaginatedBlogResult> {
    const sql = getSql();
    const currentPage = Math.max(0, page);
    const pageSize = Math.max(1, limit);
    const skip = currentPage * pageSize;
    const countRows = await sql<{ c: number }[]>`
      SELECT COUNT(*)::int AS c
      FROM public.blogs
      WHERE status = 'published'
        AND published_at IS NOT NULL
        AND published_at <= now()
    `;
    const totalItems = countRows[0]?.c ?? 0;

    const entities = await sql<BlogRow[]>`
      SELECT ${sql.unsafe(BLOG_SELECT_SQL)}
      FROM public.blogs
      WHERE status = 'published'
        AND published_at IS NOT NULL
        AND published_at <= now()
      ORDER BY published_at DESC NULLS LAST, created_at DESC
      OFFSET ${skip}
      LIMIT ${pageSize}
    `;

    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize);

    return {
      items: entities.map(rowToDto),
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
    if (!isHex24(currentId)) return [];
    const sql = getSql();
    const lim = Math.max(limit, 1);
    const key = currentId.trim().toLowerCase();
    const scope = relatedScopeSql(sql, categories, tags);

    const entities = await sql<BlogRow[]>`
      SELECT ${sql.unsafe(BLOG_SELECT_SQL)}
      FROM public.blogs
      WHERE mongo_id <> ${key}
        AND status = 'published'
        AND published_at IS NOT NULL
        AND published_at <= now()
        AND (${scope})
      ORDER BY published_at DESC NULLS LAST
      LIMIT ${lim}
    `;

    return entities.map(rowToDto);
  }

  async getPublishedSlugs(): Promise<Array<{ slug: string; updatedAt: Date; canonicalUrl?: string }>> {
    const sql = getSql();
    const rows = await sql<BlogRow[]>`
      SELECT ${sql.unsafe(BLOG_SELECT_SQL)}
      FROM public.blogs
      WHERE status = 'published'
        AND published_at IS NOT NULL
        AND published_at <= now()
      ORDER BY published_at DESC NULLS LAST, created_at DESC
    `;

    const out: Array<{ slug: string; updatedAt: Date; canonicalUrl?: string }> = [];
    for (const row of rows) {
      try {
        const dto = rowToDto(row);
        const canonicalUrl = dto.seo?.canonicalUrl?.trim();
        out.push({
          slug: dto.slug,
          updatedAt: dto.updatedAt,
          ...(canonicalUrl ? { canonicalUrl } : {}),
        });
      } catch (error) {
        console.error(`Omitting blog from sitemap (${row.slug}):`, error);
      }
    }
    return out;
  }

  async updateBlog(id: string, dto: Partial<TBlogWriteInput>): Promise<TBlogSchemaDto | null> {
    if (!isHex24(id)) return null;
    const current = await this.findBlogById(id);
    if (!current) return null;

    const sql = getSql();
    const now = new Date();
    const key = id.trim().toLowerCase();

    const nextSlug =
      dto.slug !== undefined ? await this.ensureUniqueSlug(dto.slug, key) : current.slug;
    const nextStatus = dto.status ?? current.status;
    const nextPublishedAt =
      nextStatus === "published"
        ? dto.publishedAt != null
          ? new Date(dto.publishedAt)
          : current.publishedAt ?? now
        : null;

    const title = dto.title ?? current.title;
    const excerpt = dto.excerpt ?? current.excerpt;
    const contentHtml = dto.contentHtml ?? current.contentHtml;
    const contentJson =
      dto.contentJson !== undefined ? dto.contentJson : current.contentJson ?? null;
    const authorName = dto.authorName ?? current.authorName;
    const categories =
      dto.categories !== undefined
        ? dto.categories.map((item) => item.trim()).filter(Boolean)
        : current.categories;
    const tags =
      dto.tags !== undefined ? dto.tags.map((item) => item.trim()).filter(Boolean) : current.tags;
    const featuredImage =
      dto.featuredImage !== undefined ? dto.featuredImage : current.featuredImage ?? null;
    const faq = dto.faq !== undefined ? dto.faq : current.faq;
    const aiSnippet = dto.aiSnippet !== undefined ? dto.aiSnippet : current.aiSnippet;
    const seo =
      dto.seo !== undefined
        ? BlogSeoSchema.parse({ ...current.seo, ...dto.seo })
        : current.seo;

    const rows = await sql<BlogRow[]>`
      UPDATE public.blogs
      SET
        title = ${title},
        slug = ${nextSlug},
        excerpt = ${excerpt},
        content_html = ${contentHtml},
        content_json = ${contentJson != null ? sql.json(contentJson as postgres.JSONValue) : null},
        status = ${nextStatus},
        author_name = ${authorName},
        categories = ${sql.array(categories)},
        tags = ${sql.array(tags)},
        featured_image = ${featuredImage != null ? sql.json(featuredImage as postgres.JSONValue) : null},
        faq = ${sql.json(faq as postgres.JSONValue)},
        ai_snippet = ${sql.json(aiSnippet as postgres.JSONValue)},
        seo = ${sql.json(seo as postgres.JSONValue)},
        published_at = ${nextPublishedAt},
        updated_at = ${now}
      WHERE mongo_id = ${key}
      RETURNING ${sql.unsafe(BLOG_SELECT_SQL)}
    `;
    const row = rows[0];
    return row ? rowToDto(row) : null;
  }

  async deleteBlog(id: string): Promise<void> {
    if (!isHex24(id)) return;
    const sql = getSql();
    await sql`
      DELETE FROM public.blogs
      WHERE mongo_id = ${id.trim().toLowerCase()}
    `;
  }
}
