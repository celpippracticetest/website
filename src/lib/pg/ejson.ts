import { EJSON } from "bson";

/** Serialize a runtime document (ObjectId, Date, …) for JSONB storage. */
export function serializeDocument(doc: unknown): unknown {
  return EJSON.serialize(doc as object);
}

function normalizeJsonText(s: string): string {
  let t = s.trim().replace(/^\uFEFF/, "");
  // Some dumps / drivers wrap a JSON object literal in single quotes: '{"_id":...}'
  while (t.length >= 2 && t[0] === "'" && t[t.length - 1] === "'") {
    const inner = t.slice(1, -1).trim();
    if (!inner.startsWith("{") && !inner.startsWith("[")) break;
    t = inner;
  }
  return t;
}

function parseJsonOrEjson(text: string): unknown {
  const s = normalizeJsonText(text);
  if (s.length === 0) throw new Error("Empty document body string");

  // Double-encoded bodies arrive as a JSON string literal: "{\" _id\":…}".
  // Parse the outer string so deserializeDocument's loop can unwrap the inner object.
  if (s[0] === '"') {
    try {
      return JSON.parse(s) as unknown;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(
        `Invalid JSON string in document body (${msg}). Prefix: ${s.slice(0, 120)}…`
      );
    }
  }

  if (s[0] !== "{" && s[0] !== "[") {
    throw new Error(
      `Document body string is not JSON object or array. Prefix: ${s.slice(0, 120)}…`
    );
  }
  try {
    return JSON.parse(s) as unknown;
  } catch (e1) {
    try {
      return EJSON.parse(s, { relaxed: true }) as unknown;
    } catch (e2) {
      const m1 = e1 instanceof Error ? e1.message : String(e1);
      const m2 = e2 instanceof Error ? e2.message : String(e2);
      throw new Error(
        `Invalid JSON in document body (JSON.parse: ${m1}; EJSON.parse: ${m2}). Prefix: ${s.slice(0, 120)}…`
      );
    }
  }
}

/**
 * Restore ObjectId / Date / etc. from JSONB / plain JSON.
 * Some rows store the payload as a JSON **string** (double-encoded) or wrapped in quotes.
 */
export function deserializeDocument(value: unknown): unknown {
  let v: unknown = value;
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(v)) {
    v = v.toString("utf8");
  } else if (v instanceof Uint8Array) {
    v =
      typeof Buffer !== "undefined"
        ? Buffer.from(v).toString("utf8")
        : new TextDecoder().decode(v);
  }
  for (let depth = 0; depth < 8 && typeof v === "string"; depth++) {
    v = parseJsonOrEjson(v);
  }
  if (v === null || v === undefined) return v;
  if (typeof v !== "object") return v;
  if (Array.isArray(v)) return v;
  return EJSON.deserialize(v as object);
}
