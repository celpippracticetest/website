import postgres from "postgres";

type SqlClient = ReturnType<typeof postgres>;

const globalForSql = globalThis as typeof globalThis & {
  __celpipPgSql?: SqlClient;
};

function databaseUrl(): string | null {
  return process.env.DATABASE_URL?.trim() || null;
}

/** PgBouncer transaction pool mode cannot reuse server-side prepared statements. */
function shouldDisablePrepare(url: string): boolean {
  const force =
    process.env.PG_DISABLE_PREPARE === "1" ||
    process.env.PG_DISABLE_PREPARE === "true";
  if (force) return true;
  return (
    url.includes("pooler.supabase.com") ||
    url.includes(":6543") ||
    /[?&]pgbouncer=true/i.test(url)
  );
}

/**
 * Default pool size per Node process. `next build` runs many worker processes in parallel;
 * each used to default to 12, which could exhaust Supabase max_connections (~200) with other apps.
 * Prefer Supabase pooler (port 6543, `pgbouncer=true`) for serverless / many instances.
 */
function resolvedPoolMax(): number {
  const raw = process.env.PG_POOL_MAX?.trim();
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 1) return Math.min(Math.floor(n), 100);
  }
  const isNextBuild =
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.npm_lifecycle_event === "build";
  // One connection per build worker — many routes hit Postgres during SSG and
  // Supabase transaction pooler checkout times out when workers open several at once.
  return isNextBuild ? 1 : 8;
}

/** Shared postgres.js client for the app (server-only). */
export function getSql(): SqlClient {
  const url = databaseUrl();
  if (!url) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("DATABASE_URL is required in production.");
    }
    console.warn(
      "DATABASE_URL is not set. Database-backed routes will fail until it is configured."
    );
    throw new Error(
      "DATABASE_URL is not configured. Set it to your Supabase Postgres connection string."
    );
  }
  if (!globalForSql.__celpipPgSql) {
    const useSsl = !url.includes("localhost") && !url.includes("127.0.0.1");
    globalForSql.__celpipPgSql = postgres(url, {
      max: resolvedPoolMax(),
      idle_timeout: 30,
      connect_timeout: 15,
      prepare: !shouldDisablePrepare(url),
      ssl: useSsl ? "require" : false,
    });
  }
  return globalForSql.__celpipPgSql;
}

export async function closeSql(): Promise<void> {
  if (globalForSql.__celpipPgSql) {
    await globalForSql.__celpipPgSql.end({ timeout: 5 });
    delete globalForSql.__celpipPgSql;
  }
}
