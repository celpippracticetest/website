/**
 * Upsert MongoDB `blogs` into Postgres `public.blogs` (not `app_documents`).
 *
 * Env: `DATABASE_URL`, `MONGODB_URI`, optional `MONGODB_DB_NAME` / `MONGODB_DB`, `MONGODB_DNS_SERVERS`.
 *
 * Usage (from `website/`):
 *   npm run migrate:mongo:blogs -- --dry-run
 *   npm run migrate:mongo:blogs
 */

import "./bootstrap-website-env";
import type { Document } from "mongodb";
import { MongoClient, ObjectId } from "mongodb";
import postgres from "postgres";
import { getSql, closeSql } from "@/lib/pg/pool";
import { normalizeWikiSlugStorage } from "@/lib/wiki/slug";
import {
  applyOptionalMongoDnsServers,
  isSrvDnsFailure,
  mongoDriverDocToBson7,
  printMongoSrvTroubleshooting,
} from "./mongo-pg-sync-shared";

function parseDate(v: unknown): Date | null {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v;
  if (typeof v === "string") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof v === "number" && Number.isFinite(v)) {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (v && typeof v === "object" && "$date" in (v as object)) {
    const inner = (v as { $date?: unknown }).$date;
    if (typeof inner === "string") {
      const d = new Date(inner);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    if (typeof inner === "number" && Number.isFinite(inner)) {
      const d = new Date(inner);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    if (inner instanceof Date) return inner;
    if (inner && typeof inner === "object" && "$numberLong" in (inner as object)) {
      const nl = (inner as { $numberLong?: unknown }).$numberLong;
      const ms =
        typeof nl === "string"
          ? Number(nl)
          : typeof nl === "number"
            ? nl
            : Number.NaN;
      if (Number.isFinite(ms)) {
        const d = new Date(ms);
        return Number.isNaN(d.getTime()) ? null : d;
      }
    }
  }
  return null;
}

function mongoIdHex(doc: Document): string | null {
  const id = doc._id;
  if (id instanceof ObjectId) return id.toHexString();
  // After bson@7 conversion, `_id` may not pass `instanceof` against mongodb's ObjectId.
  if (
    id &&
    typeof id === "object" &&
    typeof (id as { toHexString?: unknown }).toHexString === "function"
  ) {
    try {
      const hex = (id as { toHexString: () => string }).toHexString();
      if (/^[a-f0-9]{24}$/i.test(hex)) return hex.toLowerCase();
    } catch {
      // fall through
    }
  }
  if (typeof id === "string" && /^[a-f0-9]{24}$/i.test(id)) return id.toLowerCase();
  const asString = id != null ? String(id) : "";
  if (/^[a-f0-9]{24}$/i.test(asString)) return asString.toLowerCase();
  return null;
}

function stringArray(doc: Document, key: string): string[] {
  const v = doc[key as keyof Document];
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x).trim()).filter(Boolean);
}

type BlogUpsert = {
  mongoId: string;
  title: string;
  slug: string;
  excerpt: string;
  contentHtml: string;
  contentJson: unknown | null;
  status: "draft" | "published";
  authorName: string;
  categories: string[];
  tags: string[];
  featuredImage: unknown | null;
  faq: unknown[];
  aiSnippet: Record<string, unknown> | null;
  seo: Record<string, unknown>;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function docToBlogUpsert(doc: Document): BlogUpsert | null {
  const d = mongoDriverDocToBson7(doc);
  const mongoId = mongoIdHex(d);
  if (!mongoId) return null;
  const slug = normalizeWikiSlugStorage(String(d.slug ?? ""));
  if (!slug) return null;
  const statusRaw = String(d.status ?? "draft").toLowerCase();
  const status: "draft" | "published" = statusRaw === "published" ? "published" : "draft";
  const createdAt = parseDate(d.createdAt) ?? new Date();
  const updatedAt = parseDate(d.updatedAt) ?? createdAt;
  const publishedAt = parseDate(d.publishedAt);
  const contentJson =
    d.contentJson != null && typeof d.contentJson === "object" ? d.contentJson : null;
  const featuredImage =
    d.featuredImage != null && typeof d.featuredImage === "object" ? d.featuredImage : null;
  const faq = Array.isArray(d.faq) ? (d.faq as unknown[]) : [];
  const aiSnippet =
    d.aiSnippet != null && typeof d.aiSnippet === "object"
      ? (d.aiSnippet as Record<string, unknown>)
      : null;
  const seo =
    d.seo != null && typeof d.seo === "object" && !Array.isArray(d.seo)
      ? (d.seo as Record<string, unknown>)
      : { keywords: [] };

  return {
    mongoId,
    title: String(d.title ?? ""),
    slug,
    excerpt: String(d.excerpt ?? ""),
    contentHtml: String(d.contentHtml ?? ""),
    contentJson,
    status,
    authorName: String(d.authorName ?? "CELPIP Practice Test Team").trim() || "CELPIP Practice Test Team",
    categories: stringArray(d, "categories"),
    tags: stringArray(d, "tags"),
    featuredImage,
    faq,
    aiSnippet,
    seo,
    publishedAt: status === "published" ? publishedAt ?? updatedAt : null,
    createdAt,
    updatedAt,
  };
}

async function upsertBlogRow(
  sql: ReturnType<typeof getSql>,
  p: BlogUpsert,
  dryRun: boolean
): Promise<"insert" | "update"> {
  if (dryRun) {
    const r = await sql<{ c: number }[]>`
      SELECT COUNT(*)::int AS c FROM public.blogs WHERE mongo_id = ${p.mongoId}
    `;
    return r[0]?.c ? "update" : "insert";
  }
  const u = await sql`
    UPDATE public.blogs
    SET
      title = ${p.title},
      slug = ${p.slug},
      excerpt = ${p.excerpt},
      content_html = ${p.contentHtml},
      content_json = ${p.contentJson != null ? sql.json(p.contentJson as postgres.JSONValue) : null},
      status = ${p.status},
      author_name = ${p.authorName},
      categories = ${p.categories}::text[],
      tags = ${p.tags}::text[],
      featured_image = ${p.featuredImage != null ? sql.json(p.featuredImage as postgres.JSONValue) : null},
      faq = ${sql.json(p.faq as postgres.JSONValue)},
      ai_snippet = ${p.aiSnippet != null ? sql.json(p.aiSnippet as postgres.JSONValue) : null},
      seo = ${sql.json(p.seo as postgres.JSONValue)},
      published_at = ${p.publishedAt},
      updated_at = ${p.updatedAt}
    WHERE mongo_id = ${p.mongoId}
  `;
  if (u.count > 0) return "update";
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
      ${p.mongoId},
      ${p.title},
      ${p.slug},
      ${p.excerpt},
      ${p.contentHtml},
      ${p.contentJson != null ? sql.json(p.contentJson as postgres.JSONValue) : null},
      ${p.status},
      ${p.authorName},
      ${p.categories}::text[],
      ${p.tags}::text[],
      ${p.featuredImage != null ? sql.json(p.featuredImage as postgres.JSONValue) : null},
      ${sql.json(p.faq as postgres.JSONValue)},
      ${p.aiSnippet != null ? sql.json(p.aiSnippet as postgres.JSONValue) : null},
      ${sql.json(p.seo as postgres.JSONValue)},
      ${p.publishedAt},
      ${p.createdAt},
      ${p.updatedAt}
    )
  `;
  return "insert";
}

function parseArgs(argv: string[]) {
  let dryRun = false;
  for (const a of argv) {
    if (a === "--dry-run") dryRun = true;
  }
  return { dryRun };
}

async function main() {
  const mongoUri = process.env.MONGODB_URI?.trim();
  const { dryRun } = parseArgs(process.argv.slice(2));

  if (!mongoUri) {
    console.error("MONGODB_URI is required.");
    process.exit(1);
  }

  applyOptionalMongoDnsServers();
  const mongo = new MongoClient(mongoUri);
  try {
    await mongo.connect();
  } catch (e) {
    if (isSrvDnsFailure(e)) printMongoSrvTroubleshooting(mongoUri);
    throw e;
  }

  const dbName = process.env.MONGODB_DB_NAME?.trim() || process.env.MONGODB_DB?.trim();
  const mdb = dbName ? mongo.db(dbName) : mongo.db();
  const coll = mdb.collection("blogs");

  const sql = getSql();
  let ins = 0;
  let upd = 0;
  let skipped = 0;

  try {
    const total = await coll.estimatedDocumentCount();
    console.log(
      `blogs → public.blogs${dryRun ? " (dry-run)" : ""}; Mongo estimated count=${total}`
    );
    const cursor = coll.find({}, { batchSize: 50 });
    let n = 0;
    for await (const row of cursor) {
      n++;
      const p = docToBlogUpsert(row as Document);
      if (!p) {
        skipped++;
        continue;
      }
      try {
        const kind = await upsertBlogRow(sql, p, dryRun);
        if (kind === "insert") ins++;
        if (kind === "update") upd++;
      } catch (e) {
        skipped++;
        if (skipped <= 5) console.warn(`  [warn] skipped row ${n}:`, e);
      }
      if (n % 200 === 0) process.stdout.write(`  … ${n} documents\r`);
    }
    console.log(
      `\nDone: scanned=${n} skipped=${skipped} ${dryRun ? "would_insert" : "inserted"}=${ins} ${dryRun ? "would_update" : "updated"}=${upd}`
    );
  } finally {
    await mongo.close().catch(() => undefined);
    await closeSql();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
