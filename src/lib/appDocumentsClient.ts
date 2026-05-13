import { createPgDatabase } from "./pg/database";
import { getSql } from "./pg/pool";
import type { AppDocumentsClient } from "./pg/types";

const globalForPg = globalThis as typeof globalThis & {
  __celpipDocumentsClient?: AppDocumentsClient;
};

/**
 * Optional namespace for `client.db()` with no argument — must match ETL keys
 * (e.g. `APP_DOCUMENTS_DB=prod` → rows in `app_documents.collection` like `prod.tasks`).
 */
function defaultDocumentsDbName(): string | null {
  const v = process.env.APP_DOCUMENTS_DB?.trim();
  return v || null;
}

function createClient(): AppDocumentsClient {
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

/** Same shape as the legacy document client default export: `{ db }`. */
const client: AppDocumentsClient = (globalForPg.__celpipDocumentsClient ??=
  createClient());

export default client;

export async function getDb() {
  return client.db();
}

export const clientPromise = Promise.resolve(client);
