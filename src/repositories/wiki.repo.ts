import { ObjectId } from "bson";
import type { AppDocumentsClient } from "@/lib/pg/types";
import { getSql } from "@/lib/pg/pool";
import { normalizeWikiSlug, normalizeWikiSlugStorage } from "@/lib/wiki/slug";
import {
  WikiArticleSchemaDto,
  TWikiArticleSchemaDto,
  TWikiArticleWriteInput,
} from "@/models/wiki.model";

type WikiArticleRow = {
  mongo_id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  color: string;
  summary: string;
  content: string;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
};

function isPgUniqueViolation(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "23505";
}

function isHex24(id: string): boolean {
  return /^[a-f0-9]{24}$/i.test(id.trim());
}

function rowToDto(row: WikiArticleRow): TWikiArticleSchemaDto {
  return WikiArticleSchemaDto.parse({
    id: row.mongo_id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    category: row.category,
    color: row.color,
    summary: row.summary,
    content: row.content,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export class WikiRepository {
  constructor(_documentsClient: AppDocumentsClient) {
    void _documentsClient;
  }

  async findById(id: string): Promise<TWikiArticleSchemaDto | null> {
    if (!isHex24(id)) return null;
    const sql = getSql();
    const rows = await sql<WikiArticleRow[]>`
      SELECT
        mongo_id,
        title,
        slug,
        description,
        category,
        color,
        summary,
        content,
        sort_order,
        created_at,
        updated_at
      FROM public.wiki_articles
      WHERE mongo_id = ${id.trim().toLowerCase()}
      LIMIT 1
    `;
    const row = rows[0];
    return row ? rowToDto(row) : null;
  }

  async findBySlug(slug: string): Promise<TWikiArticleSchemaDto | null> {
    const normalized = normalizeWikiSlug(slug);
    const sql = getSql();
    const rows = await sql<WikiArticleRow[]>`
      SELECT
        mongo_id,
        title,
        slug,
        description,
        category,
        color,
        summary,
        content,
        sort_order,
        created_at,
        updated_at
      FROM public.wiki_articles
      WHERE slug = ${normalized}
      LIMIT 1
    `;
    const row = rows[0];
    return row ? rowToDto(row) : null;
  }

  async findAll(): Promise<TWikiArticleSchemaDto[]> {
    const sql = getSql();
    const rows = await sql<WikiArticleRow[]>`
      SELECT
        mongo_id,
        title,
        slug,
        description,
        category,
        color,
        summary,
        content,
        sort_order,
        created_at,
        updated_at
      FROM public.wiki_articles
      ORDER BY sort_order ASC, slug ASC
    `;
    return rows.map(rowToDto);
  }

  async getSlugs(): Promise<Array<{ slug: string; updatedAt: Date }>> {
    const sql = getSql();
    const rows = await sql<{ slug: string; updated_at: Date }[]>`
      SELECT slug, updated_at
      FROM public.wiki_articles
      ORDER BY sort_order ASC, slug ASC
    `;
    return rows.map((row) => ({ slug: row.slug, updatedAt: row.updated_at }));
  }

  async findRelated(
    currentId: string,
    category: string,
    limit: number = 2
  ): Promise<TWikiArticleSchemaDto[]> {
    if (!isHex24(currentId)) return [];
    const sql = getSql();
    const lim = Math.max(limit, 1);
    const rows = await sql<WikiArticleRow[]>`
      SELECT
        mongo_id,
        title,
        slug,
        description,
        category,
        color,
        summary,
        content,
        sort_order,
        created_at,
        updated_at
      FROM public.wiki_articles
      WHERE mongo_id <> ${currentId.trim().toLowerCase()}
        AND category = ${category}
      ORDER BY sort_order ASC, slug ASC
      LIMIT ${lim}
    `;
    return rows.map(rowToDto);
  }

  async findNextBySlug(slug: string): Promise<TWikiArticleSchemaDto | null> {
    const normalized = normalizeWikiSlug(slug);
    const sql = getSql();
    const rows = await sql<WikiArticleRow[]>`
      SELECT
        w.mongo_id,
        w.title,
        w.slug,
        w.description,
        w.category,
        w.color,
        w.summary,
        w.content,
        w.sort_order,
        w.created_at,
        w.updated_at
      FROM public.wiki_articles w
      WHERE (w.sort_order, w.slug) > (
        SELECT cur.sort_order, cur.slug
        FROM public.wiki_articles cur
        WHERE cur.slug = ${normalized}
        LIMIT 1
      )
      ORDER BY w.sort_order ASC, w.slug ASC
      LIMIT 1
    `;
    const row = rows[0];
    return row ? rowToDto(row) : null;
  }

  async create(dto: TWikiArticleWriteInput): Promise<TWikiArticleSchemaDto> {
    const now = new Date();
    const slug = normalizeWikiSlugStorage(dto.slug);
    const mongoId = new ObjectId().toHexString();
    const sql = getSql();
    try {
      const rows = await sql<WikiArticleRow[]>`
        INSERT INTO public.wiki_articles (
          mongo_id,
          title,
          slug,
          description,
          category,
          color,
          summary,
          content,
          sort_order,
          created_at,
          updated_at
        )
        VALUES (
          ${mongoId},
          ${dto.title},
          ${slug},
          ${dto.description},
          ${dto.category},
          ${dto.color},
          ${dto.summary},
          ${dto.content},
          ${dto.sortOrder},
          ${now},
          ${now}
        )
        RETURNING
          mongo_id,
          title,
          slug,
          description,
          category,
          color,
          summary,
          content,
          sort_order,
          created_at,
          updated_at
      `;
      const row = rows[0];
      if (!row) throw new Error("wiki_articles insert returned no row");
      return rowToDto(row);
    } catch (e: unknown) {
      if (isPgUniqueViolation(e)) {
        const err = new Error("E11000 duplicate key error") as Error & { code: number };
        err.code = 11000;
        throw err;
      }
      throw e;
    }
  }

  async upsertBySlug(
    slug: string,
    dto: TWikiArticleWriteInput
  ): Promise<TWikiArticleSchemaDto> {
    const normalized = normalizeWikiSlug(slug);
    const now = new Date();
    const payloadSlug = normalizeWikiSlugStorage(dto.slug);
    const sql = getSql();

    const updated = await sql<WikiArticleRow[]>`
      UPDATE public.wiki_articles
      SET
        title = ${dto.title},
        slug = ${payloadSlug},
        description = ${dto.description},
        category = ${dto.category},
        color = ${dto.color},
        summary = ${dto.summary},
        content = ${dto.content},
        sort_order = ${dto.sortOrder},
        updated_at = ${now}
      WHERE slug = ${normalized}
      RETURNING
        mongo_id,
        title,
        slug,
        description,
        category,
        color,
        summary,
        content,
        sort_order,
        created_at,
        updated_at
    `;
    if (updated[0]) return rowToDto(updated[0]);

    const mongoId = new ObjectId().toHexString();
    try {
      const inserted = await sql<WikiArticleRow[]>`
        INSERT INTO public.wiki_articles (
          mongo_id,
          title,
          slug,
          description,
          category,
          color,
          summary,
          content,
          sort_order,
          created_at,
          updated_at
        )
        VALUES (
          ${mongoId},
          ${dto.title},
          ${payloadSlug},
          ${dto.description},
          ${dto.category},
          ${dto.color},
          ${dto.summary},
          ${dto.content},
          ${dto.sortOrder},
          ${now},
          ${now}
        )
        RETURNING
          mongo_id,
          title,
          slug,
          description,
          category,
          color,
          summary,
          content,
          sort_order,
          created_at,
          updated_at
      `;
      const row = inserted[0];
      if (!row) throw new Error("wiki_articles insert returned no row");
      return rowToDto(row);
    } catch (e: unknown) {
      if (isPgUniqueViolation(e)) {
        const err = new Error("E11000 duplicate key error") as Error & { code: number };
        err.code = 11000;
        throw err;
      }
      throw e;
    }
  }

  async deleteBySlug(slug: string): Promise<boolean> {
    const sql = getSql();
    const result = await sql`
      DELETE FROM public.wiki_articles
      WHERE slug = ${normalizeWikiSlug(slug)}
    `;
    return result.count > 0;
  }

  async updateById(
    id: string,
    dto: Partial<TWikiArticleWriteInput>
  ): Promise<TWikiArticleSchemaDto | null> {
    if (!isHex24(id)) return null;
    const now = new Date();
    const key = id.trim().toLowerCase();
    const sql = getSql();

    const currentRows = await sql<WikiArticleRow[]>`
      SELECT
        mongo_id,
        title,
        slug,
        description,
        category,
        color,
        summary,
        content,
        sort_order,
        created_at,
        updated_at
      FROM public.wiki_articles
      WHERE mongo_id = ${key}
      LIMIT 1
    `;
    const cur = currentRows[0];
    if (!cur) return null;

    const nextSlug =
      dto.slug !== undefined ? normalizeWikiSlugStorage(dto.slug) : cur.slug;
    const nextTitle = dto.title !== undefined ? dto.title : cur.title;
    const nextDesc = dto.description !== undefined ? dto.description : cur.description;
    const nextCat = dto.category !== undefined ? dto.category : cur.category;
    const nextColor = dto.color !== undefined ? dto.color : cur.color;
    const nextSummary = dto.summary !== undefined ? dto.summary : cur.summary;
    const nextContent = dto.content !== undefined ? dto.content : cur.content;
    const nextSort =
      dto.sortOrder !== undefined ? dto.sortOrder : cur.sort_order;

    try {
      const rows = await sql<WikiArticleRow[]>`
        UPDATE public.wiki_articles
        SET
          title = ${nextTitle},
          slug = ${nextSlug},
          description = ${nextDesc},
          category = ${nextCat},
          color = ${nextColor},
          summary = ${nextSummary},
          content = ${nextContent},
          sort_order = ${nextSort},
          updated_at = ${now}
        WHERE mongo_id = ${key}
        RETURNING
          mongo_id,
          title,
          slug,
          description,
          category,
          color,
          summary,
          content,
          sort_order,
          created_at,
          updated_at
      `;
      const row = rows[0];
      return row ? rowToDto(row) : null;
    } catch (e: unknown) {
      if (isPgUniqueViolation(e)) {
        const err = new Error("E11000 duplicate key error") as Error & { code: number };
        err.code = 11000;
        throw err;
      }
      throw e;
    }
  }

  async deleteById(id: string): Promise<boolean> {
    if (!isHex24(id)) return false;
    const sql = getSql();
    const result = await sql`
      DELETE FROM public.wiki_articles
      WHERE mongo_id = ${id.trim().toLowerCase()}
    `;
    return result.count > 0;
  }
}
