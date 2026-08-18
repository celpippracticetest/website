import "server-only";

import type { User as SupabaseAuthUser } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type CacheEntry<T> = { value: T; expiresAt: number };

const TTL_MS = 60_000;
const MAX_ENTRIES = 2_000;

const userByIdCache = new Map<string, CacheEntry<SupabaseAuthUser | null>>();
const resolveIdCache = new Map<string, CacheEntry<string | null>>();
/** In-flight dedupe so parallel getUserById for the same uid share one request. */
const inflightUserById = new Map<string, Promise<SupabaseAuthUser | null>>();

function prune<T>(map: Map<string, CacheEntry<T>>) {
  const now = Date.now();
  for (const [k, v] of map) {
    if (v.expiresAt <= now) map.delete(k);
  }
  if (map.size <= MAX_ENTRIES) return;
  const overflow = map.size - MAX_ENTRIES;
  let i = 0;
  for (const k of map.keys()) {
    map.delete(k);
    if (++i >= overflow) break;
  }
}

function readCache<T>(map: Map<string, CacheEntry<T>>, key: string): T | undefined {
  const hit = map.get(key);
  if (!hit) return undefined;
  if (hit.expiresAt <= Date.now()) {
    map.delete(key);
    return undefined;
  }
  return hit.value;
}

function writeCache<T>(map: Map<string, CacheEntry<T>>, key: string, value: T) {
  map.set(key, { value, expiresAt: Date.now() + TTL_MS });
  prune(map);
}

/** Cached Auth Admin `getUserById`. Dedupes concurrent calls for the same uid. */
export async function getAuthAdminUserById(
  uid: string,
): Promise<SupabaseAuthUser | null> {
  const id = uid.trim();
  if (!id) return null;

  const cached = readCache(userByIdCache, id);
  if (cached !== undefined) return cached;

  const pending = inflightUserById.get(id);
  if (pending) return pending;

  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const request = (async () => {
    try {
      const { data, error } = await admin.auth.admin.getUserById(id);
      const user = error || !data.user ? null : data.user;
      writeCache(userByIdCache, id, user);
      return user;
    } finally {
      inflightUserById.delete(id);
    }
  })();

  inflightUserById.set(id, request);
  return request;
}

export function setAuthAdminUserCache(user: SupabaseAuthUser) {
  writeCache(userByIdCache, user.id, user);
}

export function invalidateAuthAdminUserCache(uid?: string) {
  if (!uid) {
    userByIdCache.clear();
    resolveIdCache.clear();
    inflightUserById.clear();
    return;
  }
  const id = uid.trim();
  userByIdCache.delete(id);
  inflightUserById.delete(id);
  for (const [k, v] of resolveIdCache) {
    if (k === id || v.value === id) resolveIdCache.delete(k);
  }
}

/** Returns cached resolved Auth UUID, or `undefined` on miss. */
export function getCachedResolvedAuthUserId(
  stableOrAuthId: string,
): string | null | undefined {
  return readCache(resolveIdCache, stableOrAuthId.trim());
}

export function setCachedResolvedAuthUserId(
  stableOrAuthId: string,
  authUserId: string | null,
) {
  const key = stableOrAuthId.trim();
  if (!key) return;
  writeCache(resolveIdCache, key, authUserId);
  if (authUserId && authUserId !== key) {
    writeCache(resolveIdCache, authUserId, authUserId);
  }
}
