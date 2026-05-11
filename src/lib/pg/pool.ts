import postgres from "postgres";

let _sql: ReturnType<typeof postgres> | null = null;

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

/** Shared postgres.js client for the app (server-only). */
export function getSql(): ReturnType<typeof postgres> {
  const url = databaseUrl();
  if (!url) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('DATABASE_URL is required in production.');
    }
    console.warn(
      'DATABASE_URL is not set. Database-backed routes will fail until it is configured.'
    );
    throw new Error(
      'DATABASE_URL is not configured. Set it to your Supabase Postgres connection string.'
    );
  }
  if (!_sql) {
    const useSsl = !url.includes('localhost') && !url.includes('127.0.0.1');
    _sql = postgres(url, {
      max: Number(process.env.PG_POOL_MAX || 12),
      idle_timeout: 30,
      connect_timeout: 15,
      prepare: !shouldDisablePrepare(url),
      ssl: useSsl ? 'require' : false,
    });
  }
  return _sql;
}

export async function closeSql(): Promise<void> {
  if (_sql) {
    await _sql.end({ timeout: 5 });
    _sql = null;
  }
}
