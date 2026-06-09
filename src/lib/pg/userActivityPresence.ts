import "server-only";

import { ObjectId } from "bson";
import { getSql } from "./pool";

/** Upsert a session heartbeat without scanning `user_activity`. */
export async function upsertUserActivityHeartbeat(args: {
  userId: string | null;
  sessionId: string;
  userAgent: string;
  ip: string;
  now?: Date;
}): Promise<void> {
  const sql = getSql();
  const now = args.now ?? new Date();
  const sessionId = args.sessionId.trim();
  if (!sessionId) {
    throw new Error("sessionId is required for heartbeat upsert");
  }

  const mongoId = new ObjectId().toHexString();
  await sql`
    INSERT INTO public.user_activity (
      mongo_id,
      user_id,
      session_id,
      last_active_at,
      status,
      user_agent,
      ip,
      last_offline_at,
      created_at,
      updated_at
    )
    VALUES (
      ${mongoId},
      ${args.userId},
      ${sessionId},
      ${now},
      'online',
      ${args.userAgent},
      ${args.ip},
      NULL,
      ${now},
      ${now}
    )
    ON CONFLICT (session_id) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      last_active_at = EXCLUDED.last_active_at,
      status = 'online',
      user_agent = EXCLUDED.user_agent,
      ip = EXCLUDED.ip,
      updated_at = EXCLUDED.updated_at
  `;
}

/** Mark matching sessions offline without a full-table scan. */
export async function markUserActivityOffline(args: {
  userId: string | null;
  sessionId: string | null;
  now?: Date;
}): Promise<void> {
  const sql = getSql();
  const now = args.now ?? new Date();
  const sessionId = args.sessionId?.trim() ?? "";
  const userId = args.userId?.trim() ?? "";

  if (!sessionId && !userId) {
    return;
  }

  if (sessionId && userId) {
    await sql`
      UPDATE public.user_activity
      SET
        status = 'offline',
        last_offline_at = ${now},
        updated_at = ${now}
      WHERE session_id = ${sessionId} OR user_id = ${userId}
    `;
    return;
  }

  if (sessionId) {
    await sql`
      UPDATE public.user_activity
      SET
        status = 'offline',
        last_offline_at = ${now},
        updated_at = ${now}
      WHERE session_id = ${sessionId}
    `;
    return;
  }

  await sql`
    UPDATE public.user_activity
    SET
      status = 'offline',
      last_offline_at = ${now},
      updated_at = ${now}
    WHERE user_id = ${userId}
  `;
}

/** Count users active within the last five minutes. */
export async function countActiveOnlineUsers(since: Date): Promise<number> {
  const sql = getSql();
  const rows = await sql<{ c: number }[]>`
    SELECT COUNT(*)::int AS c
    FROM public.user_activity
    WHERE status = 'online'
      AND last_active_at >= ${since}
  `;
  return rows[0]?.c ?? 0;
}
