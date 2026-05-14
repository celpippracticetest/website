/**
 * Upsert MongoDB `wikiArticles` into Postgres `public.wiki_articles` (not `app_documents`).
 *
 * Env: `DATABASE_URL`, `MONGODB_URI`, optional `MONGODB_DB_NAME` / `MONGODB_DB`, `MONGODB_DNS_SERVERS`.
 *
 * Usage (from `website/`):
 *   npm run migrate:mongo:wiki -- --dry-run
 *   npm run migrate:mongo:wiki
 */

import "./bootstrap-website-env";
import type { Document } from "mongodb";
import { MongoClient, ObjectId } from "mongodb";
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
  if (typeof id === "string" && /^[a-f0-9]{24}$/i.test(id)) return id.toLowerCase();
  return null;
}

function docToWikiParams(doc: Document): {
  mongoId: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  color: string;
  summary: string;
  content: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
} | null {
  const d = mongoDriverDocToBson7(doc);
  const mongoId = mongoIdHex(d);
  if (!mongoId) return null;
  const slug = normalizeWikiSlugStorage(String(d.slug ?? ""));
  if (!slug) return null;
  const sortRaw = d.sortOrder;
  const sortOrder =
    typeof sortRaw === "number" && Number.isFinite(sortRaw)
      ? Math.trunc(sortRaw)
      : (() => {
          const n = Number(sortRaw);
          return Number.isFinite(n) ? Math.trunc(n) : 0;
        })();
  const createdAt = parseDate(d.createdAt) ?? new Date();
  const updatedAt = parseDate(d.updatedAt) ?? createdAt;
  return {
    mongoId,
    title: String(d.title ?? ""),
    slug,
    description: String(d.description ?? ""),
    category: String(d.category ?? "General"),
    color: String(d.color ?? "#3ebbf3"),
    summary: String(d.summary ?? ""),
    content: String(d.content ?? ""),
    sortOrder,
    createdAt,
    updatedAt,
  };
}

async function upsertWikiRow(
  sql: ReturnType<typeof getSql>,
  p: NonNullable<ReturnType<typeof docToWikiParams>>,
  dryRun: boolean
): Promise<"insert" | "update"> {
  if (dryRun) {
    const r = await sql<{ c: number }[]>`
      SELECT COUNT(*)::int AS c FROM public.wiki_articles WHERE mongo_id = ${p.mongoId}
    `;
    return r[0]?.c ? "update" : "insert";
  }
  const u = await sql`
    UPDATE public.wiki_articles
    SET
      title = ${p.title},
      slug = ${p.slug},
      description = ${p.description},
      category = ${p.category},
      color = ${p.color},
      summary = ${p.summary},
      content = ${p.content},
      sort_order = ${p.sortOrder},
      updated_at = ${p.updatedAt}
    WHERE mongo_id = ${p.mongoId}
  `;
  if (u.count > 0) return "update";
  await sql`
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
      ${p.mongoId},
      ${p.title},
      ${p.slug},
      ${p.description},
      ${p.category},
      ${p.color},
      ${p.summary},
      ${p.content},
      ${p.sortOrder},
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
  const coll = mdb.collection("wikiArticles");

  const sql = getSql();
  let ins = 0;
  let upd = 0;
  let skipped = 0;

  try {
    const total = await coll.estimatedDocumentCount();
    console.log(
      `wikiArticles → public.wiki_articles${dryRun ? " (dry-run)" : ""}; Mongo estimated count=${total}`
    );
    const cursor = coll.find({}, { batchSize: 50 });
    let n = 0;
    for await (const row of cursor) {
      n++;
      const p = docToWikiParams(row as Document);
      if (!p) {
        skipped++;
        continue;
      }
      try {
        const kind = await upsertWikiRow(sql, p, dryRun);
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
