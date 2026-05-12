import { createPgDatabase } from "./pg/database";
import { getSql } from "./pg/pool";
import type { CompatMongoClient } from "./pg/types";

const globalForPg = globalThis as typeof globalThis & {
  __celpipPgClient?: CompatMongoClient;
};

/**
 * Optional namespace for `client.db()` with no argument — must match ETL keys
 * (e.g. `MONGODB_SECONDARY_DB=prod` → rows in `app_documents.collection` like `prod.tasks`).
 */
function defaultDocumentsDbName(): string | null {
  const v = process.env.APP_DOCUMENTS_DB?.trim();
  return v || null;
}

function createClient(): CompatMongoClient {
  return {
    db: (name?: string) => {
      const fallbackNs = defaultDocumentsDbName();
      const ns =
        name !== undefined && String(name).trim() !== ""
          ? String(name).trim()
          : fallbackNs;
      return createPgDatabase(getSql(), ns);
    },
  };
}

/** Same shape as the old MongoClient default export: `{ db }`. */
const client: CompatMongoClient = (globalForPg.__celpipPgClient ??=
  createClient());

export default client;

export async function getDb() {
  return client.db();
}

export const clientPromise = Promise.resolve(client);
