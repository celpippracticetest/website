import type { PgDatabase } from "./database";
import type { PgCollection } from "./pgCollection";
import type { MongoDoc } from "./document";

/** Drop-in type for legacy `MongoClient` constructor parameters. */
export type CompatMongoClient = {
  db: (name?: string) => PgDatabase;
};

/** Drop-in type for legacy `Db` repository fields. */
export type CompatDb = PgDatabase;

/** Re-export for typing `collection()` return values. */
export type { PgCollection, MongoDoc };

/** Replaces `mongodb.Filter` for repository query objects. */
export type MongoFilter<T = Record<string, unknown>> = Record<string, unknown> & {
  _placeholder?: T;
};
