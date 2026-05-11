import { ObjectId } from "bson";
import { deserializeDocument, serializeDocument } from "./ejson";

export type MongoDoc = Record<string, unknown> & { _id?: ObjectId | string | number };

const OID_HEX = /^[a-f0-9]{24}$/i;

/**
 * Duck-typed ObjectId hex extractor. Necessary because Turbopack/webpack can bundle
 * `bson` more than once in a Next.js build, which makes `value instanceof ObjectId`
 * fall over for an ObjectId minted by a sibling bundle. We accept anything that looks
 * like an ObjectId (instanceof, `_bsontype`, `toHexString`, raw 12-byte buffer, or the
 * EJSON `{$oid}` shape) and return its 24-char hex string.
 */
export function objectIdLikeToHex(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return OID_HEX.test(value) ? value.toLowerCase() : null;
  if (value instanceof ObjectId) return value.toHexString().toLowerCase();
  if (typeof value !== "object" || Array.isArray(value)) return null;
  const obj = value as Record<string, unknown>;
  if (typeof obj.$oid === "string" && OID_HEX.test(obj.$oid)) return obj.$oid.toLowerCase();
  if (typeof (obj as { toHexString?: unknown }).toHexString === "function") {
    try {
      const hex = (obj as { toHexString: () => string }).toHexString();
      if (typeof hex === "string" && OID_HEX.test(hex)) return hex.toLowerCase();
    } catch {
      // fall through
    }
  }
  if (obj._bsontype === "ObjectId" && obj.id) {
    const id = obj.id as Uint8Array | Buffer;
    const buf = id instanceof Uint8Array ? Buffer.from(id) : Buffer.isBuffer(id) ? id : null;
    if (buf && buf.length === 12) return buf.toString("hex").toLowerCase();
  }
  return null;
}

/** `app_documents.mongo_id` text for updates/deletes (ObjectId hex or non-OID `_id` from Mongo). */
export function documentRowKey(doc: MongoDoc): string {
  const id = doc._id;
  if (id instanceof ObjectId) return id.toHexString();
  if (typeof id === "string") return OID_HEX.test(id) ? id.toLowerCase() : id;
  if (typeof id === "number" || typeof id === "bigint") return String(id);
  throw new Error("Cannot derive Postgres mongo_id from document _id");
}

function toObjectIdIfHex(value: unknown): ObjectId | undefined {
  if (value instanceof ObjectId) return value;
  if (typeof value === "string" && OID_HEX.test(value)) return new ObjectId(value);
  return undefined;
}

/** JSONB often revives `$oid` as a plain object instead of `ObjectId`; mingo `$match` needs real `ObjectId`. */
function toObjectIdFromUnknown(value: unknown): ObjectId | undefined {
  const fromHex = toObjectIdIfHex(value);
  if (fromHex !== undefined) return fromHex;
  const hex = objectIdLikeToHex(value);
  if (hex) return new ObjectId(hex);
  return undefined;
}

function toPlainNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string" && /^-?\d+(\.\d+)?(e[+-]?\d+)?$/i.test(value.trim())) {
    return Number(value.trim());
  }
  if (!value || typeof value !== "object") return undefined;
  const o = value as Record<string, unknown>;
  if (typeof o.$numberInt === "string") return Number(o.$numberInt);
  if (typeof o.$numberLong === "string") return Number(o.$numberLong);
  if (typeof o.$numberDouble === "string") return Number(o.$numberDouble);
  if (typeof (value as { valueOf?: () => unknown }).valueOf === "function") {
    const x = (value as { valueOf: () => unknown }).valueOf();
    if (typeof x === "number" && Number.isFinite(x)) return x;
  }
  return undefined;
}

/** Zod `z.number()` expects JS numbers; JSONB often keeps `$numberInt` / BSON numeric wrappers. */
function coerceNumericDocFields(doc: Record<string, unknown>, keys: readonly string[]) {
  for (const k of keys) {
    if (!(k in doc)) continue;
    const n = toPlainNumber(doc[k]);
    if (n !== undefined && Number.isFinite(n)) doc[k] = n;
  }
}

export function rowToDocument(mongoId: string, bodyJson: unknown): MongoDoc {
  const raw = deserializeDocument(bodyJson);
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(
      `app_documents.body must deserialize to an object (mongo_id=${mongoId}, got ${raw === null ? "null" : Array.isArray(raw) ? "array" : typeof raw})`
    );
  }
  const doc = raw as MongoDoc;
  if (!(doc._id instanceof ObjectId)) {
    if (OID_HEX.test(mongoId)) {
      doc._id = new ObjectId(mongoId);
    } else if (doc._id === undefined || doc._id === null) {
      (doc as Record<string, unknown>)._id = mongoId;
    }
  }
  const taskId = toObjectIdFromUnknown(doc.taskId);
  if (taskId !== undefined) doc.taskId = taskId;

  // Do NOT touch `type` here. Each collection stores its own case (`tasks.type='practice'`,
  // `practices.type='LISTENING'`, `leagues.type='gold'`, …); blanket-uppercasing breaks both
  // mingo `$match` filters and Zod enum parsing. Repos that need case-insensitive matching
  // (e.g. `practice.repo.ts`) normalize the filter side instead.
  coerceNumericDocFields(doc as Record<string, unknown>, [
    "totalQuestion",
    "totalPassages",
    "partId",
  ]);
  return doc;
}

export function prepareInsertDocument(doc: unknown): {
  mongoId: string;
  bodySerialized: unknown;
} {
  const d = doc as MongoDoc;
  if (d._id instanceof ObjectId) {
    return { mongoId: d._id.toHexString(), bodySerialized: serializeDocument(d) };
  }
  if (typeof d._id === "string" && OID_HEX.test(d._id)) {
    const id = new ObjectId(d._id);
    d._id = id;
    return { mongoId: id.toHexString(), bodySerialized: serializeDocument(d) };
  }
  if (typeof d._id === "string" || typeof d._id === "number" || typeof d._id === "bigint") {
    const mongoId = String(d._id);
    return { mongoId, bodySerialized: serializeDocument(d) };
  }
  const id = new ObjectId();
  d._id = id;
  return { mongoId: id.toHexString(), bodySerialized: serializeDocument(d) };
}

export function prepareBodyForReplace(doc: unknown): {
  mongoId: string;
  bodySerialized: unknown;
} {
  return prepareInsertDocument(doc);
}
