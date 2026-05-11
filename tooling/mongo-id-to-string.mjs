/**
 * Stable Postgres `app_documents.mongo_id` string from a Mongo BSON `_id`.
 * ObjectId hex, or string/slug/UUID-style ids when not ObjectId.
 */
export function mongoIdToString(id) {
  if (typeof id === "string") return id;
  if (typeof id === "number" || typeof id === "bigint") return String(id);
  if (id != null && typeof id.toHexString === "function") return id.toHexString();
  if (id != null && typeof id.toString === "function") {
    const s = id.toString();
    if (s !== "[object Object]") return s;
  }
  throw new TypeError(`Unsupported Mongo _id type: ${Object.prototype.toString.call(id)}`);
}
