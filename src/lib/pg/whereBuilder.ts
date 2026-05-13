export type SqlParts = { clause: string; params: unknown[] };

const SAFE_KEY = /^[a-zA-Z0-9_.]+$/;
const HEX24 = /^[a-f0-9]{24}$/i;

/**
 * Extract a 24-char hex string from any ObjectId-like value via duck-typing.
 *
 * Turbopack/webpack can double-bundle `bson`, so the `ObjectId` constructor inside an
 * API route (or a repo) is not the same identity as the one imported here. That makes
 * `value instanceof ObjectId` silently return false → SQL fast path is skipped → the
 * caller falls back to scan-all + mingo, which also relies on `instanceof` and ends up
 * dropping every row. We avoid the trap entirely by sniffing for the shapes we know:
 * native `ObjectId` (`toHexString`), the BSON v6 marker (`_bsontype`), and EJSON (`$oid`).
 */
function objectIdLikeToHex(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") {
    return HEX24.test(value) ? value.toLowerCase() : null;
  }
  if (typeof value !== "object" || Array.isArray(value)) return null;
  const obj = value as Record<string, unknown>;
  if (typeof (obj as { toHexString?: unknown }).toHexString === "function") {
    try {
      const hex = (obj as { toHexString: () => string }).toHexString();
      if (typeof hex === "string" && HEX24.test(hex)) return hex.toLowerCase();
    } catch {
      // fall through to other shape checks
    }
  }
  if (typeof obj.$oid === "string" && HEX24.test(obj.$oid)) {
    return obj.$oid.toLowerCase();
  }
  if (obj._bsontype === "ObjectId" && obj.id) {
    const id = obj.id as Uint8Array | { toString?: (enc: string) => string };
    const buf = id instanceof Uint8Array ? Buffer.from(id) : Buffer.isBuffer(id) ? id : null;
    if (buf && buf.length === 12) return buf.toString("hex").toLowerCase();
  }
  return null;
}

/** Best-effort SQL for simple document-style filters. Returns null if not expressible safely. */
export function documentFilterToSql(
  collectionKey: string,
  filter: Record<string, unknown>
): SqlParts | null {
  if (Object.keys(filter).length === 0) {
    return { clause: `collection = $1`, params: [collectionKey] };
  }

  /**
   * `{ $or: [ { clerkUserId: "x" }, { sub: "x" } ] }` — used by `matchUsersCollectionByWebUserIds`.
   * Without SQL, PG falls back to loading the entire partition (timeouts / fragile row iteration).
   */
  if (Object.keys(filter).length === 1 && "$or" in filter) {
    const branches = (filter as { $or: unknown }).$or;
    if (!Array.isArray(branches) || branches.length === 0) {
      return { clause: `collection = $1 AND false`, params: [collectionKey] };
    }
    const orSql: string[] = [];
    const params: unknown[] = [collectionKey];
    let paramIndex = 2;
    for (const branch of branches) {
      if (!branch || typeof branch !== "object" || Array.isArray(branch)) {
        return null;
      }
      const sub = Object.entries(branch as Record<string, unknown>);
      if (sub.length !== 1) {
        return null;
      }
      const [field, val] = sub[0]!;
      if (!SAFE_KEY.test(field) || field.startsWith("$")) {
        return null;
      }
      if (typeof val === "number" || typeof val === "bigint") {
        const num = typeof val === "bigint" ? Number(val) : val;
        if (!Number.isFinite(num)) return null;
        const s = String(num);
        orSql.push(`(
        body->>'${field}' = $${paramIndex}
        OR body->'${field}'->>'$numberInt' = $${paramIndex}
        OR body->'${field}'->>'$numberLong' = $${paramIndex}
        OR body->'${field}'->>'$numberDouble' = $${paramIndex}
      )`);
        params.push(s);
        paramIndex++;
      } else if (typeof val === "boolean" && val === true) {
        orSql.push(`(
        body->>'${field}' = 'true'
        OR body->>'${field}' = '1'
        OR body->'${field}'->>'$numberInt' = '1'
        OR body->'${field}'->>'$numberLong' = '1'
      )`);
      } else if (typeof val === "boolean" && val === false) {
        orSql.push(`(
        body->>'${field}' = 'false'
        OR body->>'${field}' = '0'
        OR body->'${field}'->>'$numberInt' = '0'
        OR body->'${field}'->>'$numberLong' = '0'
      )`);
      } else if (typeof val === "string") {
        orSql.push(`body->>'${field}' = $${paramIndex}`);
        params.push(val);
        paramIndex++;
      } else {
        return null;
      }
    }
    return {
      clause: `collection = $1 AND (${orSql.join(" OR ")})`,
      params,
    };
  }

  const entries = Object.entries(filter);

  /**
   * Compound AND on multiple primitive fields (e.g. `{ userId, seasonId }` for
   * `user_league_points`). Without this, `documentFilterToSql` returned null → full
   * collection scan + mingo, which breaks league updates at scale (maxScan / timeouts).
   */
  if (entries.length > 1) {
    const parts: string[] = ["collection = $1"];
    const params: unknown[] = [collectionKey];
    let paramIndex = 2;
    let ok = true;
    for (const [k, v] of entries) {
      if (!SAFE_KEY.test(k) || k.startsWith("$")) {
        ok = false;
        break;
      }
      if (typeof v === "number" || typeof v === "bigint") {
        const num = typeof v === "bigint" ? Number(v) : v;
        if (!Number.isFinite(num)) {
          ok = false;
          break;
        }
        const s = String(num);
        parts.push(`(
        body->>'${k}' = $${paramIndex}
        OR body->'${k}'->>'$numberInt' = $${paramIndex}
        OR body->'${k}'->>'$numberLong' = $${paramIndex}
        OR body->'${k}'->>'$numberDouble' = $${paramIndex}
      )`);
        params.push(s);
      } else if (typeof v === "boolean" && v === true) {
        parts.push(`(
        body->>'${k}' = 'true'
        OR body->>'${k}' = '1'
        OR body->'${k}'->>'$numberInt' = '1'
        OR body->'${k}'->>'$numberLong' = '1'
      )`);
      } else if (typeof v === "boolean" && v === false) {
        parts.push(`(
        body->>'${k}' = 'false'
        OR body->>'${k}' = '0'
        OR body->'${k}'->>'$numberInt' = '0'
        OR body->'${k}'->>'$numberLong' = '0'
      )`);
      } else if (typeof v === "string" || typeof v === "boolean") {
        parts.push(`body->>'${k}' = $${paramIndex}`);
        params.push(String(v));
      } else {
        const hex = objectIdLikeToHex(v);
        if (hex) {
          parts.push(`(
        body->>'${k}' = $${paramIndex}
        OR body->'${k}'->>'$oid' = $${paramIndex}
      )`);
          params.push(hex);
        } else {
          ok = false;
          break;
        }
      }
      paramIndex++;
    }
    if (ok && parts.length > 1) {
      return { clause: parts.join(" AND "), params };
    }
  }

  if (entries.length !== 1) return null;

  const [k, v] = entries[0];
  if (!SAFE_KEY.test(k)) return null;

  if (k === "_id") {
    const hex = objectIdLikeToHex(v);
    if (hex) {
      return {
        clause: `collection = $1 AND mongo_id = $2`,
        params: [collectionKey, hex],
      };
    }
    if (typeof v === "string") {
      return {
        clause: `collection = $1 AND mongo_id = $2`,
        params: [collectionKey, v],
      };
    }
  }

  /** `examId` / `taskId` are often stored as ObjectId (JSONB `$oid` or 24-char string). */
  if (k === "examId" || k === "taskId") {
    const hex = objectIdLikeToHex(v);
    if (hex) {
      return {
        clause: `collection = $1 AND (
        body->>'${k}' = $2
        OR body->'${k}'->>'$oid' = $2
      )`,
        params: [collectionKey, hex],
      };
    }
  }

  if (typeof v === "number" || typeof v === "bigint") {
    const num = typeof v === "bigint" ? Number(v) : v;
    if (!Number.isFinite(num)) return null;
    const s = String(num);
    // ETL often stores integers as `{"$numberInt":"1"}` in JSONB; `body->>'partId' = '1'`
    // only matches native JSON numbers, so include BSON numeric wrappers (exam-parts, etc.).
    return {
      clause: `collection = $1 AND (
        body->>'${k}' = $2
        OR body->'${k}'->>'$numberInt' = $2
        OR body->'${k}'->>'$numberLong' = $2
        OR body->'${k}'->>'$numberDouble' = $2
      )`,
      params: [collectionKey, s],
    };
  }

  // JSONB: native boolean `true` → text 'true'; legacy BSON may use 1 / $numberInt instead.
  if (typeof v === "boolean" && v === true) {
    return {
      clause: `collection = $1 AND (
        body->>'${k}' = 'true'
        OR body->>'${k}' = '1'
        OR body->'${k}'->>'$numberInt' = '1'
        OR body->'${k}'->>'$numberLong' = '1'
      )`,
      params: [collectionKey],
    };
  }

  if (typeof v === "boolean" && v === false) {
    return {
      clause: `collection = $1 AND (
        body->>'${k}' = 'false'
        OR body->>'${k}' = '0'
        OR body->'${k}'->>'$numberInt' = '0'
        OR body->'${k}'->>'$numberLong' = '0'
      )`,
      params: [collectionKey],
    };
  }

  if (typeof v === "string" || typeof v === "boolean") {
    return {
      clause: `collection = $1 AND body->>'${k}' = $2`,
      params: [collectionKey, String(v)],
    };
  }

  if (
    k === "_id" &&
    v &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    "$in" in (v as object) &&
    Array.isArray((v as { $in: unknown[] }).$in)
  ) {
    const $in = (v as { $in: unknown[] }).$in;
    if (!$in.length) {
      return { clause: `collection = $1 AND false`, params: [collectionKey] };
    }
    const hexes: string[] = [];
    for (const item of $in) {
      const hex = objectIdLikeToHex(item);
      if (!hex) return null; // unknown shape — let caller fall back to mingo
      hexes.push(hex);
    }
    return {
      clause: `collection = $1 AND mongo_id = ANY($2::text[])`,
      params: [collectionKey, hexes],
    };
  }

  return null;
}
