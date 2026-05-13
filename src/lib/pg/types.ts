import type { PgDatabase } from "./database";
import type { PgCollection } from "./pgCollection";
import type { AppDoc } from "./document";

/** Client shape used by repositories: `client.db()` returns a document database. */
export type AppDocumentsClient = {
  db: (name?: string) => PgDatabase;
};

/** Database handle returned by `client.db()`. */
export type AppDocumentsDb = PgDatabase;

/** Re-export for typing `collection()` return values. */
export type { PgCollection, AppDoc };

/** Filter object for repository queries (document-style operators). */
export type AppDocFilter<T = Record<string, unknown>> = Record<string, unknown> & {
  _placeholder?: T;
};
